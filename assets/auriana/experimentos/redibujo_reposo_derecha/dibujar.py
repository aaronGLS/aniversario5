"""Redibujo manual de Auriana de pie, en una cuadricula 64 x 64.

Cada simbolo de las matrices es un pixel elegido a mano. El dibujo no lee, reduce,
cuantiza, filtra ni copia pixeles de otra imagen. Paleta compartida con el
sprite de reposo/frente; perfil derecho sin flor.

Ejecutar desde cualquier carpeta con el Python local que tenga Pillow:
    .venv-sprites/Scripts/python.exe -B assets/auriana/experimentos/redibujo_reposo_derecha/dibujar.py

Escribe solamente en esta carpeta experimental. Las referencias se abren
despues de terminar el sprite, exclusivamente para crear la comparacion.
"""

from pathlib import Path

from PIL import Image, ImageDraw


TAMANO = 64
PALETA = {
    ".": (0, 0, 0, 0),
    "0": (28, 17, 28, 255),
    "1": (38, 23, 31, 255),
    "2": (41, 32, 50, 255),
    "3": (45, 24, 38, 255),
    "4": (59, 44, 73, 255),
    "5": (61, 34, 51, 255),
    "6": (62, 36, 45, 255),
    "7": (87, 48, 63, 255),
    "8": (91, 51, 68, 255),
    "9": (94, 50, 46, 255),
    "A": (105, 64, 121, 255),
    "B": (107, 60, 75, 255),
    "C": (116, 64, 52, 255),
    "D": (130, 72, 82, 255),
    "E": (148, 92, 167, 255),
    "F": (164, 89, 93, 255),
    "G": (170, 116, 120, 255),
    "H": (174, 121, 188, 255),
    "I": (193, 142, 205, 255),
    "J": (197, 139, 142, 255),
    "K": (213, 166, 221, 255),
    "L": (230, 139, 105, 255),
    "M": (231, 110, 114, 255),
    "N": (232, 213, 216, 255),
    "O": (245, 154, 133, 255),
    "P": (245, 172, 125, 255),
    "S": (255, 199, 149, 255),
    "T": (255, 204, 159, 255),
    "U": (255, 213, 166, 255),
    "V": (255, 247, 236, 255),
}

# (y, x inicial, pixeles). Lo que no se escribe permanece transparente.
# Las filas se dibujan directamente a 64 x 64; no hay una imagen intermedia.
FILAS = (
    (2, 30, "00000000"),
    (3, 27, "00066666666600"),
    (4, 25, "00677777777777600"),
    (5, 23, "00677777777777777700"),
    (6, 22, "06777777777777777777700"),
    (7, 21, "067777777777777663777770"),
    (8, 20, "067D777777776337777777770"),
    (9, 19, "067FD77777766777777777777700"),
    (10, 19, "06FF777776777777777777777770"),
    (11, 18, "067D77777777777777777737777700"),
    (12, 18, "0777D77777777777777773377777770"),
    (13, 18, "07777777777777777773377763777770"),
    (14, 18, "077777777777777773377777D6377770"),
    (15, 17, "067777777777776337777777DD6377770"),
    (16, 16, "0677777777776337777777767777777770"),
    (17, 15, "06777777776337777777777677777777770"),
    (18, 14, "067777776337777777777666777777777770"),
    (19, 14, "067777763377777777766677777777777770"),
    (20, 14, "077633337777777777666677777777777770"),
    (21, 14, "070.03777777777666677777777777777770"),
    (22, 14, "070.0677777777667777777777777777770"),
    (23, 14, "0770067777776677777777777777777770"),
    (24, 15, "077637777776777777777777777777770"),
    (25, 16, "06777777776677777777777777777770"),
    (26, 15, "067777777766777777777777777777770"),
    (27, 13, "0067773777776777777770"),
    (28, 13, "0777763777777667777770"),
    (29, 13, "077763377777776777770"),
    (30, 13, "070.03777637777766770"),
    (31, 14, "07700777633777776670"),
    (32, 14, "0677777763777777600"),
    (33, 16, "06777776377777600"),
    (34, 15, "0677776377777600"),
    (35, 13, "0067763377777600"),
    (36, 13, "077777637777760"),
    (37, 13, "077776377777760"),
    (38, 13, "07760.67777760"),
    (39, 13, "06770.0677760"),
    (40, 15, "07770677760"),
    (41, 16, "06777777600E0"),
    (42, 17, "067777660HI0"),
    (43, 16, "0677776000HIE0"),
    (44, 16, "0777760000EHE0"),
    (45, 16, "0770.00000IEA0"),
    (46, 22, "00"),
    (55, 29, "0HKVVVHH00HH0"),
    (56, 28, "0HHVVVVKK0HVVH0"),
    (57, 28, "0HHVVVVVEKK0VVK0"),
    (58, 28, "0HHVVVVVVVKK0VK0"),
    (59, 28, "0HHHHHHHHHHH0HH0"),
    (60, 28, "0KVVVVVVVVVK0KK0"),
    (61, 29, "000000000000000"),
)

