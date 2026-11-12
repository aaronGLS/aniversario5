# Prueba de animación con scikit-image

Esta prueba usa las cuatro poses de carrera ya existentes y genera dos poses
intermedias con una malla de puntos. La cabeza, el cuello y el torso permanecen
fijos; se modifica la zona inferior para acercar los pies durante la zancada.
La imagen de IA se usó como referencia del movimiento, no como material pegado.

Los seis PNG transparentes de 64 × 64 están en `frames/`. La carpeta
`vistas_previas/` incluye una comparación animada con la carrera de cuatro
fotogramas. La prueba es experimental y no sustituye los sprites del juego.

Para regenerarla se requieren Pillow, NumPy y scikit-image 0.26 o posterior:

```text
python -B assets/auriana/experimentos/investigacion_correr_derecha/scikit_image/crear_prueba.py
```
