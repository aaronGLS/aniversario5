---
name: sprites-python
description: Dibuja, redibuja, retoca y anima sprites pixel art con Python local. Úsala para dibujos desde cero, recreaciones guiadas por referencias, fotogramas, ciclos y hojas de sprites del proyecto.
---

# Sprites con Python

Usa bibliotecas gratuitas de Python ejecutadas localmente para este flujo; no
dependas de servicios de generación ni de editores externos salvo que el usuario
cambie esa preferencia. Atiende las dimensiones, el estilo y el alcance que pida
para cada trabajo. Para Auriana, lee [sus referencias y convenciones](references/auriana.md).
Para instalación, ejemplos y comandos existentes, consulta
[recetas de Python](references/recetas-python.md).

Para crear un personaje o mejorar la fidelidad de un redibujo, lee
[dibujo por regiones y referencias](references/dibujo-pixel-art.md). Allí se
distinguen el calco de una estructura existente, el diseño desde cero y la
conversión automática; no requieren el mismo trabajo ni acreditan las mismas habilidades.

## Flujo de trabajo

1. Inspecciona los sprites y referencias pertinentes antes de dibujar. Identifica
   dirección, tamaño, proporciones, paleta, punto de apoyo, accesorios, poses y
   destino de los archivos. Conserva los activos existentes y trabaja en una
   carpeta de prueba cuando la mejora sea subjetiva o experimental.
2. Diseña poses legibles a resolución nativa. Para ciclos, revisa los extremos,
   apoyos, transiciones, brazos y cabello; añade fotogramas solo si representan
   movimiento útil. Más cuadros o una deformación automática no garantizan una
   animación mejor. Una referencia generada puede orientar el movimiento sin ser
   adecuada para usarla directamente como sprite.
3. Utiliza **Pillow** para dibujar a resolución nativa mediante regiones,
   máscaras, curvas con puntos de control y retoques por coordenadas; también
   para componer capas, manejar alfa y exportar PNG y vistas previas.
   Pillow y la biblioteca estándar bastan para ese flujo. Usa **NumPy** y **scikit-image** cuando
   una malla con puntos de control ayude a ajustar una pose. Ancla los rasgos
   que deban permanecer estables y usa muestreo de vecino más cercano; después
   corrige los bordes y las articulaciones que lo necesiten.
4. Usa **OpenCV** de forma opcional para estimar movimiento o analizar bordes.
   El flujo óptico no dibuja poses por sí solo y puede deformar el rostro o las
   extremidades. Una biblioteca de pixelización, como `proper-pixel-art`, puede
   ayudar con una referencia grande, pero no corrige la anatomía ni asegura el
   tamaño final. No presentes esos procesos como mejoras artísticas automáticas.
5. Compara cada cuadro con la referencia y con sus vecinos. Revisa cara, cuello,
   silueta, manos, piernas, zapatos, accesorios y continuidad de los contornos;
   corrige píxel a píxel si hace falta. Cuando el usuario acepte el aspecto
   general y pida ajustes locales, conserva una base y limita los cambios a
   esas regiones. Inspecciona tanto el tamaño nativo como
   una ampliación con vecino más cercano, y reproduce el ciclo si es posible.
   Si solo puedes revisar cuadros estáticos, dilo al evaluar el movimiento.
6. Verifica el tamaño, el modo y la transparencia acordados; comprueba que no se
   recorten partes y que la vista previa represente los fotogramas y tiempos
   elegidos. Guarda los PNG de producción, las pruebas y las vistas previas en
   sus carpetas correspondientes. Promueve un cambio cuando aporte la mejora
   buscada; informa con precisión qué se redibujó, transformó o reutilizó.

No impongas una cantidad de colores, fotogramas o un tamaño global a todos los
sprites. Una paleta compartida, la duración de cada cuadro y la cantidad de poses
son decisiones visuales; comprueba que realmente mejoren el resultado.