# Cara y flequillo: coordenadas fijas para conservar la forma vertical del ojo.
# Cada fila comienza en x=34 y termina en x=49; los puntos limpian el exterior.
CARA = (
    (16, "77777760L7777770"),
    (17, "7777760LT0677770"),
    (18, "777760LTTT067770"),
    (19, "77760LTTTT067770"),
    (20, "77700000TTT06770"),
    (21, "770V11110TT0670"),
    (22, "77LV1J110TTT060"),
    (23, "07LV11110TTT00"),
    (24, "07LV11110TTT0"),
    (25, "770TCCCC0TTT0"),
    (26, "770LOOTTTTT0"),
    (27, "670LTTTTTTT0"),
    (28, "670LTTTTTT0"),
    (29, "7600LTTTT0"),
    (30, "60..LTT000"),
    (31, "00..LTL00670"),
)

OREJA = (
    (22, 28, "00"),
    (23, 27, "0TU0"),
    (24, 27, "0LTS0"),
    (25, 27, "0LTS0"),
    (26, 28, "0TT0"),
    (27, 29, "00"),
)

# Mechones independientes, todos dibujados con coordenadas enteras.
MECHONES = (
    (22, 31, "06770"),
    (23, 31, "06770"),
    (24, 31, "067770"),
    (25, 31, "036770"),
    (26, 31, "036770"),
    (27, 31, "006770"),
    (28, 31, "006770"),
    (29, 32, "06700"),
    (30, 32, "0000"),
    (31, 33, "000"),
    (32, 25, "7677600"),
    (33, 25, "677600"),
    (34, 25, "77600"),
    (35, 25, "7760"),
    (36, 25, "7770"),
    (37, 25, "67770"),
    (38, 25, "63770"),
    (39, 25, "63770"),
    (40, 25, "67760"),
    (41, 23, "6777760"),
    (42, 23, "677760"),
    (43, 22, "067770"),
    (44, 22, "067770"),
    (45, 22, "066770"),
    (46, 23, "06670"),
    (47, 24, "0000"),
    (32, 42, "0670"),
    (33, 42, "06770"),
    (34, 43, "06770"),
    (35, 44, "0770"),
    (36, 43, "0.070"),
    (37, 43, "0.070"),
    (38, 43, "00070"),
    (39, 42, "06770"),
    (40, 42, "0670"),
    (41, 42, "000"),
)

# Brazo vertical, cuello, cuerpo y piernas de pie, sin la flexion del salto.
CUERPO = (
    (32, 34, "0EEHKIHE0"),
    (33, 33, "0EEHIIHIE0"),
    (34, 31, "0KIIIEEEII0"),
    (35, 30, "0KIIIEIIIII0"),
    (36, 29, "0KIIIIEIIIII0"),
    (37, 29, "0IIIIIEIIIII0"),
    (38, 29, "0IIIII4IIIII0"),
    (39, 29, "0HIIII4IIIII0"),
    (40, 29, "0HIIII4IIIII0"),
    (41, 29, "0HIIIIAIIIII0"),
    (42, 29, "0HIIIIAIIIIH0"),
    (43, 29, "0HIIIIAIIIIH0"),
    (44, 29, "0EEEEEAHHHHH0"),
    (45, 29, "0IEIIEAIEIIE0"),
    (46, 29, "0AAEAA0000000"),
    (47, 29, "00LTTT0222220"),
    (48, 29, "00LSSL0222220"),
    (49, 29, "0200002222020"),
    (50, 29, "0444444444040"),
    (51, 29, "0444444444040"),
    (52, 29, "0000000000000"),
    (53, 30, "0LSSSSS00LS0"),
    (54, 30, "0LTTTTS00LT0"),
)


