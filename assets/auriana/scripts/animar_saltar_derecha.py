"""Adapta cuatro poses sencillas de salto al perfil derecho de Auriana.

Parte de una guía visual y conserva la cabeza, el cuello y los mechones del
sprite de reposo sin flor. Requiere Pillow.
Ejecutar: python assets/auriana/scripts/animar_saltar_derecha.py
"""

from pathlib import Path

from PIL import Image

from animar_correr_derecha import (
    ESCALA_GIF,
    ESCALA_PREVIA,
    NUM_FRAMES,
    TAMANO,
    guardar_contacto,
)


# Preparación, impulso, vuelo y aterrizaje. El GIF repite la secuencia como
# vista previa; en el juego se puede mantener el tercer frame mientras salta.
DURACIONES_MS = (120, 100, 240, 140)
ALTURAS_CABEZA = (2, -1, -1, 2)
DESPLAZAMIENTOS_CUERPO = ((1, 0), (1, 0), (1, 2), (1, 0))


def crear_frames(guia: Image.Image, reposo: Image.Image) -> list[Image.Image]:
    """Alinea las poses y conserva el perfil original en las cuatro fases."""
    if guia.size != (2172, 724):
        raise ValueError("La guía de salto debe medir 2172 × 724 píxeles.")
    if reposo.size != (TAMANO, TAMANO):
        raise ValueError("El frame de reposo debe medir 64 × 64 píxeles.")
    if set(reposo.getchannel("A").getdata()) - {0, 255}:
        raise ValueError("El frame de reposo debe usar transparencia binaria.")

    frames = []
    ancho_celda = guia.width // NUM_FRAMES
    escala_fuente = 574 / 60
    for indice, altura in enumerate(ALTURAS_CABEZA):
        celda = guia.crop((indice * ancho_celda, 0, (indice + 1) * ancho_celda, guia.height))
        frame = celda.transform(
            (TAMANO, TAMANO), Image.Transform.AFFINE,
            (escala_fuente, 0, -22, 0, escala_fuente, 70),
            resample=Image.Resampling.NEAREST,
        )
        frame.putdata([(*pixel[:3], 255) if pixel[3] >= 128 else (0, 0, 0, 0)
                       for pixel in frame.getdata()])

        # La guía y el perfil original tienen distinta altura de cabeza.
        # Alinear primero el cuerpo evita tapar el cuello y acortar el suéter.
        alineado = Image.new("RGBA", (TAMANO, TAMANO), (0, 0, 0, 0))
        alineado.paste(frame, DESPLAZAMIENTOS_CUERPO[indice])

        # Restaurar cabeza y cuello completos, incluida la barbilla, deja una
        # unión continua con los hombros en lugar de superponer dos contornos.
        alineado.paste(reposo.crop((0, 0, TAMANO, 35)), (0, altura))
        alineado.paste(reposo.crop((0, 35, 28, 49)), (0, 35 + altura))
        alineado.paste(reposo.crop((40, 35, 49, 41)), (40, 35 + altura))
        frames.append(alineado)
    return frames


def guardar_gif(frames: list[Image.Image], destino: Path) -> None:
    """Exporta la vista previa con una paleta común y tiempos por fase."""
    colores = [pixel[:3] for frame in frames for pixel in frame.getdata() if pixel[3]]
    muestras = Image.new("RGB", (len(colores), 1))
    muestras.putdata(colores)
    paleta = muestras.quantize(colors=255, method=Image.Quantize.MEDIANCUT,
                                dither=Image.Dither.NONE)
    valores = paleta.getpalette()
    valores[765:768] = valores[:3]
    paleta.putpalette(valores)
    animados = []
    for frame in frames:
        indexada = frame.convert("RGB").quantize(palette=paleta, dither=Image.Dither.NONE)
        indexada.putdata([255 if alpha == 0 else 0 if color == 255 else color
                          for color, alpha in zip(indexada.getdata(), frame.getchannel("A").getdata())])
        indexada.putpalette(valores)
        indexada.info["transparency"] = 255
        lado = TAMANO * ESCALA_GIF
        animados.append(indexada.resize((lado, lado), Image.Resampling.NEAREST))
    animados[0].save(destino, save_all=True, append_images=animados[1:],
                     duration=DURACIONES_MS, loop=0, disposal=2,
                     transparency=255, background=255, optimize=False)


def main() -> None:
    carpeta = Path(__file__).resolve().parent.parent
    with Image.open(carpeta / "referencias/guia_saltar_derecha.png") as archivo:
        guia = archivo.convert("RGBA")
    with Image.open(carpeta / "frames/reposo/derecha/frame_000.png") as archivo:
        reposo = archivo.convert("RGBA")
    frames = crear_frames(guia, reposo)

    carpeta_frames = carpeta / "frames/saltar/derecha"
    carpeta_previas = carpeta / "vistas_previas/saltar/derecha"
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
