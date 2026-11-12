#!/usr/bin/env python3
"""Pack imported character frames, removing only declared transparent margins (no resampling)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path, PurePosixPath

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_KEYS = {
    "auriana": ("auriana.idle", "auriana.run", "auriana.air"),
    "aaron": ("aaron.idle",),
}


def read_json(relative_path: str) -> dict:
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def safe_relative_path(value: str, label: str) -> Path:
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or not path.parts:
        raise ValueError(f"Ruta relativa invalida para {label}: {value}")
    return ROOT.joinpath(*path.parts)


def assert_rgba_binary_alpha(image: Image.Image, label: str) -> None:
    if image.mode != "RGBA":
        raise ValueError(f"{label} debe ser RGBA; recibio {image.mode}")
    alpha_histogram = image.getchannel("A").histogram()
    if any(alpha_histogram[1:255]):
        raise ValueError(f"{label} contiene alpha distinto de 0/255")


def load_source_frames(asset: dict) -> list[Image.Image]:
    source_paths = asset.get("sourceFrames")
    if not isinstance(source_paths, list) or len(source_paths) != expected_frame_count(asset):
        raise ValueError(f"{asset['key']} necesita una ruta fuente por frame")

    frame_width = asset.get("frameWidth", asset.get("width"))
    frame_height = asset.get("frameHeight", asset.get("height"))
    frames = []
    for source_path in source_paths:
        source_file = safe_relative_path(source_path, asset["key"])
        with Image.open(source_file) as opened:
            frame = opened.copy()
        assert_rgba_binary_alpha(frame, source_path)
        crop = asset.get("sourceCrop")
        if crop is not None:
            if len(crop) != 4 or any(not isinstance(value, int) or value < 0 for value in crop):
                raise ValueError(f"sourceCrop invalido para {asset['key']}")
            left, top, width, height = crop
            if (width, height) != (frame_width, frame_height):
                raise ValueError(f"sourceCrop debe medir {frame_width}x{frame_height}")
            bounds = frame.getchannel("A").getbbox()
            if not bounds or bounds[0] < left or bounds[1] < top or bounds[2] > left + width or bounds[3] > top + height:
                raise ValueError(f"sourceCrop recorta pixeles visibles de {source_path}")
            frame = frame.crop((left, top, left + width, top + height))
        if frame.size != (frame_width, frame_height):
            raise ValueError(f"{source_path} mide {frame.width}x{frame.height}, se esperaba {frame_width}x{frame_height}")
        frames.append(frame)
    return frames


def expected_frame_count(asset: dict) -> int:
    return asset["frames"] if asset["type"] == "spritesheet" else 1


def output_path(manifest: dict, asset: dict) -> Path:
    runtime_base = safe_relative_path(manifest["runtimeBase"], "runtimeBase")
    relative_asset = safe_relative_path(asset["path"], asset["key"])
    return ROOT / "public" / runtime_base.relative_to(ROOT) / relative_asset.relative_to(ROOT)


def verify_asset(manifest: dict, asset: dict, source_frames: list[Image.Image]) -> None:
    target = output_path(manifest, asset)
    if not target.is_file():
        raise ValueError(f"No existe el PNG exportado: {target.relative_to(ROOT)}")

    expected_size = (
        (asset["sheetWidth"], asset["sheetHeight"])
        if asset["type"] == "spritesheet"
        else (asset["width"], asset["height"])
    )
    with Image.open(target) as opened:
        exported = opened.copy()
    assert_rgba_binary_alpha(exported, asset["key"])
    if exported.size != expected_size:
        raise ValueError(f"{asset['key']} mide {exported.width}x{exported.height}, se esperaba {expected_size[0]}x{expected_size[1]}")

    frame_width = asset.get("frameWidth", asset.get("width"))
    frame_height = asset.get("frameHeight", asset.get("height"))
    for index, source_frame in enumerate(source_frames):
        if asset["type"] == "spritesheet":
            exported_frame = exported.crop((index * frame_width, 0, (index + 1) * frame_width, frame_height))
        else:
            exported_frame = exported
        if exported_frame.tobytes() != source_frame.tobytes():
            raise ValueError(f"Los pixeles exportados no coinciden con {asset['sourceFrames'][index]}")


def export_asset(manifest: dict, asset: dict, source_frames: list[Image.Image]) -> None:
    target = output_path(manifest, asset)
    target.parent.mkdir(parents=True, exist_ok=True)
    if asset["type"] == "spritesheet":
        frame_width = asset["frameWidth"]
        frame_height = asset["frameHeight"]
        exported = Image.new("RGBA", (asset["sheetWidth"], asset["sheetHeight"]), (0, 0, 0, 0))
        for index, frame in enumerate(source_frames):
            exported.paste(frame, (index * frame_width, 0))
    else:
        exported = source_frames[0].copy()
    exported.save(target, format="PNG", optimize=False)


def run(check_only: bool, character: str) -> None:
    manifest = read_json("data/assets.json")
    config = read_json("data/config.json")
    expected_keys = EXPECTED_KEYS[character]
    character_assets = [asset for asset in manifest["assets"] if asset["key"] in expected_keys]
    if tuple(asset["key"] for asset in character_assets) != expected_keys:
        raise ValueError(f"El manifest debe incluir {', '.join(expected_keys)} en ese orden")

    animation_counts = {
        "auriana.idle": config["animation"]["idleFrames"],
        "auriana.run": config["animation"]["runFrames"],
        "auriana.air": config["animation"]["airFrames"],
        "aaron.idle": config["aaron"]["idleFrames"],
    }
    for asset in character_assets:
        if not asset["ready"] or asset["status"] not in ("integrated-existing", "integrated-imported"):
            raise ValueError(f"{asset['key']} no esta marcado como integrado")
        if expected_frame_count(asset) != animation_counts[asset["key"]]:
            raise ValueError(f"El conteo de {asset['key']} no coincide con data/config.json")
        source_frames = load_source_frames(asset)
        if check_only:
            verify_asset(manifest, asset, source_frames)
        else:
            export_asset(manifest, asset, source_frames)
            verify_asset(manifest, asset, source_frames)
        print(f"{'OK' if check_only else 'Exportado y verificado'}: {asset['key']} ({len(source_frames)} frame(s))")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verifica los PNG sin escribir archivos")
    parser.add_argument("--character", choices=tuple(EXPECTED_KEYS), default="auriana", help="personaje que se exporta o verifica (por defecto auriana)")
    args = parser.parse_args()
    try:
        run(args.check, args.character)
    except (OSError, KeyError, TypeError, ValueError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
