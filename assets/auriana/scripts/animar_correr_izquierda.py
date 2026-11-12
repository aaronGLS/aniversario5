"""Genera la carrera izquierda con la flor y el ritmo del perfil derecho.

Refleja las cuatro poses de carrera y les aplica la cabeza y el cabello del
perfil izquierdo de reposo. Requiere Pillow. Ejecutar desde la raíz del proyecto:
    python assets/auriana/scripts/animar_correr_izquierda.py
"""

from pathlib import Path

from PIL import Image

from animar_correr_derecha import (
    ESCALA_PREVIA,
    NUM_FRAMES,
    TAMANO,
    guardar_contacto,
    guardar_gif,
)


def crear_frames(derecha: list[Image.Image], reposo: Image.Image) -> list[Image.Image]:
    """Mantiene la flor y la cara originales en las cuatro poses reflejadas."""
    if len(derecha) != NUM_FRAMES:
        raise ValueError(f"La carrera derecha debe tener {NUM_FRAMES} frames.")
    if reposo.size != (TAMANO, TAMANO) or any(
        frame.size != (TAMANO, TAMANO) for frame in derecha
    ):
        raise ValueError("Todos los frames deben medir 64 × 64 píxeles.")
    if any(set(frame.getchannel("A").getdata()) - {0, 255}
           for frame in [reposo, *derecha]):
        raise ValueError("Los frames deben usar transparencia binaria.")

    frames = []
    for indice, original in enumerate(derecha):
        frame = original.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        altura = -1 if indice in (0, 2) else 0

        # La cabeza incluye la flor y se mueve junto al cuerpo en cada zancada.
        frame.paste(reposo.crop((0, 0, TAMANO, 31)), (0, altura))
        frame.paste(reposo.crop((36, 31, TAMANO, 49)), (36, 31 + altura))

        # Conservar también la barbilla evita dejar una segunda línea de piel
        # al unir la cara del perfil izquierdo con el cuerpo de carrera.
        frame.paste(reposo.crop((15, 31, 29, 33)), (15, 31 + altura))
        frames.append(frame)
    return frames


def main() -> None:
    carpeta = Path(__file__).resolve().parent.parent
    with Image.open(carpeta / "frames/reposo/izquierda/frame_000.png") as archivo:
        reposo = archivo.convert("RGBA")
    derecha = []
    for indice in range(NUM_FRAMES):
        ruta = carpeta / "frames/correr/derecha" / f"frame_{indice:03}.png"
        with Image.open(ruta) as archivo:
            derecha.append(archivo.convert("RGBA"))
    frames = crear_frames(derecha, reposo)

    carpeta_frames = carpeta / "frames/correr/izquierda"
    carpeta_previas = carpeta / "vistas_previas/correr/izquierda"
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
