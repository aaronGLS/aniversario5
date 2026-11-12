# Prueba de retoque de la carrera hacia la derecha

Esta prueba parte de los cuatro fotogramas originales. Conserva sus poses y
transparencia; ajusta tonos claros de la ropa y añade algunos píxeles blancos
en las zapatillas para que se lean de forma más uniforme. La cara no se toca.

`frames/` contiene los cuatro PNG de 64 × 64. En `vistas_previas/` están la
hoja de contacto, la animación y una comparación con la versión original.
Los sprites de `frames/correr/derecha/` no se modifican.

Con Pillow instalado, se puede regenerar desde la raíz del proyecto:

```text
python -B assets/auriana/experimentos/retoque_correr_derecha/crear_prueba.py
```
