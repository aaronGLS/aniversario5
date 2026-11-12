#!/usr/bin/env node
/** Static contract checks. Does not run Phaser or claim a playable build. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = process.argv.includes('--release');
const failures = [];
const warnings = [];
let checks = 0;
const assert = (condition, label) => { checks++; if (!condition) failures.push(label); };
function json(name) {
  try { return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')); }
  catch (error) { throw new Error(`No se pudo leer ${name}: ${error.message}`); }
}
function pngInfo(file) {
  const b = fs.readFileSync(file);
  if (b.length < 33 || b.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`PNG no valido: ${file}`);
  }
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), depth: b[24], type: b[25] };
}
function luminance(hex) {
  const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
const requiredDocs = [
  'AGENTS.md', 'README.md', 'PROMPT_CODEX.md', 'ESPECIFICACION.md',
  'docs/01_ARQUITECTURA.md', 'docs/02_NIVELES.md', 'docs/03_ARTE_Y_ANIMACIONES.md',
  'docs/04_UI_Y_TEXTOS.md', 'docs/05_AUDIO.md', 'docs/06_PLAN_Y_PRUEBAS.md',
  'docs/07_ENTREGA_Y_FUENTES.md', 'docs/ESTADO.md', 'referencias/README.md'
];
for (const f of requiredDocs) assert(fs.existsSync(path.join(root, f)), `Falta documento: ${f}`);
let c, levels, texts, assets, refs;
try {
  c = json('data/config.json'); levels = json('data/levels.json');
  texts = json('data/texts.es.json'); assets = json('data/assets.json'); refs = json('data/reference-audit.json');
} catch (error) { console.error(error.message); process.exit(1); }
assert(c.schemaVersion === 1, 'Schema de config');
assert(c.stack.phaser === '3.90.0', 'Rama de Phaser cerrada');
assert(c.stack.renderer === 'CANVAS', 'Canvas 2D fijado tras la comparacion de rendimiento');
assert(c.viewport.width === 480 && c.viewport.height === 270, 'Viewport 480x270');
assert(c.player.flower === false, 'Auriana sin flor');
assert(c.animation.idleFrames === 4 && c.animation.idleDurationsMs.length === c.animation.idleFrames && c.animation.idleDurationsMs.every(ms => Number.isFinite(ms) && ms > 0), 'Reposo importado de cuatro frames');
assert(c.animation.runFrames === 8 && c.animation.runFrameMs > 0, 'Carrera importada de ocho frames');
assert(c.animation.airFrames === 9 && c.animation.airFrameMs > 0 && c.animation.mirrorLeft === true, 'Salto importado de nueve frames y espejo izquierdo sin flor');
assert(c.player.bodyOffsetY + c.player.bodyHeight === c.player.anchorY, 'Cuerpo alineado con ancla vertical');
assert(c.player.bodyOffsetX + c.player.bodyWidth / 2 === c.player.anchorX, 'Cuerpo centrado en ancla horizontal');
assert(c.player.originY * c.player.frameHeight === c.player.anchorY, 'Origen normalizado correcto');
assert(c.physics.worldBottomCollision === false, 'Sin pared inferior que impida respawn');
assert(c.physics.coyoteMs > 0 && c.physics.jumpBufferMs > 0, 'Ayudas de salto activas');
assert(Array.isArray(levels) && levels.length === 5, 'Cinco niveles');
const requiredAssetKeys = ['auriana.idle', 'auriana.run', 'auriana.air', 'aaron.idle', 'music.main', 'environment.main', 'environment.title', 'font.ui'];
assert(requiredAssetKeys.every(key => assets.assets.some(asset => asset.key === key)), 'Recursos de personajes, audio, entorno y tipografia definidos');
assert(!assets.assets.some(asset => asset.key === 'couple.hug'), 'El encuentro reutiliza ambos personajes, sin PNG de abrazo');
assert(assets.generatedAtRuntime.includes('ending-halo') && assets.generatedAtRuntime.includes('heart-8'), 'Halo y corazon se generan una sola vez en runtime');
assert(new Set(assets.assets.map(a => a.key)).size === assets.assets.length, 'Claves de assets unicas');
const aurianaAssets = assets.assets.filter(a => a.key.startsWith('auriana.'));
const aurianaFrameCounts = { 'auriana.idle': c.animation.idleFrames, 'auriana.run': c.animation.runFrames, 'auriana.air': c.animation.airFrames };
assert(aurianaAssets.length === 3, 'Tres recursos de Auriana integrados');
const aaronAsset = assets.assets.find(asset => asset.key === 'aaron.idle');
assert(aaronAsset?.type === 'spritesheet' && aaronAsset.frames === c.aaron.idleFrames, 'Reposo animado de Aaron coincide con config');
assert(Number.isFinite(c.aaron.idleFrameMs) && c.aaron.idleFrameMs > 0, 'Tiempo por frame de Aaron positivo');
for (const asset of [...aurianaAssets, aaronAsset]) {
  const frameCount = asset.type === 'spritesheet' ? asset.frames : 1;
  assert(asset.ready === true && asset.status === 'integrated-imported', `Integrado desde ZIP: ${asset.key}`);
  assert(frameCount === (asset.key === 'aaron.idle' ? c.aaron.idleFrames : aurianaFrameCounts[asset.key]), `Frames de config y manifest: ${asset.key}`);
  assert(Array.isArray(asset.sourceFrames) && asset.sourceFrames.length === frameCount, `Fuentes declaradas: ${asset.key}`);
  for (const source of asset.sourceFrames ?? []) {
    const sourcePath = path.join(root, source);
    assert(!path.isAbsolute(source) && !source.split(/[\\/]/).includes('..'), `Ruta fuente relativa: ${asset.key}`);
    assert(fs.existsSync(sourcePath), `Frame fuente existe: ${source}`);
  }
}
assert(texts.levelNames.length === 5, 'Cinco nombres en textos');
assert(texts.endingTitle === 'Feliz quinto mesiversario, mi vida. Espero y sigamos cumpliendo más.', 'Dedicatoria aprobada por el usuario');
assert(!/\b202[0-9]\b/.test(JSON.stringify(texts)), 'Sin fecha inventada en textos');

const J = -c.physics.jumpVelocity, g = c.physics.gravity, v = c.physics.speed;
const jumpCases = [];
function flightTo(a, b, direction) {
  const A = direction === 1 ? { lo: a.x, hi: a.x + a.width } : { lo: -(a.x + a.width), hi: -a.x };
  const B = direction === 1 ? { lo: b.x, hi: b.x + b.width } : { lo: -(b.x + b.width), hi: -b.x };
  const dy = b.y - a.y;
  const disc = J * J + 2 * g * dy;
  if (disc < 0) return { count: 0, distance: 0, min: null, max: null };
  const time = (J + Math.sqrt(disc)) / g;
  const distance = v * time;
  const valid = [];
  // Conservative point-foot ballistic envelope, with body/landing margins.
  // It is intentionally NOT a substitute for Phaser collision/play testing.
  for (let x = Math.ceil(A.lo + 14); x <= A.hi - 14; x++) {
    const landing = x + distance;
    if (landing < B.lo + 14 || landing > B.hi - 14) continue;
    const contactTime = (B.lo - c.player.bodyWidth / 2 - x) / v;
    if (contactTime < 0) continue;
    const feetAtEdge = a.y - J * contactTime + g * contactTime * contactTime / 2;
    if (feetAtEdge > b.y + 0.01) continue;
    valid.push(x);
  }
  return { count: valid.length, distance, min: valid[0] ?? null, max: valid.at(-1) ?? null };
}
let totalTravel = 0;
for (const [i, l] of levels.entries()) {
  assert(l.id === i + 1, `ID consecutivo nivel ${i + 1}`);
  assert(l.width === 3072 && l.height === 400, `Limites nivel ${l.id}`);
  assert(l.name === texts.levelNames[i], `Texto nivel ${l.id}`);
  assert(l.surfaces.length <= 9, `Maximo nueve superficies nivel ${l.id}`);
  assert(new Set(l.surfaces.map(s => s.id)).size === l.surfaces.length, `IDs de superficies nivel ${l.id}`);
  for (const s of l.surfaces) {
    assert(['x', 'y', 'width', 'height'].every(k => Number.isFinite(s[k]) && Number.isInteger(s[k])), `Enteros: ${s.id}`);
    assert(s.width >= 128 && s.height > 0 && s.x >= 0 && s.x + s.width <= l.width, `Dimensiones: ${s.id}`);
    assert(s.y + s.height === 400, `Profundidad solida: ${s.id}`);
    assert(s.y >= 192 && s.y <= 224, `Altura visible: ${s.id}`);
  }
  for (const [label, point] of [['spawn', l.spawn], ['checkpoint', l.checkpoint], ['goal', l.goal]]) {
    const s = l.surfaces.find(x => x.id === point.supportId);
    assert(Boolean(s), `${label}: soporte nivel ${l.id}`);
    if (!s) continue;
    assert(point.feetY === s.y, `${label}: pies sobre plataforma nivel ${l.id}`);
    assert(point.x - s.x >= 32 && s.x + s.width - point.x >= 32, `${label}: margen de 32 nivel ${l.id}`);
  }
  assert(l.checkpoint.x > l.spawn.x && l.goal.x > l.checkpoint.x, `Orden spawn-cp-meta nivel ${l.id}`);
  assert(l.goal.kind === (l.id === 5 ? 'ending' : 'next'), `Tipo de meta nivel ${l.id}`);
  assert((l.id === 5) === Boolean(l.aaron), `Aparicion de Aaron nivel ${l.id}`);
  for (let j = 1; j < l.surfaces.length; j++) {
    const a = l.surfaces[j - 1], b = l.surfaces[j];
    const gap = b.x - (a.x + a.width);
    assert(gap >= 0 && gap <= 40, `Hueco <=40: ${a.id} -> ${b.id}`);
    assert(Math.abs(b.y - a.y) <= 16, `Desnivel <=16: ${a.id} -> ${b.id}`);
    for (const direction of [1, -1]) {
      const from = direction === 1 ? a : b, to = direction === 1 ? b : a;
      const f = flightTo(from, to, direction);
      assert(f.count >= 5, `Ventana ideal >=5 px: ${from.id} -> ${to.id}`);
      jumpCases.push({ from: from.id, to: to.id, direction, gap, rise: from.y - to.y, ...f });
    }
  }
  totalTravel += l.goal.x - l.spawn.x;
}
for (const r of refs) {
  const p = path.join(root, r.file);
  assert(fs.existsSync(p), `Referencia existe: ${r.file}`);
  if (!fs.existsSync(p)) continue;
  const info = pngInfo(p);
  assert(info.width === r.dimensions[0] && info.height === r.dimensions[1], `Medidas referencia: ${r.file}`);
  assert(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') === r.sha256, `Referencia intacta: ${r.file}`);
  assert(r.productionReady === false, `Referencia no marcada como asset: ${r.file}`);
}
const contrastPairs = [
  ['Texto/panel', c.palette.text, c.palette.panel],
  ['Secundario/panel', c.palette.secondary, c.palette.panel],
  ['Boton', c.palette.accentText, c.palette.accent],
  ['Texto/pagina', c.palette.text, c.palette.page]
].map(([name, a, b]) => ({ name, ratio: contrast(a, b) }));
for (const p of contrastPairs) assert(p.ratio >= 4.5, `Contraste numerico >=4.5: ${p.name}`);

let productionFiles = 0;
for (const a of assets.assets) {
  assert(!a.path.startsWith('/') && !a.path.includes('..'), `Ruta relativa segura: ${a.key}`);
  if (a.type === 'spritesheet') {
    assert(a.sheetWidth === a.frames * a.frameWidth && a.sheetHeight === a.frameHeight, `Medidas de tira: ${a.key}`);
  }
  const p = path.join(root, 'public', assets.runtimeBase, a.path);
  const exists = fs.existsSync(p);
  if (exists) productionFiles++;
  if (!exists || !a.ready) {
    const message = `Pendiente de produccion/revision: ${a.key} (${a.path})`;
    if (release && a.requiredForRelease) assert(false, message); else warnings.push(message);
    continue;
  }
  if (a.type === 'font') {
    const bytes = fs.readFileSync(p);
    assert(bytes.length > 1024 && bytes.length <= a.maxBytes && bytes.readUInt32BE(0) === 0x00010000, `Fuente TrueType local: ${a.key}`);
    assert(fs.existsSync(path.join(path.dirname(p), 'OFL.txt')), `Licencia de fuente distribuida: ${a.key}`);
  } else if (a.type !== 'audio') {
    try {
      const info = pngInfo(p);
      assert(info.width === (a.sheetWidth ?? a.width), `Ancho PNG: ${a.key}`);
      assert(info.height === (a.sheetHeight ?? a.height), `Alto PNG: ${a.key}`);
      assert(info.depth === 8 && info.type === 6, `PNG RGBA 8-bit: ${a.key}`);
      if (a.type === 'atlas') {
        const atlas = JSON.parse(fs.readFileSync(path.join(root, 'public', assets.runtimeBase, a.dataPath), 'utf8'));
        assert(Object.keys(atlas.frames).length === 31, '31 frames graficos disponibles');
        assert(fs.statSync(p).size <= c.environment.maxPngBytes, 'Atlas de entorno dentro del presupuesto');
        for (const [name, { frame }] of Object.entries(atlas.frames)) {
          assert(frame.x >= 0 && frame.y >= 0 && frame.w > 0 && frame.h > 0 && frame.x + frame.w <= info.width && frame.y + frame.h <= info.height, `Recorte dentro del atlas: ${name}`);
        }
      }
    } catch (error) { assert(false, error.message); }
  } else {
    assert(fs.statSync(p).size > 1024 && fs.statSync(p).size <= a.maxBytes, `Peso audio: ${a.key}`);
  }
}
const report = {
  type: 'static-design-validation-not-gameplay', mode: release ? 'release-assets' : 'design',
  node: process.version, checks, failures, warnings, productionFiles,
  physics: { idealMaxHeight: J * J / (2 * g), idealSameHeightRange: v * 2 * J / g,
    idealSameHeightTime: 2 * J / g, totalSpawnGoalDistance: totalTravel,
    idealHorizontalTravelSeconds: totalTravel / v },
  jumpCases, contrastPairs,
  notTested: ['Phaser runtime', 'browser gameplay', 'touch on device', 'audio listening', 'visual identity of final assets']
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = failures.length ? 1 : 0;
