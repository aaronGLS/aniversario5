# 04 | Interfaz, pantallas, responsive y accesibilidad

## Dirección visual

El mundo y la interfaz comparten una dirección pixel art de naturaleza romántica.
HTML/CSS mantiene la accesibilidad y usa Pixelify Sans local (OFL 1.1), sin solicitudes
a Google Fonts durante la partida. La portada se compone con los mismos recursos del
juego. Paneles verde bosque, texto crema, acento lavanda y foco dorado; bordes de píxel
y botones con relieve discreto. No hay animación decorativa constante ni paneles
permanentes sobre el personaje.

Colores canónicos en config: fondo #172522, panel #273832, texto #FFF2DD,
secundario #CCD7C7, botón #D9B3D3 con texto #302339, foco #F3CA83.
Fuente local: `public/assets/fonts/pixelify-sans.ttf`; se conserva su licencia OFL.

Texto UI 16 px, texto auxiliar mínimo 14 px solo donde no sea instrucción crítica;
título clamp(28px,5vw,44px); dedicatoria 18 px con line-height 1.55. Botones 16 px
semibold, altura >=48 px; controles de movimiento 56 px. Esquinas 2 px, gaps 12/16.
Foco visible 3 px con separación de 3 px. Contraste se comprueba, no se supone.

## Superficies exactas

| Pantalla | Contenido y acciones |
|---|---|
| Carga | Nombre + progreso de recursos real. Sin mensajes/porcentajes ficticios. |
| Inicio nuevo | Título, subtítulo, Empezar nuestro camino, ayuda breve, sonido. |
| Inicio con progreso | Continuar nuestro camino + Empezar desde el principio. |
| Inicio completado | Volver a ver nuestro encuentro + Empezar desde el principio. |
| Jugando | Paso N de 5 + cinco puntos, sonido, pausa, canvas y controles. |
| Pausa | Seguir jugando, Reiniciar este paso, Ir directamente al final, Volver al inicio; reducir efectos. |
| Confirmación | Una pregunta, una consecuencia, acción afirmativa y Cancelar. |
| Final | Auriana y Aarón visibles frente a frente, dedicatoria, firma, Volver a jugar y sonido. |
| Error fatal | Texto de error, Volver a intentar. Sin reset del progreso. |

Todos los textos y labels salen de `data/texts.es.json`; no escribir variantes en
HTML, CSS o escenas. Pantallas que no están activas usan hidden/inert y no reciben foco.
El encabezado HUD no muestra nombre del nivel permanentemente: el nombre se presenta
una vez 1200 ms en una banda de ayuda **fuera** del playfield. No limitar por tiempo
la lectura de la dedicatoria.

Pausa desde ENDING ofrece solo Seguir jugando y Volver al inicio; no reiniciar un
nivel inexistente. En RESPAWNING/TRANSITION suspende la secuencia, pero las acciones
Reiniciar paso/Ir directamente al final cancelan la secuencia antes de ejecutar la nueva acción.
FINISHED no necesita botón pausa. Sonido se controla donde exista alguna fuente disponible.

## Distribución responsive

Un solo DOM adaptable, no una versión de juego para móvil y otra para escritorio.
Canvas de 480x270 con relación 16:9; no modificar la física al rotar.
El esquema siguiente corresponde a escritorio y móvil vertical.

```text
[ Paso 2 de 5   o o . . .                Sonido   Pausa ]
[ ayuda / nombre temporal, sin superponerse al personaje ]
[                    CANVAS 16:9                       ]
[   Izquierda  Derecha                         Saltar  ]
```

HUD 48 px escritorio / 44 px táctil. La banda auxiliar reserva 24 px para evitar
saltos de layout cuando aparece texto. Controles táctiles debajo: banda 72 px,
izquierda/derecha 56x56 con gap 10; salto 88x56. No poner botones sobre plataformas.
En escritorio sin entrada táctil se oculta la banda de controles, dejando ayuda de teclado.
En equipos híbridos mostrarla si `any-pointer: coarse` o se ha recibido input touch.

Contenedor con padding 12 px y safe-area-inset. Medir espacio disponible y elegir
s=min(anchoDisponible/480, altoDisponible/270, 2). Aplicar al viewport visible,
no al tamaño interno del mundo. Si s>=1 y floor(s)/s >=0.80, usar floor(s) para escala entera; de lo contrario
usar exactamente s (FIT). Esta regla no queda a criterio de cada pantalla.
Por petición posterior del usuario, el móvil horizontal corto utiliza FIT exacto
en el área central, sin redondear hacia una escala entera que deje espacio sin usar.
Cuando s<1 se admite escala fraccional para móviles pequeños. Render pixelated y
nearest; no prometer que todos los píxeles tendrán igual ancho CSS con escala fraccional.
El canvas se centra con barras libres, nunca se estira a otra proporción.

Viewport de referencia: 1366x768, 1920x1080, 390x844, 844x390, 360x640, 640x360.
Soporte mínimo objetivo 320 px de ancho. Espacio insuficiente o zoom alto: permitir
scroll de la página, no reducir botones por debajo del tamaño fijado ni ocultar acciones.
Portrait sigue jugable con recomendación no bloqueante de girar; sin orientación forzada.
Usar 100dvh con fallback 100vh; reaccionar a resize sin reiniciar el nivel.
Un cambio entre vertical/horizontal pausa una vez. No pausar por cada ajuste de la
barra del navegador dentro de la misma orientación.

