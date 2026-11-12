# Dibujo pixel art por regiones y referencias

## Elegir el método

| Encargo | Enfoque |
|---|---|
| Rehacer una pose existente conservando su parecido | Alinear la referencia, medir sus rasgos y redibujar sus regiones; calcar el alfa puede fijar la silueta. |
| Crear otra pose o dirección | Usar la referencia para identidad y proporciones, pero construir una silueta apropiada para la pose nueva. |
| Dibujar sin referencia | Diseñar primero silueta, proporciones y pose; después construir regiones y detalles. |
| Pixelizar automáticamente una imagen | Tratar la salida como conversión o borrador; no presentarla como redibujo manual. |

No rehagas un personaje entero como filas de texto por defecto. Las matrices
sirven para guardar píxeles y resolver detalles, pero no sustituyen el trabajo
de medir formas y revisar su parecido. Tampoco hace falta colocar uno a uno
todos los píxeles: los rellenos y las curvas son útiles si puedes corregirlos
a resolución nativa.

## Redibujo con referencia

1. **Separar identidad, pose y estilo.** Identifica qué imagen manda para cada
   cosa. Una imagen adjunta puede mostrar una pose distinta de la finalmente
   solicitada. Un frontal puede orientar paleta y acabado sin aportar la anatomía
   del perfil; no pegues su cara sobre un cuerpo incompatible.
2. **Fijar la geometría antes de detallar.** Alinea la referencia en la cuadrícula
   de destino. Anota posiciones y tamaños de ojo, oreja, mentón, cuello, hombros,
   mano, cintura, tobillo y puntera. Revisa también huecos entre mechones y
   extremidades. Usa una superposición o guía con coordenadas para detectar
   desplazamientos; no te fíes solo de la memoria visual.
3. **Elegir qué reutilizar.** Para la misma pose, un alfa existente puede actuar
   como máscara de recorte y conservar exactamente encuadre, silueta y huecos.
   Declara ese calco. Si el contorno también está mal o la pose cambia, trázalo
   de nuevo: conservar el alfa en esos casos conservaría el problema.
4. **Construir regiones a tamaño nativo.** Separa cabello, piel, ojo, ropa y
   zapatos en máscaras o capas. Elige colores por material y función —base,
   sombra, luz, contorno—, aprovechando una paleta aprobada cuando exista.
   `ImageDraw.polygon`, `line` y `point`, más `PixelAccess`, bastan para este
   trabajo. No uses el RGB de una reducción automática como redibujo sin decirlo.
5. **Trazar curvas y grupos de color.** Sitúa puntos de control sobre los
   mechones o pliegues observados; rasteriza las curvas en coordenadas enteras,
   sin suavizado automático, y limpia sus escalones después. Construye masas
   de luz y sombra que expliquen el volumen. Evita franjas de sombra que solo
   rodean el contorno, escalones irregulares y puntos dispersos sin función.
   Un brillo del ojo o un detalle pequeño sí puede necesitar un píxel aislado.
6. **Corregir localmente.** Ajusta cara, uniones, puños, cordones y suelas con
   parches pequeños. Mantén una base de la versión aceptada si el usuario pide
   retocar solo ciertas partes; comprueba qué píxeles cambian fuera de ellas.
   No rediseñes el resto del personaje aprovechando ese retoque.

La resolución nativa es el lugar de construcción; una ampliación con vecino
más cercano es una ayuda de inspección. Dibujar grande y reducir, eliminar
colores o aplicar dithering no resuelve por sí solo una cara o silueta incorrecta.

## Dibujo desde cero

Las regiones, curvas, máscaras y parches también funcionan sin referencia.
Lo que falta entonces es la estructura que se podía calcar o medir. Empieza
por una silueta y formas grandes que definan pose, proporciones y apoyos; evalúa
su lectura a tamaño real antes de invertir en ojos, texturas o cordones.
Después añade colores por material, volumen y detalles.

Este proceso sigue exigiendo decisiones de diseño y anatomía. Un buen resultado
guiado por una imagen no demuestra la misma calidad al inventar un personaje.
No prometas esa equivalencia ni impongas la silueta de otra pose para evitar
resolver el dibujo nuevo.

## Evaluar el resultado

- Compara referencia y dibujo a igual encuadre, a tamaño nativo y ampliado.
  Incluye un fondo claro y otro oscuro cuando ayuden a detectar contornos o halos.
  Mira cara, cuello, continuidad de brazos, unión con tobillos, separación de
  zapatos y grosor aparente; el formato PNG no evalúa esas cosas.
- Para investigar si un método ayuda, puede servir una comparación entre
  referencia, intento anterior, resultado nuevo y un control automático de
  cuantización sin dithering. Identifica el control como tal. No hace falta
  generarlo en cada retoque ni afirmar que el dibujo gana en todas las medidas.
- La intersección/unión de siluetas y las posiciones de rasgos ayudan a detectar
  desplazamientos. Si se reutiliza el alfa, una silueta idéntica es una condición
  construida, no una prueba de fidelidad interior o habilidad artística.
- Si estimas regiones por color, usa un criterio equivalente para todas las
  imágenes y declara su sensibilidad al sombreado. Un umbral puede excluir
  tonos lavanda distintos del mismo suéter; revisa la máscara antes de interpretar
  su centro. Conserva también el juicio visual, incluso si contradice una métrica.
- Verifica tamaño, RGBA, alfa, márgenes y ampliación exacta según el encargo.
  No confundas aprobar un fotograma con probar una animación o su integración.

## Explicar cómo se hizo

Distingue qué se reutilizó, calcó, convirtió y redibujó. Si el programa rellena
polígonos y rasteriza curvas diseñadas por ti, descríbelo como dibujo programado
o redibujo guiado con retoques por píxel. No afirmes que todos los puntos se
colocaron individualmente a mano. Si se conserva el alfa pero se reconstruyen
los interiores, explica ambas partes; no lo presentes como creación desde cero.

## Ejemplo probado en este proyecto

El lateral de Auriana mejoró cuando se conservó el alfa del reposo derecho y
se reconstruyeron los interiores con la paleta del frontal. El usuario aceptó
el resultado después de pedir retoques únicamente de suéter y zapatos; estos
alteraron 124 píxeles y conservaron el resto de la base guiada. Es evidencia
de ese caso estático, no una garantía para poses nuevas, otros personajes o animación.

- [Implementación con Pillow y biblioteca estándar](../../../../assets/auriana/experimentos/redibujo_guiado_reposo_derecha/dibujar.py).
- [Informe con procedencia, evaluación y limitaciones](../../../../assets/auriana/experimentos/redibujo_guiado_reposo_derecha/INFORME.md).
- [Mediciones y control comparativo](../../../../assets/auriana/experimentos/redibujo_guiado_reposo_derecha/mediciones.json).

Consulta la implementación para adaptar el método; sus coordenadas, máscaras,
paleta, anclas y hashes pertenecen a esa pose. No ejecutes el generador ni copies
sus números a otra tarea solo por leer esta referencia. Los 64×64 y los 23 colores
del ejemplo no son requisitos universales de la técnica.

Fuentes: [Cure: trazado, grupos de píxeles y limpieza](https://pixeljoint.com/forum/forum_posts.asp?TID=11299),
[Derek Yu: contornos, curvas y volumen](https://derekyu.com/makegames/pixelart.html),
[Pillow: herramientas de dibujo](https://pillow.readthedocs.io/en/stable/reference/ImageDraw.html),
[scikit-image: curvas y máscaras opcionales](https://scikit-image.org/docs/stable/api/skimage.draw.html).
