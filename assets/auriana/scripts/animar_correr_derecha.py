"""Adapta cuatro poses de carrera de Auriana a sprites de 64 × 64.

Utiliza una guía generada a partir de la referencia del usuario y conserva la
cabeza y la parte trasera del cabello del sprite de reposo. Requiere Pillow.
Ejecutar: python assets/auriana/scripts/animar_correr_derecha.py
"""

from pathlib import Path

from PIL import Image, ImageDraw


TAMANO = 64
NUM_FRAMES = 4
ESCALA_PREVIA = 8
ESCALA_GIF = 4
DURACION_MS = 140


def crear_frames(guia: Image.Image, reposo: Image.Image) -> list[Image.Image]:
    """Alinea las cuatro poses y conserva los rasgos del perfil sin flor."""
    if guia.size != (2172, 724):
        raise ValueError("La guía de carrera debe medir 2172 × 724 píxeles.")
    if reposo.size != (TAMANO, TAMANO):
        raise ValueError("El frame de reposo debe medir 64 × 64 píxeles.")

    frames = []
    ancho_celda = guia.width // NUM_FRAMES
    escala_fuente = 574 / 60
    for indice in range(NUM_FRAMES):
        celda = guia.crop((indice * ancho_celda, 0, (indice + 1) * ancho_celda, guia.height))
        frame = celda.transform(
            (TAMANO, TAMANO), Image.Transform.AFFINE,
            (escala_fuente, 0, -10, 0, escala_fuente, 45),
            resample=Image.Resampling.NEAREST,
        )
        frame.putdata([(*pixel[:3], 255) if pixel[3] >= 128 else (0, 0, 0, 0)
                       for pixel in frame.getdata()])

        # Mantener la cara y la parte posterior del cabello del sprite aprobado
        # evita que cambien entre poses y conserva la ausencia de flor.
        frame.paste(reposo.crop((0, 0, TAMANO, 31)), (0, 0))
        frame.paste(reposo.crop((0, 31, 28, 49)), (0, 31))

        # La guía conserva parte de otra barbilla debajo de la cabeza pegada.
        # Recupera también el contorno original y su unión con el cuello.
        frame.paste(reposo.crop((36, 31, 49, 33)), (36, 31))

        # Una elevación discreta acompaña las dos zancadas abiertas.
        if indice in (0, 2):
            elevado = Image.new("RGBA", (TAMANO, TAMANO), (0, 0, 0, 0))
            elevado.paste(frame, (0, -1))
            frame = elevado
        frames.append(frame)
    return frames


def guardar_contacto(frames: list[Image.Image], destino: Path) -> None:
    lado, margen = 256, 32
    hoja = Image.new("RGB", (lado * NUM_FRAMES, lado + margen), "#fcf9fd")
    dibujo = ImageDraw.Draw(hoja)
    for indice, frame in enumerate(frames):
        grande = frame.resize((lado, lado), Image.Resampling.NEAREST)
        hoja.paste(grande, (indice * lado, margen), grande)
        dibujo.text((indice * lado + 112, 8), f"F{indice + 1}", fill="#4b2a3b", font_size=16)
    hoja.save(destino, optimize=True)


def guardar_gif(frames: list[Image.Image], destino: Path) -> None:
    """Comparte una paleta entre fotogramas y reserva un índice transparente."""
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
                     duration=DURACION_MS, loop=0, disposal=2, transparency=255,
                     background=255, optimize=False)


def main() -> None:
    carpeta = Path(__file__).resolve().parent.parent
    with Image.open(carpeta / "referencias/guia_correr_derecha.png") as archivo:
        guia = archivo.convert("RGBA")
    with Image.open(carpeta / "frames/reposo/derecha/frame_000.png") as archivo:
        reposo = archivo.convert("RGBA")
    if set(reposo.getchannel("A").getdata()) - {0, 255}:
        raise ValueError("El frame de reposo debe usar transparencia binaria.")
    frames = crear_frames(guia, reposo)
    carpeta_frames = carpeta / "frames/correr/derecha"
    carpeta_previas = carpeta / "vistas_previas/correr/derecha"
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
