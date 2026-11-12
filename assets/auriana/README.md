# Auriana

Este directorio conserva las animaciones anteriores y sus herramientas. Desde el
11 de noviembre de 2026, el juego usa las secuencias del ZIP aportado, en
[`../Una_adorable_chica_chibi_en/`](../Una_adorable_chica_chibi_en/README.md).
Los frames, PNG anteriores y vistas previas se conservan sin cambios; sus rutas
y duraciones originales están en [`animaciones-anteriores.json`](animaciones-anteriores.json).

El flujo de creación, retoque y revisión de sprites está definido en la skill
del proyecto [`sprites-python`](../../.agents/skills/sprites-python/SKILL.md).

Los sprites para el juego están en `frames/`. Cada imagen mide 64 × 64 píxeles
y tiene fondo transparente.

```text
assets/auriana/
├── frames/
│   ├── reposo/
│   │   ├── frente/frame_000.png
│   │   ├── derecha/frame_000.png … frame_005.png
│   │   ├── izquierda/frame_000.png … frame_005.png
│   │   └── espalda/frame_000.png
│   ├── correr/
│   │   ├── derecha/frame_000.png … frame_003.png
│   │   └── izquierda/frame_000.png … frame_003.png
│   └── saltar/
│       ├── derecha/frame_000.png … frame_003.png
│       └── izquierda/frame_000.png … frame_003.png
├── vistas_previas/
│   ├── reposo/
│   │   ├── frente/frame_000.png
│   │   ├── derecha/ (seis frames, contacto.png y animacion.gif)
│   │   ├── izquierda/ (seis frames, contacto.png y animacion.gif)
│   │   └── espalda/frame_000.png
│   ├── correr/
│   │   ├── derecha/ (cuatro frames, contacto.png y animacion.gif)
│   │   └── izquierda/ (cuatro frames, contacto.png y animacion.gif)
│   └── saltar/
│       ├── derecha/ (cuatro frames, contacto.png y animacion.gif)
│       └── izquierda/ (cuatro frames, contacto.png y animacion.gif)
├── referencias/
│   ├── perfil_derecho_alta.png
│   ├── perfil_derecho_sin_flor.png
│   ├── perfil_izquierdo_alta.png
│   ├── espalda_alta.png
│   ├── guia_correr_derecha.png
│   └── guia_saltar_derecha.png
└── scripts/
    ├── crear_frente.py
    ├── crear_derecha.py
    ├── animar_reposo_derecha.py
    ├── crear_izquierda.py
    ├── animar_reposo_izquierda.py
    ├── crear_espalda.py
    ├── animar_correr_derecha.py
    ├── animar_correr_izquierda.py
    ├── animar_saltar_derecha.py
    └── animar_saltar_izquierda.py
```

Los perfiles derecho e izquierdo de reposo tienen seis frames con respiración,
movimiento de cabello y un parpadeo. La flor aparece en el perfil izquierdo.
Ambas animaciones se reproducen en bucle de `frame_000.png` a `frame_005.png`;
las duraciones recomendadas son, respectivamente, 1300, 350, 600, 100, 110 y
700 milisegundos. Las vistas de frente y de espaldas cuentan por ahora con una
pose estática cada una.

La carrera de ambos perfiles tiene cuatro frames. La flor aparece en el perfil
izquierdo. Se reproducen en bucle desde `frame_000.png` hasta `frame_003.png`,
con una duración sugerida de 140 milisegundos por frame.

El salto de cada perfil tiene cuatro frames: preparación, impulso, vuelo y
aterrizaje. La flor aparece en el perfil izquierdo. Las vistas previas usan 120,
100, 240 y 140 milisegundos, respectivamente. En el juego se puede mantener el
frame de vuelo mientras el personaje esté en el aire y mostrar el de aterrizaje
al volver a tocar el suelo.

Para añadir una animación, crea una carpeta con su nombre dentro de `frames/`
y una subcarpeta por dirección. Numera los archivos en orden:
`frame_000.png`, `frame_001.png`, `frame_002.png`, etc. Por ejemplo, los frames
de frente para caminar pueden ir en `frames/caminar/frente/`.

Las vistas previas están ampliadas ocho veces con vecino más cercano para poder
ver los píxeles. Las imágenes en `referencias/` conservan los perfiles laterales
y la pose de espaldas transparentes en alta resolución.
`perfil_derecho_alta.png` conserva la referencia original recibida;
`perfil_derecho_sin_flor.png` es la versión corregida que utiliza el sprite.
`guia_correr_derecha.png` contiene las cuatro poses generadas con IA a partir de
la referencia de carrera; el script las adapta al tamaño y al personaje existente.
`guia_saltar_derecha.png` contiene la guía generada y refinada para el salto.

Para regenerar los cuatro frames iniciales y sus vistas previas, instala Pillow y
ejecuta desde la raíz del proyecto:

```sh
python -m pip install pillow
python assets/auriana/scripts/crear_frente.py
python assets/auriana/scripts/crear_derecha.py
python assets/auriana/scripts/crear_izquierda.py
python assets/auriana/scripts/crear_espalda.py
```

Cada script `crear_*.py` sobrescribe su correspondiente `frame_000.png` y su
vista previa. Para regenerar los otros cinco frames de reposo de ambos perfiles,
sus hojas de contacto y sus GIF animados, ejecuta después:

```sh
python assets/auriana/scripts/animar_reposo_derecha.py
python assets/auriana/scripts/animar_reposo_izquierda.py
```

Cada script de animación lee el `frame_000.png` existente y sobrescribe los
frames 001 a 005 y las vistas previas de esa dirección.

Para regenerar las dos carreras y sus vistas previas:

```sh
python assets/auriana/scripts/animar_correr_derecha.py
python assets/auriana/scripts/animar_correr_izquierda.py
```

El primer script lee el perfil derecho de reposo y la guía de carrera. El
segundo utiliza los frames derechos y el perfil izquierdo de reposo con su flor.
Cada script sobrescribe los cuatro frames y las vistas previas de su dirección.

Para regenerar los dos saltos y sus vistas previas:

```sh
python assets/auriana/scripts/animar_saltar_derecha.py
python assets/auriana/scripts/animar_saltar_izquierda.py
```

El primer script lee la guía de salto y el perfil derecho de reposo. El segundo
utiliza los frames derechos y el perfil izquierdo de reposo con su flor. Cada
script sobrescribe los cuatro frames y las vistas previas de su dirección.

## Integración anterior conservada

El runtime anterior usaba los seis frames de `reposo/derecha`, los cuatro
de `correr/derecha` y `saltar/derecha/frame_002.png`, todos derechos sin flor.
Sus PNG `auriana-idle-right.png`, `auriana-run-right.png` y `auriana-air-right.png`
siguen en `public/assets/sprites/`. Las entradas y los tiempos de esta integración
se guardan en `animaciones-anteriores.json`.

`scripts/exportar-auriana.py` empaqueta ahora las fuentes del ZIP declaradas en
`data/assets.json` en archivos nuevos `auriana-zip-*-right.png`; `--check` compara
los píxeles tras la ventana transparente fija y no escribe. No ejecutes los
generadores anteriores para recrear estos recursos importados.
