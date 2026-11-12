# Prueba de seis fotogramas de carrera hacia la derecha

Esta prueba conserva la carrera original en `frames/correr/derecha`. Parte de
sus cuatro poses y crea dos transiciones acercando gradualmente las piernas,
sin separar ni superponer la cabeza. La imagen generada por IA se utilizó como
referencia visual del movimiento; estos fotogramas parten de los sprites ya
existentes, no de un recorte de la imagen de IA.

`frames/` contiene los seis PNG de 64 × 64 con transparencia. En
`vistas_previas/` están la hoja de contacto, la animación de la prueba y una
comparación animada con la carrera original. Es una prueba visual, no un
reemplazo de la animación del juego.

Para regenerarla desde la raíz del proyecto, con Pillow instalado:

```text
python -B assets/auriana/experimentos/investigacion_correr_derecha/crear_prueba.py
```