def dibujar() -> Image.Image:
    """Coloca cada pixel explicito en el lienzo nativo."""
    imagen = Image.new("RGBA", (TAMANO, TAMANO), PALETA["."])
    pixeles = imagen.load()
    filas_usadas = set()
    for y, inicio, fila in FILAS:
        if y in filas_usadas or not (0 <= y < TAMANO):
            raise ValueError(f"Fila repetida o fuera de la cuadricula: {y}")
        if not (0 <= inicio < inicio + len(fila) <= TAMANO):
            raise ValueError(f"Fila {y} fuera de la cuadricula")
        filas_usadas.add(y)
        for x, simbolo in enumerate(fila, start=inicio):
            pixeles[x, y] = PALETA[simbolo]
    for y, fila in CARA:
        if len(fila) > 16:
            raise ValueError(f"Cara fuera de su cuadricula: {y}")
        for x, simbolo in enumerate(fila.ljust(16, "."), start=34):
            pixeles[x, y] = PALETA[simbolo]
    for y, inicio, fila in OREJA:
        for x, simbolo in enumerate(fila, start=inicio):
            pixeles[x, y] = PALETA[simbolo]
    for y, inicio, fila in MECHONES + CUERPO:
        for x, simbolo in enumerate(fila, start=inicio):
            pixeles[x, y] = PALETA[simbolo]
    return imagen


def fondo(tamano: tuple[int, int]) -> Image.Image:
    """Damero neutro para inspeccionar contornos y transparencia."""
    imagen = Image.new("RGBA", tamano, (231, 228, 236, 255))
    dibujo = ImageDraw.Draw(imagen)
    for y in range(0, tamano[1], 16):
        for x in range(0, tamano[0], 16):
            if (x // 16 + y // 16) % 2:
                dibujo.rectangle((x, y, x + 15, y + 15), fill=(215, 211, 222, 255))
    return imagen


def main() -> None:
    carpeta = Path(__file__).resolve().parent
    raiz = carpeta.parents[3]
    imagen = dibujar()
    imagen.save(carpeta / "frame_000.png", optimize=True)
    imagen.resize((512, 512), Image.Resampling.NEAREST).save(
        carpeta / "vista_8x.png", optimize=True
    )

    # Abrir las referencias sirve solo para mostrar los tres dibujos juntos.
    fuente = Image.open(raiz / "assets/auriana/frames/reposo/derecha/frame_000.png").convert("RGBA")
    frente = Image.open(raiz / "assets/auriana/frames/reposo/frente/frame_000.png").convert("RGBA")
    comparacion = Image.new("RGBA", (1584, 592), (250, 248, 252, 255))
    dibujo = ImageDraw.Draw(comparacion)
    muestras = (
        ("Referencia lateral de pie", fuente),
        ("Redibujo pixel a pixel", imagen),
        ("Referencia de estilo: frente", frente),
    )
    for indice, (etiqueta, muestra) in enumerate(muestras):
        x = 8 + indice * 528
        dibujo.text((x + 8, 14), etiqueta, fill=(42, 31, 49, 255), font_size=18)
        panel = fondo((512, 512))
        panel.alpha_composite(muestra.resize((512, 512), Image.Resampling.NEAREST))
        comparacion.alpha_composite(panel, (x, 48))
        dibujo.text((x + 8, 568), "64 x 64 - ampliacion 8x sin suavizado", fill=(67, 52, 76, 255), font_size=14)
    comparacion.save(carpeta / "comparacion.png", optimize=True)
    print("Dibujado: frame_000.png (64 x 64 RGBA)")
    print("Vistas: vista_8x.png y comparacion.png")


if __name__ == "__main__":
    main()
