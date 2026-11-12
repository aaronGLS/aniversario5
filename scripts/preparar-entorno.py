"""Deterministic, offline atlas composition from the admitted CC0 PNGs."""
import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / 'assets/vendor/environment'
OUTPUT = ROOT / 'public/assets'


def encode_json(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def prepare():
    config = json.loads((ROOT / 'data/config.json').read_text(encoding='utf-8'))
    settings = config['environment']
    source_manifest = json.loads((VENDOR / 'sources.json').read_text(encoding='utf-8'))
    for source in source_manifest['sources']:
        data = (VENDOR / source['path']).read_bytes()
        if hashlib.sha256(data).hexdigest() != source['sha256']:
            raise ValueError('Source changed: ' + source['path'])
    frames = {}
    families = {
        'woods': ['woods/clouds.png', 'woods/mountains.png', 'woods/trees.png'],
        'tall-forest': ['tall-forest/back.png', 'tall-forest/far.png', 'tall-forest/middle.png'],
    }
    for theme in settings['themes']:
        for name, source in zip(['back', 'far', 'near'], families[theme['family']]):
            original = Image.open(VENDOR / source).convert('RGBA')
            image = Image.new('RGBA', (original.width, config['viewport']['height']))
            image.paste(original, (0, 0))
            if original.height < image.height:
                strip = original.crop((0, original.height - 1, original.width, original.height))
                image.paste(strip.resize((original.width, image.height - original.height), Image.Resampling.NEAREST), (0, original.height))
            color = tuple(bytes.fromhex(theme['tone'].lstrip('#')))
            tinted = Image.blend(image.convert('RGB'), Image.new('RGB', image.size, color), theme['mix']).convert('RGBA')
            tinted.putalpha(image.getchannel('A'))
            frames[f"{theme['id']}.{name}"] = tinted
    ground = Image.open(VENDOR / 'tall-forest/ground.png').convert('RGBA')
    tile = config['viewport']['tile']
    for index in range(9):
        x, y = (index % 3) * tile, (index // 3) * tile
        frames[f'terrain.{index}'] = ground.crop((x, y, x + tile, y + tile))
    props = Image.open(VENDOR / 'sunnyland/props.png').convert('RGBA')
    props_data = json.loads((VENDOR / 'sunnyland/props.json').read_text(encoding='utf-8'))
    for item in props_data['frames']:
        if item['filename'] in ['tree', 'bush', 'rock', 'shrooms', 'sign']:
            box = item['frame']
            frames['prop.' + item['filename']] = props.crop((box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h']))
    tileset = Image.open(VENDOR / 'sunnyland/tileset.png').convert('RGBA')
    x, y, width, height = settings['lanternCrop']
    lantern = tileset.crop((x, y, x + width, y + height))
    frames['marker.lantern.on'] = lantern
    dark = lantern.point(lambda value: round(value * settings['inactiveLampBrightness']))
    dark.putalpha(lantern.getchannel('A'))
    frames['marker.lantern.off'] = dark

    # Remove only transparent/fully occluded horizontal bands. Every cropped row
    # is invisible for ALL horizontal parallax offsets, not just the preview.
    packed_frames = dict(frames)
    source_boxes = {}
    for theme in settings['themes']:
        covered = [False] * config['viewport']['height']
        for layer in reversed(settings['backgroundLayers']):
            name = f"{theme['id']}.{layer}"
            image = frames[name]
            alpha = image.getchannel('A')
            rows = [alpha.crop((0, y, image.width, y + 1)).getextrema() for y in range(image.height)]
            visible = [y for y, (_, maximum) in enumerate(rows) if maximum > 0 and not covered[y]]
            top, bottom = min(visible), max(visible) + 1
            packed_frames[name] = image.crop((0, top, image.width, bottom))
            source_boxes[name] = (0, top, image.width, bottom - top)
            covered = [old or minimum == 255 for old, (minimum, _) in zip(covered, rows)]

    # Pixel equivalence at representative camera offsets also protects atlas
    # trim metadata and the independent 0/.10/.25 scroll of all three layers.
    for theme in settings['themes']:
        for scroll in [0, 512, 1024, 1536, 2048, 2592]:
            originals = Image.new('RGBA', (config['viewport']['width'], config['viewport']['height']))
            optimized = Image.new('RGBA', originals.size)
            for layer, factor in zip(settings['backgroundLayers'], settings['backgroundScrollFactors']):
                name = f"{theme['id']}.{layer}"
                image = frames[name]
                _, top, _, _ = source_boxes[name]
                for x in range(-int(scroll * factor) % image.width - image.width, originals.width, image.width):
                    originals.alpha_composite(image, (x, 0))
                    optimized.alpha_composite(packed_frames[name], (x, top))
            if originals.tobytes() != optimized.tobytes():
                raise ValueError('Occlusion changed visible pixels: ' + theme['id'])

    size, padding = settings['atlasSize'], settings['atlasPadding']
    atlas = Image.new('RGBA', (size, size))
    records = {}
    x = y = row_height = 0
    for name, image in sorted(packed_frames.items(), key=lambda item: (-item[1].height, -item[1].width, item[0])):
        width, height = image.size
        if x + width + padding * 2 > size:
            x, y, row_height = 0, y + row_height, 0
        if y + height + padding * 2 > size:
            raise ValueError('Atlas exceeds approved size')
        px, py = x + padding, y + padding
        # Paste by replacement to preserve the exact alpha/color of source pixels.
        atlas.paste(image, (px, py))
        atlas.paste(image.crop((0, 0, 1, height)).resize((padding, height)), (x, py))
        atlas.paste(image.crop((width - 1, 0, width, height)).resize((padding, height)), (px + width, py))
        atlas.paste(image.crop((0, 0, width, 1)).resize((width, padding)), (px, y))
        atlas.paste(image.crop((0, height - 1, width, height)).resize((width, padding)), (px, py + height))
        for corner_x, source_x in [(x, 0), (px + width, width - 1)]:
            for corner_y, source_y in [(y, 0), (py + height, height - 1)]:
                atlas.paste(image.getpixel((source_x, source_y)), (corner_x, corner_y, corner_x + padding, corner_y + padding))
        original = frames[name]
        sx, sy, sw, sh = source_boxes.get(name, (0, 0, width, height))
        records[name] = {'frame': {'x': px, 'y': py, 'w': width, 'h': height}, 'rotated': False,
                         'trimmed': original.size != image.size,
                         'spriteSourceSize': {'x': sx, 'y': sy, 'w': sw, 'h': sh},
                         'sourceSize': {'w': original.width, 'h': original.height}}
        x += width + padding * 2
        row_height = max(row_height, height + padding * 2)
    binary = io.BytesIO()
    atlas.save(binary, format='PNG', optimize=True)
    metadata = {'frames': dict(sorted(records.items())), 'meta': {'app': 'preparar-entorno.py', 'image': 'environment.png',
                 'format': 'RGBA8888', 'size': {'w': size, 'h': size}, 'scale': '1'}}
    # A small title panorama, composed entirely from the same admitted graphics.
    cover = Image.new('RGBA', (config['viewport']['width'], 144))
    for name in ['back', 'far', 'near']:
        image = frames['level-5.' + name]
        for x in range(0, cover.width, image.width):
            cover.alpha_composite(image, (x, -64))
    for x in range(0, cover.width, tile):
        cover.alpha_composite(frames['terrain.1'], (x, 128))
    for x in [52, 326]:
        image = frames['prop.tree']
        cover.alpha_composite(image, (x, 128 - image.height))
    for x, name in [(188, 'bush'), (272, 'rock'), (435, 'shrooms')]:
        image = frames['prop.' + name]
        cover.alpha_composite(image, (x, 128 - image.height))
    cover_binary = io.BytesIO()
    cover.save(cover_binary, format='PNG', optimize=True)
    fonts = ROOT / 'assets/vendor/fonts'
    font_manifest = json.loads((fonts / 'sources.json').read_text(encoding='utf-8'))
    for source in font_manifest['sources']:
        if hashlib.sha256((fonts / source['path']).read_bytes()).hexdigest() != source['sha256']:
            raise ValueError('Font source changed: ' + source['path'])
    return {'environment/environment.png': binary.getvalue(), 'environment/environment.json': encode_json(metadata),
            'environment/title-scene.png': cover_binary.getvalue(), 'fonts/pixelify-sans.ttf': (fonts / 'pixelify-sans.ttf').read_bytes(),
            'fonts/OFL.txt': (fonts / 'OFL.txt').read_bytes()}, len(records)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Compare source digests and exact atlas bytes without writing')
    args = parser.parse_args()
    outputs, count = prepare()
    if not args.check:
        OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, content in outputs.items():
        target = OUTPUT / name
        if args.check:
            if not target.exists() or target.read_bytes() != content:
                raise ValueError('Generated output differs: ' + name)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    print(json.dumps({'mode': 'check' if args.check else 'prepare', 'frames': count,
                      'pngBytes': len(outputs['environment/environment.png']), 'hashes': {name: hashlib.sha256(value).hexdigest() for name, value in outputs.items()}}))


if __name__ == '__main__':
    main()
