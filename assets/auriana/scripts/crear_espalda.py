"""Crea el sprite de Auriana de espaldas y su vista previa.

Requiere Pillow y la imagen referencias/espalda_alta.png.
Ejecutar: python assets/auriana/scripts/crear_espalda.py
"""

from pathlib import Path

from PIL import Image


TAMANO = 64
ALTURA_PERSONAJE = 60
ESCALA_PREVIA = 8


def crear_sprite(origen: Image.Image) -> Image.Image:
    """Reduce la referencia transparente sin suavizar los píxeles."""
    ancho = round(origen.width * ALTURA_PERSONAJE / origen.height)
    espalda = origen.resize((ancho, ALTURA_PERSONAJE), Image.Resampling.NEAREST)

    # En el sprite final cada píxel es opaco o transparente, sin halos.
    alfa = espalda.getchannel("A").point(lambda valor: 255 if valor >= 128 else 0)
    espalda.putalpha(alfa)
    espalda_limpia = Image.new("RGBA", espalda.size, (0, 0, 0, 0))
    espalda_limpia.paste(espalda, (0, 0), alfa)

    imagen = Image.new("RGBA", (TAMANO, TAMANO), (0, 0, 0, 0))
    posicion = ((TAMANO - ancho) // 2, (TAMANO - ALTURA_PERSONAJE) // 2)
    imagen.paste(espalda_limpia, posicion)
    return imagen


def main() -> None:
    carpeta = Path(__file__).resolve().parent.parent
    with Image.open(carpeta / "referencias" / "espalda_alta.png") as archivo:
        imagen = crear_sprite(archivo.convert("RGBA"))

    original = carpeta / "frames" / "reposo" / "espalda" / "frame_000.png"
    previa = carpeta / "vistas_previas" / "reposo" / "espalda" / "frame_000.png"
    original.parent.mkdir(parents=True, exist_ok=True)
    previa.parent.mkdir(parents=True, exist_ok=True)
    imagen.save(original, optimize=True)
    lado_previa = TAMANO * ESCALA_PREVIA
    imagen.resize(
        (lado_previa, lado_previa), Image.Resampling.NEAREST
    ).save(previa, optimize=True)
    print(f"PNG 64 x 64: {original}")
    print(f"Vista previa {lado_previa} x {lado_previa}: {previa}")


if __name__ == "__main__":
    main()
