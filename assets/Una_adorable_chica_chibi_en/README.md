# Animaciones importadas

Extraído de `../Una_adorable_chica_chibi_en.zip` por petición del usuario el
11 de noviembre de 2026. Los 67 archivos del paquete se conservan sin modificaciones.

El juego usa Breathing_Idle/east (4 cuadros), Running/east (8) y
Bend_knees_slightly_to_prepare_for_a_jump_then_pus/east (9). La izquierda es un
reflejo del perfil derecho sin flor; las variantes west y rotaciones se archivan.

`data/assets.json` declara las rutas fuente, ventanas transparentes y PNG nuevos
`public/assets/sprites/auriana-zip-*-right.png`. El empaquetado no escala ni redibuja.
Las duraciones están en `data/config.json` porque el ZIP no las especifica.

Reproducir desde la raíz: `python scripts/exportar-auriana.py`.
Verificar sin escribir: `python scripts/exportar-auriana.py --check`.

Las animaciones anteriores siguen en `assets/auriana/frames/` y en sus tres PNG
públicos originales. `assets/auriana/animaciones-anteriores.json` conserva sus
entradas del manifest y su configuración para restaurarlas. No se borran ni se
sobrescriben sus imágenes.
