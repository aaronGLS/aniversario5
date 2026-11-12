# Redibujo guiado de Auriana de pie

Resultado visual aceptado por el usuario en la conversación, después de retocar
exclusivamente el suéter y los zapatos. No integrado en los recursos del juego.

## Qué se reutilizó y qué se dibujó

- Se reutilizó el alfa del frame de reposo derecho: fija la silueta exterior,
  los huecos del cabello, la altura y el encuadre. Esa parte es un calco.
- El interior se dibujó con polígonos, curvas Bézier cúbicas rasterizadas en
  coordenadas enteras y parches de píxeles. Las posiciones y colores se eligieron
  expresamente, mirando la referencia alineada. El renderizador `dibujar(alfa)`
  no recibe los colores RGB de la imagen original.
- Se usaron colores presentes en el frontal; el PNG resultante tiene 23 colores
  contando la transparencia. No se convirtió una ilustración grande al tamaño final.
- El dibujo se hace directamente en 64×64. Las curvas y los rellenos automatizan
  la colocación de muchos píxeles; no se dibujaron 4096 puntos independientes.
- Se produjo una cuantización automática sin dithering solo como control,
  identificada como tal en `control.png`. No es el PNG entregado.

La implementación usa Pillow y la biblioteca estándar de Python. Las curvas
se calculan con sus puntos de control; no se instalaron NumPy ni scikit-image.
No se usaron servicios de generación.

## Resultado de la comparación

| Medida frente al reposo lateral | Intento anterior | Redibujo guiado final |
|---|---:|---:|
| Intersección/unión de siluetas | 92,866 % | 100 % |
| Píxeles de silueta diferentes | 113 | 0 |
| Desplazamiento del centro de la mano | 1,216 px | 0 px |
| Desplazamiento del centro del suéter | 0,948 px | 0,047 px |

El 100 % de silueta se obtiene por construcción, al reutilizar el alfa: no es
una prueba de habilidad artística. Los centros se estiman con el mismo criterio
de color y región para las imágenes comparadas; dependen también del sombreado.
Las mediciones completas, incluidos los resultados del control automático,
están en `mediciones.json`. Algunos centros del control quedan más próximos a
la fuente; no se afirma que el dibujo manual gane a la conversión en toda medida.

La comparación visual sí tuvo una respuesta positiva del usuario. La primera
versión guiada queda en `base_guiada.png`. La revisión posterior cambia 124
píxeles, todos dentro de las regiones del suéter y los zapatos. La cabeza, la cara,
el pantalón y la mano permanecen idénticos a esa base. No hay cambios fuera de
esas dos regiones. `detalles.png` permite comparar las dos correcciones de cerca.

## Verificación ejecutada

Desde la raíz del proyecto:

```powershell
& '.venv-sprites/Scripts/python.exe' -B 'assets/auriana/experimentos/redibujo_guiado_reposo_derecha/dibujar.py'
```

La ejecución final terminó con código 0. Valida PNG 64×64 RGBA, alfa 0/255,
equivalencia del alfa con la referencia, paleta del frontal, ampliación exacta
con vecino más cercano, límites del retoque y SHA-256 de 36 archivos protegidos.
Se verifican hashes antes y después de dibujar. El resumen de la ejecución está
en `ultima_ejecucion.log`.

Durante el desarrollo se completó una entrada de paleta faltante y se corrigió
un error al reescribir una comparación PNG. La exportación actual genera el PNG
en memoria, omite escrituras idénticas y reemplaza el archivo mediante un temporal
en la misma carpeta. La ejecución final de todas las salidas pasa.

Se inspeccionaron el PNG nativo, la ampliación 8× sobre transparencia, las
comparaciones sobre damero claro y los recortes de suéter/zapatos. No se probaron
animaciones ni navegador: este cambio produce un fotograma estático separado.

## Archivos

- `frame_000.png`: resultado nativo 64×64 con transparencia.
- `vista_8x.png`: ampliación 512×512 para inspección.
- `comparacion.png`: referencia, intento rechazado y resultado actual.
- `control.png`: conversión automática, resultado actual y frontal de estilo.
- `guia.png`: cuadrícula y posiciones de referencia.
- `detalles.png`: suéter y zapatos antes/después del retoque.
- `dibujar.py`: regiones, puntos de control, parches y comprobaciones.

La técnica de regiones, curvas y retoques también permite crear dibujos desde
cero. El calco de silueta y las posiciones de referencia usados aquí no existen
sin un diseño previo: este ensayo no demuestra la misma calidad sin referencia.