### Móvil horizontal con escenario grande

Con entrada táctil, ancho >=560 px y altura <=500 px en horizontal, el escenario
ocupa el centro. A su izquierda se sitúan paso/puntos y las dos direcciones de
56x56; a su derecha, pausa, aviso de desarrollo y salto de 88x56. Los carriles
miden 56 y 88 px, con gaps de 12 px. Ningún botón se superpone al canvas.

El nombre y los avisos breves quedan en una fila de 24 px debajo. La ayuda larga
está disponible en inicio y pausa; no reserva una banda alta durante esta partida.
El aviso de desarrollo conserva su texto completo en el carril derecho. En los
viewports de referencia sin insets adicionales, el escenario supera el 60 % del
ancho y alto del viewport y su área supera dos veces el área de los tres controles.

Se reutilizan los mismos nodos al girar, salir al inicio o entrar al final. Antes
de moverlos se limpia la entrada; después se conserva el foco de un control que
siga visible. Un cambio de distribución por resize no añade una pausa. La escena
final conserva su presentación de 42dvh y dedicatoria debajo.

## Final legible

El canvas del reencuentro conserva la relación 16:9 y queda limitado a 42dvh; el texto
va **debajo**, no encima de la pareja. Panel de dedicatoria max-width 560 px,
centrado. En horizontal de poca altura, la página permite scroll natural; nunca recorta
firma o botón. Cuerpo de mensaje completo, sin efecto de máquina de escribir.

Timeline en `data/config.json`: walk 700 ms, settle 250 ms, light 300 ms, heart
600 ms y dedication 250 ms; el total de 2100 ms se deriva de esas fases. Auriana
camina hasta x=220 mientras Aarón permanece en x=260; al llegar, ambos usan sus
loops normales de reposo y siguen visibles frente a frente. La luz y el corazón
se dibujan en runtime con las medidas y colores canónicos.

Con efectos reducidos, ambos personajes aparecen estáticos en sus posiciones finales,
con luz y corazón quietos y dedicatoria inmediata. Si la reducción se activa durante
una pausa, la secuencia termina al reanudar; desactivarla después no recupera las fases
omitidas. Pausa/pérdida de foco suspende la secuencia y su opacidad DOM sin duplicar
el mensaje o el guardado al volver.

## Teclado, foco y anuncios

Todos los controles son button con type=button. Iconos SVG decorativos aria-hidden;
labels de acción explícitos, no solo un símbolo de altavoz. El control de sonido
expone aria-pressed=muted y el label describe lo que hará la siguiente pulsación.

Dialogo de pausa: foco inicial Seguir jugando, Tab contenido dentro, Esc cierra;
restaurar foco al área jugable, sin volver a ejecutar la tecla que lo abrió.
Confirmaciones dentro del mismo contenedor reemplazan su contenido: no apilar
varios dialogos. Esc/Cancelar vuelve al menú anterior, no reanuda inesperadamente.
Confirmar reinicio completo solo si ya hay progreso; reiniciar este paso no requiere
segunda confirmación y no borra niveles anteriores del punto de continuación.

Canvas con aria-label y descripción del teclado. Región aria-live=polite anuncia
checkpoint y cambio de nivel, nunca la posición cada frame. Final enfoca su heading
con tabindex=-1. Mensajes de caída no bloqueantes, máximo una vez cada 3 segundos.

La UI accesible no convierte automáticamente un plataformas visual en un juego
jugable con lector de pantalla. El atajo al final garantiza acceso al mensaje
sin superar saltos; no declarar conformidad WCAG total sin auditoría.

## Movimiento reducido y feedback

Preferencia inicial del sistema y checkbox en pausa. Reducir efectos elimina
parallax, fundidos y partículas. El corazón del final queda fijo junto a la pareja.
Durante el reencuentro muestra los actores en su frame neutral sin animaciones.
No cambiar gravedad o velocidad por accesibilidad visual.
Feedback de botón: cambio de color/borde, sin grandes escalados. Pulsado táctil
se ve mientras ese pointer permanezca capturado; al cancelar se limpia.

## Integración de fase 3

El mismo estado agrega teclado, teclas de controles enfocados y punteros capturados.
Espacio/Enter en un botón de movimiento o salto activa su acción por flanco de tecla,
sin un manejador click adicional. Los menús conservan sus activaciones nativas.
La ayuda reserva su altura mediante una celda de grid invisible y aria-hidden;
cambiar entre nombre, ayuda y avisos no mueve el canvas.

El checkbox guarda la preferencia al cambiar, conservando mute y progreso. Activar
la reducción en una secuencia pausada completa su resultado al reanudar. Desactivar
no recupera efectos ya omitidos; el final encolado conserva la preferencia reducida
aceptada antes de crear su escena.

La escena final se dimensiona con el límite de 42dvh sin restar la dedicatoria;
el documento permite leer texto, firma y replay con scroll natural. La comprobación
móvil de esta fase utiliza emulación; el estado registra resultados y limitaciones.

Durante el acercamiento el panel final permanece vacío e inerte. La dedicatoria se
prepara con opacidad 0 e inerte, progresa con el reloj de escena y al revelarse habilita
el foco del encabezado y el botón de replay. La firma y el replay quedan debajo del
canvas con scroll natural; no hay una tarjeta de «abrazo pendiente».
