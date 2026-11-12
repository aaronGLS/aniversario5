"""Genera el salto izquierdo de Auriana conservando la flor.

Refleja las poses del salto derecho y utiliza la cabeza, el cuello y el cabello
del perfil izquierdo de reposo. Requiere Pillow. Ejecutar desde el proyecto:
    python assets/auriana/scripts/animar_saltar_izquierda.py
"""

from pathlib import Path

from PIL import Image

from animar_saltar_derecha import (
    ALTURAS_CABEZA,
    ESCALA_PREVIA,
    NUM_FRAMES,
    TAMANO,
    guardar_contacto,
    guardar_gif,
)


def crear_frames(derecha: list[Image.Image], reposo: Image.Image) -> list[Image.Image]:
    """Conserva la flor y el contorno original en cada pose del salto."""
    if len(derecha) != NUM_FRAMES:
        raise ValueError(f"El salto derecho debe tener {NUM_FRAMES} frames.")
    if reposo.size != (TAMANO, TAMANO) or any(
        frame.size != (TAMANO, TAMANO) for frame in derecha
    ):
        raise ValueError("Todos los frames deben medir 64 × 64 píxeles.")
    if any(set(frame.getchannel("A").getdata()) - {0, 255}
           for frame in [reposo, *derecha]):
        raise ValueError("Los frames deben usar transparencia binaria.")

    frames = []
    for original, altura in zip(derecha, ALTURAS_CABEZA):
        frame = original.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        # La cabeza incluye la flor y se desplaza con el cuerpo en cada fase.
        # También se conserva el cuello completo para no duplicar la barbilla.
        frame.paste(reposo.crop((0, 0, TAMANO, 35)), (0, altura))
        frame.paste(reposo.crop((36, 35, TAMANO, 49)), (36, 35 + altura))
        frame.paste(reposo.crop((15, 35, 24, 41)), (15, 35 + altura))
        frames.append(frame)
    return frames


def main() -> None:
    carpeta = Path(__file__).resolve().parent.parent
    with Image.open(carpeta / "frames/reposo/izquierda/frame_000.png") as archivo:
        reposo = archivo.convert("RGBA")
    derecha = []
    for indice in range(NUM_FRAMES):
        ruta = carpeta / "frames/saltar/derecha" / f"frame_{indice:03}.png"
        with Image.open(ruta) as archivo:
            derecha.append(archivo.convert("RGBA"))
    frames = crear_frames(derecha, reposo)

    carpeta_frames = carpeta / "frames/saltar/izquierda"
    carpeta_previas = carpeta / "vistas_previas/saltar/izquierda"
    carpeta_frames.mkdir(parents=True, exist_ok=True)
    carpeta_previas.mkdir(parents=True, exist_ok=True)
    for indice, frame in enumerate(frames):
        nombre = f"frame_{indice:03}.png"
        frame.save(carpeta_frames / nombre, optimize=True)
        lado = TAMANO * ESCALA_PREVIA
        frame.resize((lado, lado), Image.Resampling.NEAREST).save(
            carpeta_previas / nombre, optimize=True)
    guardar_contacto(frames, carpeta_previas / "contacto.png")
    guardar_gif(frames, carpeta_previas / "animacion.gif")
    print(f"Cuatro frames de 64 × 64: {carpeta_frames}")
    print(f"Vistas previas y GIF: {carpeta_previas}")


if __name__ == "__main__":
    main()
