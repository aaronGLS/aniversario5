"""Crea el sprite de Auriana de perfil derecho y su vista previa.

Requiere Pillow y la imagen referencias/perfil_derecho_sin_flor.png.
Ejecutar: python assets/auriana/scripts/crear_derecha.py
"""

from pathlib import Path

from PIL import Image


TAMANO = 64
ALTURA_PERSONAJE = 60
ESCALA_PREVIA = 8
DESFASE_ORIGEN_X = -5


def crear_sprite(origen: Image.Image) -> Image.Image:
    """Conserva el encuadre y los colores de la referencia transparente."""
    ancho = round(origen.width * ALTURA_PERSONAJE / origen.height)

    # La fase de muestreo conserva el brillo original del ojo a 64 x 64.
    perfil = origen.transform(
        (ancho, ALTURA_PERSONAJE),
        Image.Transform.AFFINE,
        (
            origen.width / ancho,
            0,
            DESFASE_ORIGEN_X,
            0,
            origen.height / ALTURA_PERSONAJE,
            0,
        ),
        resample=Image.Resampling.NEAREST,
    )

    # En el sprite final cada pixel es opaco o transparente, sin halos.
    alfa = perfil.getchannel("A").point(lambda valor: 255 if valor >= 128 else 0)
    perfil.putalpha(alfa)
    perfil_limpio = Image.new("RGBA", perfil.size, (0, 0, 0, 0))
    perfil_limpio.paste(perfil, (0, 0), alfa)

    imagen = Image.new("RGBA", (TAMANO, TAMANO), (0, 0, 0, 0))
    posicion = ((TAMANO - ancho) // 2, (TAMANO - ALTURA_PERSONAJE) // 2)
    imagen.paste(perfil_limpio, posicion)
    return imagen


def main() -> None:
    carpeta = Path(__file__).resolve().parent.parent
    with Image.open(carpeta / "referencias" / "perfil_derecho_sin_flor.png") as archivo:
        imagen = crear_sprite(archivo.convert("RGBA"))

    original = carpeta / "frames" / "reposo" / "derecha" / "frame_000.png"
    previa = carpeta / "vistas_previas" / "reposo" / "derecha" / "frame_000.png"
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
