# Environment art — provenance and license

Art by **Luis Zuno (Ansimuz)**. License: **CC0 1.0 Universal**.

- SunnyLand: https://ansimuz.itch.io/sunny-land-pixel-game-art
- SunnyLand Woods: https://ansimuz.itch.io/sunnyland-woods
- SunnyLand Tall Forest: https://opengameart.org/content/sunnyland-tall-forest-environment
- License: https://creativecommons.org/publicdomain/zero/1.0/

The author's pages above explicitly identify these graphics as CC0. Only the
listed graphics are included. This does not grant a license to music, characters,
code or other files from the mirror projects.

`sources.json` records exact public mirror URLs, fixed revisions and SHA-256
digests verified before importing. The mirrors credit the corresponding Ansimuz
packs. Their project/code licenses are not used as the license for this art.

Original downloads remain byte-for-byte intact here. `scripts/preparar-entorno.py`
extracts terrain/props and makes five color-adjusted background sets. It extends
the last background row to the viewport height and packs an atlas with extruded
edges. Transparent or fully covered background bands are cropped with the original
logical size and offsets preserved in atlas metadata. Preparation verifies exact
visible pixel equivalence for all five themes at six camera positions each.
No character, painted replacement or generative image is included.

Reproduce downloads with `node scripts/descargar-entorno.mjs`; verify them offline
with `node scripts/descargar-entorno.mjs --check`. Prepare the atlas with the
project's Pillow environment, or add `--check` to compare without writing.
