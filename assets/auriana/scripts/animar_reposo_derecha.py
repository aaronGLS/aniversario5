"""Genera seis frames de reposo para el perfil derecho de Auriana.

Usa el frame_000.png existente, que no tiene flor, como base. Requiere Pillow.
Ejecutar: python assets/auriana/scripts/animar_reposo_derecha.py
"""

from pathlib import Path

from PIL import Image, ImageDraw


TAMANO = 64
ESCALA_PREVIA = 8
ESCALA_GIF = 4
DURACIONES_MS = (1300, 350, 600, 100, 110, 700)


def elevar_torso(imagen: Image.Image) -> Image.Image:
    """Eleva un píxel la parte superior y mantiene los pies anclados."""
    elevada = Image.new("RGBA", (TAMANO, TAMANO), (0, 0, 0, 0))
    elevada.paste(imagen.crop((0, 1, TAMANO, 47)), (0, 0))
    elevada.paste(imagen.crop((0, 46, TAMANO, 47)), (0, 46))
    elevada.paste(imagen.crop((0, 47, TAMANO, TAMANO)), (0, 47))
    return elevada


def balancear_cabello(imagen: Image.Image, hacia_fuera: bool) -> Image.Image:
    """Desplaza un píxel el contorno de un rizo para acompañar la respiración."""
    resultado = imagen.copy()
    for y in (35, 36, 37, 38):
        borde = next((x for x in range(10, 23) if resultado.getpixel((x, y))[3]), None)
        if borde is None:
            continue
        if hacia_fuera:
            resultado.putpixel((borde - 1, y), resultado.getpixel((borde, y)))
        else:
            resultado.putpixel((borde, y), (0, 0, 0, 0))
    return resultado


def parpadear(imagen: Image.Image, cerrado: bool) -> Image.Image:
    """Dibuja el párpado usando los colores de piel y de línea del sprite."""
    resultado = imagen.copy()
    piel = {y: imagen.getpixel((42, y)) for y in range(21, 26)}
    linea = imagen.getpixel((37, 20))

    if cerrado:
        for y in range(21, 26):
            for x in range(37, 42):
                resultado.putpixel((x, y), piel[y])
        resultado.putpixel((41, 22), linea)
        rubor = imagen.getpixel((39, 26))
        for x in (39, 40):
            resultado.putpixel((x, 24), rubor)
    else:
        for y in (21, 22):
            for x in range(38, 42):
                resultado.putpixel((x, y), piel[y])
        resultado.putpixel((37, 23), piel[23])
        resultado.putpixel((41, 23), linea)

    for x in range(38, 41):
        resultado.putpixel((x, 23), linea)
    return resultado


def crear_frames(base: Image.Image) -> list[Image.Image]:
    """Combina respiración, movimiento de cabello y parpadeo en seis poses."""
    elevada = elevar_torso(base)
    return [
        base.copy(),
        elevada,
        balancear_cabello(elevada, hacia_fuera=True),
        parpadear(balancear_cabello(base, hacia_fuera=True), cerrado=False),
        parpadear(base, cerrado=True),
        balancear_cabello(base, hacia_fuera=False),
    ]


def guardar_contacto(frames: list[Image.Image], destino: Path) -> None:
    """Crea una imagen para revisar los seis frames de un vistazo."""
    hoja = Image.new("RGB", (1536, 292), "#fcf9fd")
    dibujo = ImageDraw.Draw(hoja)
    for indice, frame in enumerate(frames):
        grande = frame.resize((256, 256), Image.Resampling.NEAREST)
        hoja.paste(grande, (indice * 256, 30), grande)
        dibujo.text((indice * 256 + 111, 8), f"F{indice + 1}", fill="#4b2a3b", font_size=16)
    hoja.save(destino, optimize=True)


def guardar_gif(frames: list[Image.Image], destino: Path) -> None:
    """Comparte una paleta entre frames para evitar parpadeos de color."""
    colores = [pixel[:3] for frame in frames for pixel in frame.getdata() if pixel[3]]
    muestras = Image.new("RGB", (len(colores), 1))
    muestras.putdata(colores)
    paleta = muestras.quantize(
        colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
    )
    valores = paleta.getpalette()
    # El índice 255 queda reservado para transparencia.
    valores[765:768] = valores[:3]
    paleta.putpalette(valores)

    animados = []
    for frame in frames:
        indexada = frame.convert("RGB").quantize(palette=paleta, dither=Image.Dither.NONE)
        alfa = frame.getchannel("A").getdata()
        indexada.putdata(
            [255 if a == 0 else 0 if indice == 255 else indice for indice, a in zip(indexada.getdata(), alfa)]
        )
        indexada.putpalette(valores)
        indexada.info["transparency"] = 255
        lado = TAMANO * ESCALA_GIF
        animados.append(indexada.resize((lado, lado), Image.Resampling.NEAREST))

    animados[0].save(
        destino,
        save_all=True,
        append_images=animados[1:],
        duration=DURACIONES_MS,
        loop=0,
        disposal=2,
        transparency=255,
        background=255,
        optimize=False,
    )


def main() -> None:
    carpeta = Path(__file__).resolve().parent.parent
    carpeta_frames = carpeta / "frames" / "reposo" / "derecha"
    carpeta_previas = carpeta / "vistas_previas" / "reposo" / "derecha"
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
