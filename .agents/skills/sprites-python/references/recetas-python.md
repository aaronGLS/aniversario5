# Bibliotecas y recetas locales

Ejecuta los comandos desde la raíz del proyecto. Instala dependencias solo cuando
las necesites y, de preferencia, en un entorno virtual; después de instalarlas,
las operaciones descritas se ejecutan localmente.

## Preparación en Windows y PowerShell

Si todavía no existe un entorno adecuado, crea uno fuera de `assets/`:

```powershell
python -m venv .venv-sprites
$pythonSprites = '.\.venv-sprites\Scripts\python.exe'
& $pythonSprites -m pip install 'Pillow>=12.1,<14'
```

Pillow y la biblioteca estándar bastan para el dibujo por regiones, las curvas
calculadas con puntos de control y los retoques por píxel. Solo para trabajos
que necesiten mallas o las operaciones de esas bibliotecas, añade:

```powershell
& $pythonSprites -m pip install numpy 'scikit-image>=0.26,<0.27'
```

Para experimentos de flujo óptico, instala solo si hace falta:

```powershell
& $pythonSprites -m pip install opencv-python-headless
```

En una terminal nueva vuelve a definir `$pythonSprites` o usa directamente la
ruta al ejecutable. No es necesario instalar OpenCV para dibujar con Pillow ni
para la prueba de malla de scikit-image.

## Pillow: retocar y componer

`ImageDraw` permite elegir los píxeles de un detalle y `alpha_composite` combina
capas RGBA. Conserva el alfa y evalúa cualquier cambio en contexto; una capa
pegada sin integrar puede dejar cortes. `Image.Resampling.NEAREST` sirve para
ampliar la vista sin suavizar los píxeles. Para reducir una imagen grande,
compara métodos y corrige manualmente: la ampliación nítida y la reducción de
una imagen a pixel art son problemas distintos.

Este ejemplo retoca un píxel de la zapatilla del segundo cuadro derecho de
carrera y guarda el resultado en una carpeta temporal nueva:

```python
from pathlib import Path
from tempfile import mkdtemp
from PIL import Image, ImageDraw

fuente = Path('assets/auriana/frames/correr/derecha/frame_001.png')
with Image.open(fuente) as imagen:
    sprite = imagen.convert('RGBA')
if sprite.size != (64, 64):
    raise ValueError('El ejemplo espera un sprite de 64 × 64')

editado = sprite.copy()
ImageDraw.Draw(editado).point((24, 55), fill=(244, 231, 231, 255))
destino = Path(mkdtemp(prefix='auriana-retoque-'))
editado.save(destino / 'frame.png')
editado.resize((512, 512), Image.Resampling.NEAREST).save(destino / 'vista.png')
print(destino)
```

Las coordenadas anteriores corresponden a ese archivo concreto; no las apliques
automáticamente a otras poses. La prueba existente retoca más puntos y compara
sus cuatro cuadros con los originales:

```powershell
& $pythonSprites -B assets/auriana/experimentos/retoque_correr_derecha/crear_prueba.py
```

## Dibujo guiado por regiones

Lee [el método de dibujo](dibujo-pixel-art.md) para escoger entre una recreación
con referencia y el diseño desde cero. El caso probado está en
`assets/auriana/experimentos/redibujo_guiado_reposo_derecha/dibujar.py`:

- `dibujar(alfa)` recibe solo la silueta de la referencia y reconstruye interiores.
- Los polígonos definen regiones y `curva` rasteriza puntos de control sobre la
  cuadrícula nativa. Los parches fijan detalles; no son una reducción automática.
- `SUETER` y `ZAPATOS` muestran correcciones locales. Una comparación con
  `base_guiada.png` verifica que no cambie el resto del dibujo.
- El control automático se genera separado para la comparación. Su cercanía a
  la referencia no acredita un proceso de dibujo manual.

El script guarda dentro de su experimento y comprueba hashes de sus fuentes.
Si necesitas reproducir exactamente ese caso, desde la raíz del proyecto:

```powershell
& $pythonSprites -B assets/auriana/experimentos/redibujo_guiado_reposo_derecha/dibujar.py
```

Leerlo no requiere ejecutarlo. No uses este comando como generador genérico de
sprites ni sustituyas sus fuentes para otra pose sin adaptar dibujo y contratos.

## Scikit-image y NumPy: ajustar una pose

`PiecewiseAffineTransform` deforma una imagen según puntos de origen y destino;
`warp(..., order=0, preserve_range=True)` conserva el muestreo por píxel. Sitúa
anclas en las zonas que deben quedar quietas y mueve solo los puntos necesarios.
Una malla no inventa anatomía oculta y puede comprimir zapatos, manos o bordes.

La prueba existente genera dos transiciones a partir de cuatro poses aprobadas:

```powershell
& $pythonSprites -B assets/auriana/experimentos/investigacion_correr_derecha/scikit_image/crear_prueba.py
```

Ambos comandos de prueba sobrescriben las salidas de su propia carpeta de
experimento; revisa el destino antes de ejecutarlos. No modifican los frames de
producción. Sus resultados son ejemplos para evaluar, no mejoras garantizadas.

## OpenCV y referencias grandes

OpenCV puede calcular un campo de movimiento con `calcOpticalFlowFarneback` y
transformar imágenes con `remap`; usa interpolación `INTER_NEAREST` para mantener
la cuadrícula. El campo requiere una estrategia adicional para producir cuadros
intermedios y no resuelve por sí solo oclusiones ni cambios de anatomía. Cuando
se intercambian arrays con Pillow, comprueba el orden de canales: OpenCV suele
usar BGR/BGRA y Pillow usa RGB/RGBA.

`proper-pixel-art` es una biblioteca opcional para investigar cuadrícula y color
en imágenes de estilo pixel art de alta resolución. En una prueba del proyecto,
la detección automática produjo 67 × 69 en vez de 64 × 64 y no eliminó las
diferencias del rostro; revisa el tamaño y el diseño antes de usar su salida.

## Verificación mínima de los PNG de Auriana

El siguiente bloque solo lee archivos y comprueba dimensiones, modo y alfa:

```powershell
@'
from pathlib import Path
from PIL import Image

carpeta = Path('assets/auriana/frames/correr/derecha')
archivos = sorted(carpeta.glob('frame_*.png'))
if not archivos:
    raise FileNotFoundError(f'No hay fotogramas en {carpeta}')
for ruta in archivos:
    with Image.open(ruta) as imagen:
        if imagen.size != (64, 64) or imagen.mode != 'RGBA':
            raise ValueError(f'Dimensiones o modo incorrectos: {ruta}')
        if any(imagen.getchannel('A').histogram()[1:255]):
            raise ValueError(f'Transparencia parcial: {ruta}')
print(f'Fotogramas correctos: {len(archivos)}')
'@ | & $pythonSprites -B -
```

Además del formato, revisa visualmente todos los cuadros y la animación: una
prueba técnica no certifica que una pose sea bonita o que el movimiento sea
fluido. Si usas GIF transparente, emplea una paleta compatible y comprueba que
su alfa y duración correspondan a los PNG y al ritmo previsto.

Referencias oficiales: [Pillow](https://pillow.readthedocs.io/en/stable/),
[scikit-image: malla afín](https://scikit-image.org/docs/stable/auto_examples/transform/plot_piecewise_affine.html),
[OpenCV: flujo óptico](https://docs.opencv.org/4.x/d4/dee/tutorial_optical_flow.html)
y [proper-pixel-art](https://github.com/KennethJAllen/proper-pixel-art).
