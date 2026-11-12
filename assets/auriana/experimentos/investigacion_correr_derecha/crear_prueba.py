"""Genera una prueba reversible de seis cuadros de carrera con Pillow.

Parte de la carrera aprobada y crea dos transiciones ajustando las piernas.
La animación existente no se modifica.
"""

from math import tanh
from pathlib import Path

from PIL import Image, ImageDraw


LADO = 64
DURACIONES_MS = (90, 90, 100, 90, 90, 100)
CARPETA = Path(__file__).resolve().parent
AURIANA = CARPETA.parents[1]


def transicion_piernas(frame: Image.Image) -> Image.Image:
    """Acerca gradualmente las piernas; la parte superior permanece intacta."""
    resultado = frame.copy()
    origen, destino = frame.load(), resultado.load()
    for y in range(48, LADO):
        peso = min(1.0, max(0.0, (y - 47.5) / 7.0))
        for x in range(LADO):
            fuente = float(x)
            for _ in range(15):
                fuente = x + 3.5 * tanh((fuente - 32) / 6) * peso
            coordenada = round(fuente)
            destino[x, y] = (
                origen[coordenada, y]
                if 0 <= coordenada < LADO
                else (0, 0, 0, 0)
            )
    return resultado


def cargar_carrera() -> list[Image.Image]:
    carpeta = AURIANA / "frames" / "correr" / "derecha"
    frames = []
    for indice in range(4):
        with Image.open(carpeta / f"frame_{indice:03}.png") as imagen:
            frame = imagen.convert("RGBA")
        if frame.size != (LADO, LADO):
            raise ValueError("Cada sprite original debe medir 64 × 64 píxeles.")
        if set(frame.getchannel("A").getdata()) - {0, 255}:
            raise ValueError("Los sprites originales deben tener alfa binario.")
        frames.append(frame)
    return frames


def crear_frames(originales: list[Image.Image]) -> list[Image.Image]:
    return [
        originales[0].copy(), transicion_piernas(originales[0]),
        originales[1].copy(), originales[2].copy(),
        transicion_piernas(originales[2]), originales[3].copy(),
    ]


def guardar_contacto(frames: list[Image.Image], destino: Path) -> None:
    escala, margen = 4, 32
    lado = LADO * escala
    hoja = Image.new("RGB", (lado * len(frames), lado + margen), "#faf6fb")
    dibujo = ImageDraw.Draw(hoja)
    for indice, frame in enumerate(frames):
        grande = frame.resize((lado, lado), Image.Resampling.NEAREST)
        hoja.paste(grande, (indice * lado, margen), grande)
        dibujo.text((indice * lado + 112, 8), f"F{indice + 1}", fill="#492a40")
    hoja.save(destino, optimize=True)


def paleta_comun(frames: list[Image.Image]) -> Image.Image:
    colores = [p[:3] for frame in frames for p in frame.getdata() if p[3]]
    muestra = Image.new("RGB", (len(colores), 1))
    muestra.putdata(colores)
    paleta = muestra.quantize(colors=255, method=Image.Quantize.MEDIANCUT,
                               dither=Image.Dither.NONE)
    valores = paleta.getpalette()
    valores[765:768] = valores[:3]
    paleta.putpalette(valores)
    return paleta


def guardar_animacion(frames: list[Image.Image], destino: Path) -> None:
    paleta = paleta_comun(frames)
    indexados = []
    for frame in frames:
        imagen = frame.convert("RGB").quantize(palette=paleta, dither=Image.Dither.NONE)
        imagen.putdata([255 if alfa == 0 else indice
                        for indice, alfa in zip(imagen.getdata(),
                                                frame.getchannel("A").getdata())])
        imagen.putpalette(paleta.getpalette())
        imagen.info["transparency"] = 255
        indexados.append(imagen.resize((256, 256), Image.Resampling.NEAREST))
    indexados[0].save(destino, save_all=True, append_images=indexados[1:],
                      duration=DURACIONES_MS, loop=0, disposal=2,
                      transparency=255, background=255, optimize=False)


def guardar_comparacion(originales: list[Image.Image], frames: list[Image.Image],
                        destino: Path) -> None:
    # Ambas secuencias duran 560 ms; los tiempos permiten observarlas en paralelo.
    inicios = (0, 90, 140, 180, 280, 370, 420, 460)
    duraciones = (90, 50, 40, 100, 90, 50, 40, 100)
    finales = (90, 180, 280, 370, 460, 560)
    laminas = []
    for tiempo in inicios:
        indice = next(i for i, fin in enumerate(finales) if tiempo < fin)
        hoja = Image.new("RGB", (512, 288), "#faf6fb")
        dibujo = ImageDraw.Draw(hoja)
        dibujo.text((12, 8), "Actual: 4 fotogramas", fill="#492a40")
        dibujo.text((268, 8), "Prueba: 6 fotogramas", fill="#492a40")
        for columna, frame in enumerate((originales[tiempo // 140], frames[indice])):
            grande = frame.resize((256, 256), Image.Resampling.NEAREST)
            hoja.paste(grande, (columna * 256, 32), grande)
        laminas.append(hoja)
    muestras = Image.new("RGB", (512, 288 * len(laminas)))
    for indice, hoja in enumerate(laminas):
        muestras.paste(hoja, (0, indice * 288))
    paleta = muestras.quantize(colors=256, method=Image.Quantize.MEDIANCUT,
                               dither=Image.Dither.NONE)
    indexadas = [hoja.quantize(palette=paleta, dither=Image.Dither.NONE)
                 for hoja in laminas]
    indexadas[0].save(destino, save_all=True, append_images=indexadas[1:],
                      duration=duraciones, loop=0, disposal=2, optimize=False)


def main() -> None:
    originales = cargar_carrera()
    frames = crear_frames(originales)
    carpeta_frames = CARPETA / "frames"
    carpeta_previas = CARPETA / "vistas_previas"
    carpeta_frames.mkdir(parents=True, exist_ok=True)
    carpeta_previas.mkdir(parents=True, exist_ok=True)
    for indice, frame in enumerate(frames):
        frame.save(carpeta_frames / f"frame_{indice:03}.png", optimize=True)
    guardar_contacto(frames, carpeta_previas / "contacto.png")
    guardar_animacion(frames, carpeta_previas / "animacion.gif")
    guardar_comparacion(originales, frames, carpeta_previas / "comparacion.gif")
    print(f"Prueba de seis fotogramas: {CARPETA}")


if __name__ == "__main__":
    main()
