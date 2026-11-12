"""Genera seis frames de reposo para el perfil izquierdo de Auriana.

Usa el frame_000.png existente, incluida su flor, como base. Requiere Pillow.
Comparte el ritmo y las vistas previas con la animación del perfil derecho.
Ejecutar: python assets/auriana/scripts/animar_reposo_izquierda.py
"""

from pathlib import Path

from PIL import Image

from animar_reposo_derecha import (
    ESCALA_PREVIA,
    TAMANO,
    elevar_torso,
    guardar_contacto,
    guardar_gif,
)


def balancear_cabello(imagen: Image.Image, hacia_fuera: bool) -> Image.Image:
    """Desplaza un píxel el rizo exterior del perfil izquierdo."""
    resultado = imagen.copy()
    for y in (35, 36, 37, 38):
        borde = next((x for x in range(53, 40, -1) if resultado.getpixel((x, y))[3]), None)
        if borde is None:
            continue
        if hacia_fuera:
            resultado.putpixel((borde + 1, y), resultado.getpixel((borde, y)))
        else:
            resultado.putpixel((borde, y), (0, 0, 0, 0))
    return resultado


def parpadear(imagen: Image.Image, cerrado: bool) -> Image.Image:
    """Dibuja el párpado izquierdo con los colores originales de la cara."""
    resultado = imagen.copy()
    piel = {y: imagen.getpixel((20, y)) for y in range(20, 25)}
    linea = imagen.getpixel((22, 19))

    if cerrado:
        for y in range(20, 25):
            for x in range(22, 27):
                resultado.putpixel((x, y), piel[y])
        resultado.putpixel((22, 21), linea)
        rubor = imagen.getpixel((24, 25))
        for x in (23, 24):
            resultado.putpixel((x, 23), rubor)
    else:
        for y in (20, 21):
            for x in range(22, 26):
                resultado.putpixel((x, y), piel[y])
        resultado.putpixel((26, 22), piel[22])
        resultado.putpixel((22, 22), linea)

    for x in range(23, 26):
        resultado.putpixel((x, 22), linea)
    return resultado


def crear_frames(base: Image.Image) -> list[Image.Image]:
    """Mantiene la flor unida al cabello durante las seis poses."""
    elevada = elevar_torso(base)
    return [
        base.copy(),
        elevada,
        balancear_cabello(elevada, hacia_fuera=True),
        parpadear(balancear_cabello(base, hacia_fuera=True), cerrado=False),
        parpadear(base, cerrado=True),
        balancear_cabello(base, hacia_fuera=False),
    ]


def main() -> None:
    carpeta = Path(__file__).resolve().parent.parent
    carpeta_frames = carpeta / "frames" / "reposo" / "izquierda"
    carpeta_previas = carpeta / "vistas_previas" / "reposo" / "izquierda"
    with Image.open(carpeta_frames / "frame_000.png") as archivo:
        base = archivo.convert("RGBA")
    if base.size != (TAMANO, TAMANO):
        raise ValueError("El frame inicial debe medir 64 × 64 píxeles.")
    if set(base.getchannel("A").getdata()) - {0, 255}:
        raise ValueError("El frame inicial debe usar transparencia binaria.")

    frames = crear_frames(base)
    carpeta_previas.mkdir(parents=True, exist_ok=True)
    for indice, frame in enumerate(frames):
        nombre = f"frame_{indice:03}.png"
        if indice:
            frame.save(carpeta_frames / nombre, optimize=True)
        lado = TAMANO * ESCALA_PREVIA
        frame.resize((lado, lado), Image.Resampling.NEAREST).save(
            carpeta_previas / nombre, optimize=True
        )

    guardar_contacto(frames, carpeta_previas / "contacto.png")
    guardar_gif(frames, carpeta_previas / "animacion.gif")
    print(f"Seis frames de 64 x 64: {carpeta_frames}")
    print(f"Vistas previas y GIF: {carpeta_previas}")


if __name__ == "__main__":
    main()
