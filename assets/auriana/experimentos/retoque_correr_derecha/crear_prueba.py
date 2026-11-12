"""Prepara una comparación de retoques para la carrera derecha de Auriana.

Los fotogramas aprobados se leen como referencia y no se modifican.
Requiere Pillow; ejecutar con Python desde cualquier directorio.
"""

from pathlib import Path
import sys

from PIL import Image, ImageDraw


CARPETA = Path(__file__).resolve().parent
AURIANA = CARPETA.parents[1]
sys.path.insert(0, str(AURIANA / "scripts"))
from animar_correr_derecha import guardar_contacto, guardar_gif  # noqa: E402


BLANCO = (244, 231, 231, 255)
CLARO = (234, 211, 223, 255)
DETALLES = {
    1: {
        BLANCO: ((24, 55), (25, 55), (24, 56), (25, 56)),
        CLARO: ((26, 55), (26, 56), (25, 57)),
    },
    2: {
        BLANCO: ((20, 54), (21, 54), (20, 55)),
        CLARO: ((19, 54), (21, 55)),
    },
    3: {
        BLANCO: ((35, 56), (36, 56)),
        CLARO: ((36, 55), (37, 56)),
    },
}


def cargar_frames() -> list[Image.Image]:
    frames = []
    for indice in range(4):
        ruta = AURIANA / "frames" / "correr" / "derecha" / f"frame_{indice:03}.png"
        with Image.open(ruta) as imagen:
            frame = imagen.convert("RGBA")
        if frame.size != (64, 64):
            raise ValueError(f"El sprite debe medir 64 × 64: {ruta}")
        if set(frame.getchannel("A").getdata()) - {0, 255}:
            raise ValueError(f"El sprite debe tener transparencia binaria: {ruta}")
        frames.append(frame)
    return frames


def paleta_ropa(frames: list[Image.Image]) -> Image.Image:
    colores = [pixel[:3] for frame in frames for pixel in frame.getdata() if pixel[3]]
    muestra = Image.new("RGB", (len(colores), 1))
    muestra.putdata(colores)
    return muestra.quantize(colors=128, method=Image.Quantize.MEDIANCUT,
                            dither=Image.Dither.NONE)


def retocar(frame: Image.Image, indice: int, paleta: Image.Image) -> Image.Image:
    """Unifica tonos claros de la ropa y aclara detalles de las zapatillas."""
    resultado = frame.copy()
    original, destino = frame.load(), resultado.load()
    color_comun = frame.convert("RGB").quantize(
        palette=paleta, dither=Image.Dither.NONE
    ).convert("RGB").load()
    for y in range(34, 64):
        for x in range(64):
            r, g, b, alfa = original[x, y]
            if (alfa and r > 100 and b > 110 and b >= g * 0.95
                    and (r > g + 10 or b > g + 10)):
                destino[x, y] = (*color_comun[x, y], alfa)

    # Se retocan únicamente píxeles interiores de las zapatillas, ya lilas.
    for color, posiciones in DETALLES.get(indice, {}).items():
        for x, y in posiciones:
            r, g, b, alfa = original[x, y]
            if not (alfa == 255 and r > 160 and b > 140 and r > g and b > g):
                raise ValueError(f"El detalle ({x}, {y}) ya no corresponde a la zapatilla.")
            destino[x, y] = color
    return resultado


def guardar_comparacion(originales: list[Image.Image], nuevos: list[Image.Image],
                        ruta: Path) -> None:
    laminas = []
    for original, nuevo in zip(originales, nuevos):
        hoja = Image.new("RGB", (512, 288), "#faf6fb")
        dibujo = ImageDraw.Draw(hoja)
        dibujo.text((12, 8), "Original", fill="#492a40")
        dibujo.text((268, 8), "Prueba de retoque", fill="#492a40")
        for indice, imagen in enumerate((original, nuevo)):
            grande = imagen.resize((256, 256), Image.Resampling.NEAREST)
            hoja.paste(grande, (indice * 256, 32), grande)
        laminas.append(hoja)
    muestras = Image.new("RGB", (512, 288 * len(laminas)))
    for indice, hoja in enumerate(laminas):
        muestras.paste(hoja, (0, indice * 288))
    paleta = muestras.quantize(colors=256, method=Image.Quantize.MEDIANCUT,
                               dither=Image.Dither.NONE)
    indexadas = [hoja.quantize(palette=paleta, dither=Image.Dither.NONE)
                 for hoja in laminas]
    indexadas[0].save(ruta, save_all=True, append_images=indexadas[1:],
                      duration=140, loop=0, disposal=2, optimize=False)


def main() -> None:
    originales = cargar_frames()
    paleta = paleta_ropa(originales)
    nuevos = [retocar(frame, indice, paleta) for indice, frame in enumerate(originales)]
    carpeta_frames = CARPETA / "frames"
    carpeta_previas = CARPETA / "vistas_previas"
    carpeta_frames.mkdir(parents=True, exist_ok=True)
    carpeta_previas.mkdir(parents=True, exist_ok=True)
    for indice, frame in enumerate(nuevos):
        frame.save(carpeta_frames / f"frame_{indice:03}.png", optimize=True)
    guardar_contacto(nuevos, carpeta_previas / "contacto.png")
    guardar_gif(nuevos, carpeta_previas / "animacion.gif")
    guardar_comparacion(originales, nuevos, carpeta_previas / "comparacion.gif")
    print(f"Prueba de retoque: {CARPETA}")


if __name__ == "__main__":
    main()
