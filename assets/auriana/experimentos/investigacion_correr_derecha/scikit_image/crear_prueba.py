"""Prueba una malla de control sobre las poses de carrera de Auriana.

Requiere Pillow, NumPy y scikit-image. No modifica los sprites aprobados.
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image
from skimage.transform import PiecewiseAffineTransform, warp


CARPETA = Path(__file__).resolve().parent
sys.path.insert(0, str(CARPETA.parent))
import crear_prueba as soporte  # noqa: E402


def transicion_piernas(frame: Image.Image, distancia: float = 3.0) -> Image.Image:
    """Mueve una malla bajo la cintura, dejando fijos la cabeza y el cuello."""
    columnas = (0, 13, 19, 24, 28, 32, 36, 40, 45, 51, 63)
    filas = (0, 16, 32, 45, 48, 51, 54, 58, 61, 63)
    origen = np.array([(x, y) for y in filas for x in columnas], dtype=float)
    destino = origen.copy()
    for indice, (x, y) in enumerate(origen):
        altura = np.interp(y, (0, 48, 51, 54, 61, 63), (0, 0, 0.45, 1, 1, 0))
        if x < 32:
            influencia = np.interp(x, (0, 13, 19, 28, 32), (0, 0, 1, 1, 0))
            direccion = 1
        else:
            influencia = np.interp(x, (32, 36, 40, 51, 63), (0, 0, 1, 1, 0))
            direccion = -1
        destino[indice, 0] += distancia * altura * influencia * direccion

    transformacion = PiecewiseAffineTransform.from_estimate(origen, destino)
    resultado = warp(np.asarray(frame), inverse_map=transformacion.inverse,
                     output_shape=(64, 64), order=0, mode="constant", cval=0,
                     preserve_range=True)
    return Image.fromarray(np.asarray(resultado, dtype=np.uint8), "RGBA")


def main() -> None:
    originales = soporte.cargar_carrera()
    frames = [
        originales[0].copy(), transicion_piernas(originales[0]),
        originales[1].copy(), originales[2].copy(),
        transicion_piernas(originales[2]), originales[3].copy(),
    ]
    carpeta_frames = CARPETA / "frames"
    carpeta_previas = CARPETA / "vistas_previas"
    carpeta_frames.mkdir(parents=True, exist_ok=True)
    carpeta_previas.mkdir(parents=True, exist_ok=True)
    for indice, frame in enumerate(frames):
        frame.save(carpeta_frames / f"frame_{indice:03}.png", optimize=True)
    soporte.guardar_contacto(frames, carpeta_previas / "contacto.png")
    soporte.guardar_animacion(frames, carpeta_previas / "animacion.gif")
    soporte.guardar_comparacion(originales, frames,
                                carpeta_previas / "comparacion.gif")
    print(f"Prueba de scikit-image: {CARPETA}")


if __name__ == "__main__":
    main()
