# Especificación cerrada | A cinco pasos de ti

**Diseño base 2.0.1, ampliado con los escenarios y la interfaz aprobados por el usuario.**
Documento de producto, no certificación de entrega.
Sustituye las recomendaciones ambiguas de la versión anterior.

## 1. Objetivo, audiencia y límites

Auriana juega con su personaje pixel art y atraviesa cinco caminos cortos para
reencontrarse con Aarón. El regalo se basa en jugar y llegar al encuentro, no en leer
capítulos, coleccionar notas o desarrollar un jardín. Una partida tiene como objetivo
**3–5 minutos para una primera visita**, no una duración garantizada. Un jugador que
conozca los saltos podrá hacerlo en menos. No alargarlo con esperas artificiales.

Plataformas: navegadores de escritorio y móviles. Horizontal recomendado, vertical
funcional. Sitio estático servido por HTTP(S), sin cuenta ni servicios remotos durante
la partida. No prometer instalación offline, PWA ni abrir index.html con doble clic.
No hay fecha impresa o bloqueo de apertura: no deducir la fecha del quinto mesiversario.

Prioridades: flujo completo > controles fiables > identidad de Auriana > final
romántico > decoración. La rapidez se consigue reduciendo contenido, no omitiendo
recuperación ante caídas, errores de entrada o audio bloqueado.

## 2. Alcance exacto

| Sistema | Decisión |
|---|---|
| Jugabilidad | Izquierda, derecha, un salto de altura fija. |
| Personajes | Auriana controlable; Aarón espera al final. |
| Niveles | Cinco mapas de 3072 px con una escena reutilizada. |
| Plataformas | Rectángulos sólidos estáticos; no atravesables desde abajo. |
| Dificultad | Huecos de 32 o 40 px; subidas de 16 px por salto. |
| Fallo | Caer bajo y=320; volver al checkpoint del nivel. |
| Progreso | Un checkpoint intermedio por nivel y guardado local. |
| Ayudas | Coyote time 100 ms y buffer de salto 120 ms, obligatorios. |
| Pausa | Manual, pérdida de foco, pestaña oculta y cambio de orientación. |
| Atajo accesible | «Ir directamente al final» desde Pausa, con confirmación. |
| Final | Reencuentro breve, ambos personajes frente a frente, luz, corazón y dedicatoria. |
| Música | Una pista local cozy instrumental; sin voz. |
| Efectos | Tres tonos breves: salto, fin de paso y reencuentro. |
| Arte | Cinco PNG de personajes; entornos reales de Ansimuz, atlas local, portada y tipografía pixel local. |

Quedan fuera: enemigos, combate, vidas, cronómetro, puntuación, monedas, compras,
inventario, secretos, quizzes, puertas, interruptores, plataformas móviles,
doble salto, dash, salto variable, sprint separado, multijugador, gamepad, selector
de skins, editor de mapas, narrativa extensa, voz, descargas del recuerdo,
fullscreen, cuentas, métricas, notificaciones y service worker.

## 3. Flujo completo

1. Carga real de recursos y configuración, sin audio automático. Si faltan recursos,
   desarrollo usa sustitutos identificados; una entrega final debe llevar los reales.
2. Inicio con título, subtítulo y acción principal. Si existe progreso válido,
   se ofrece continuar. Si está completado, se ofrece ver el encuentro otra vez.
3. Al comenzar/continuar se intenta desbloquear el audio dentro del gesto del usuario;
   el juego no espera a que el sonido funcione.
4. Auriana se mueve, salta, activa el checkpoint al pisarlo y alcanza la luz de llegada.
5. En los pasos 1–4 se bloquea la entrada, funde 150+150 ms y se carga el siguiente mapa.
6. En el paso 5, llegar a x=2912 **sobre suelo** inicia el final; Aarón se ve a x=2992.
7. La escena final acerca a Auriana a Aarón; ambos permanecen visibles frente a frente.
   Una luz pixelada y un corazón acompañan la dedicatoria. Se guarda la finalización
   al terminar de revelarla.
8. El mensaje permanece sin límite. «Volver a jugar» inicia desde el primer paso
   y conserva las preferencias de sonido y efectos.

El progreso aumenta una sola vez por llegada. No se puede terminar un nivel volando
sobre el marcador o desde el menú. No se encadenan llegadas por una tecla sostenida.

## 4. Movimiento y colisiones

Datos canónicos: `data/config.json` y `data/levels.json`.
Resolución lógica 480×270; gravedad 650 px/s², velocidad 145 px/s e impulso -255 px/s.
No multiplicar setVelocity por delta: la velocidad del motor ya está en unidades/segundo.
Cuerpo 18×36 px, independiente del volumen del cabello; pies en el ancla (32,62)
de cada celda 64×64. Sin escala dinámica del cuerpo ni ajuste por cada animación.

Al soltar dirección, velocidad horizontal cero. Al pulsar izquierda y derecha a la
vez, cero. El salto exige una nueva pulsación; sostenerlo no provoca saltos repetidos.
La altura no depende de mantener la tecla. Coyote y buffer usan tiempo activo de
juego, no el reloj de la pestaña. Los detalles están en docs/01.

Se puede volver a la izquierda dentro del mapa, pero no regresar al nivel anterior.
La cámara solo se mueve horizontalmente, con coordenada redondeada, sin zoom ni sacudidas.
Nunca activar la colisión con el borde inferior del mundo: impediría caer y reaparecer.

## 5. Niveles y reintentos

| Paso | Identidad | Reto |
|---|---|---|
| 1. El primer paso | Azul/lavanda | Tres escalones de 16 px con suelo continuo. |
| 2. Sin miedo a saltar | Lavanda | Cuatro huecos de 32 px. |
| 3. Cada vez más cerca | Violeta | Subir y bajar en cinco superficies anchas. |
| 4. Aunque el camino cambie | Rosa/violeta | Ocho huecos de 40 px, con pequeños desniveles. |
| 5. Hasta encontrarte | Rosa cálido | Dos huecos fáciles y llegada a Aarón. |

Un checkpoint por nivel se activa al estar apoyada en su plataforma y cruzar su x.
No requiere un botón. Reaparecer dura 320 ms normales; con efectos reducidos es
inmediato. Reinicia velocidad, buffer, estado de salto y entradas; no reinicia música.
No hay pantalla de derrota, contador de caídas ni sonido de castigo.
Pausa permite reiniciar ese paso o ir directamente al final. No hay desbloqueos secretos.

## 6. Contrato artístico

La referencia individual `referencias/auriana-derecha-sin-flor.png` manda sobre
las hojas antiguas. **No lleva flor.** La izquierda es un reflejo horizontal del
mismo set; no se necesitan otros tres juegos de animaciones. No se usan las vistas
frontal o trasera durante la partida.

Por petición del usuario del 11 de noviembre de 2026, Auriana usa las secuencias
del ZIP `assets/Una_adorable_chica_chibi_en.zip`: cuatro cuadros de reposo a 400 ms,
ocho de carrera a 70 ms y nueve de salto a 85 ms (una reproducción al entrar en aire).
Se conservan los frames y PNG anteriores, con su configuración en
`assets/auriana/animaciones-anteriores.json`. La izquierda refleja el perfil `east`
sin flor; las variantes `west` con flor quedan archivadas. El origen
es (0.5,62/64) y el cuerpo se mantiene fijo. No se exige animación de aterrizaje, de
muerte ni de celebrar. Por petición posterior del usuario se integra para Aarón
el ZIP `assets/Un_adorable_chico_chibi_en.zip`: ocho cuadros de reposo `west`,
150 ms por cuadro, mirando hacia Auriana. Usa una tira con celdas de 64×64,
ancla (32,62) y escala fija 1, sin movimiento ni cuerpo físico.
El final no dibuja ni simula un abrazo: conserva los dos sprites existentes frente a
frente y crea la luz y el corazón en runtime. Las especificaciones están en docs/03.

Aarón se define como personaje ficcional chibi de pelo castaño corto, sudadera azul
noche, pantalón gris oscuro y zapatillas crema/lavanda. Es una decisión artística
para cerrar producción; no una afirmación sobre su aspecto real.

## 7. UI, texto y sonido

Menús y texto en HTML/CSS con Pixelify Sans local, paneles pixel en verde bosque,
acentos lavanda y crema, foco visible, botones reales y contraste alto.
HUD y controles fuera del canvas: nunca tapar plataformas o los pies. Interfaz breve,
sin paneles permanentes en el centro. La pantalla final puede desplazarse verticalmente
para que la dedicatoria no cubra el reencuentro en móviles pequeños.

El texto exacto está en `data/texts.es.json`. El final usa:

> Feliz quinto mesiversario, mi vida. Espero y sigamos cumpliendo más.
> Si tuviera que recorrer este camino mil veces, lo haría para llegar a ti.
> Te amo.
> — Aarón

No incluir fecha ni apodo deducido. Sin voz, narrador ni botón «Escuchar mi mensaje».
Una pista local y tres SFX generados. La pista integrada dura 164.82 segundos y usa
128 kbps estéreo; su fuente y transformación se registran en
`assets/audio/sources.json`, sin confirmar autoría o licencia. El botón de sonido está
en el inicio, la pausa y la dedicatoria. Mute persiste; los tres SFX siguen pendientes.
Pausa y pestaña oculta silencian y detienen la reproducción; volver no reanuda
automáticamente. Un fallo de sonido nunca bloquea el juego ni el reencuentro.

## 8. Estados, privacidad y fallos

Estados: BOOT, TITLE, PLAYING, PAUSED, RESPAWNING, TRANSITION, ENDING, FINISHED, ERROR.
La pausa conserva el estado del que procede; pausa tanto la física como las animaciones
activas. No se dejan temporizadores nativos que avancen una transición oculta.

Guardado local con versión: nivel, checkpoint y finalización. Nunca contraseñas,
ubicación ni identificadores personales. Lectura/escritura dentro de try/catch.
Datos corruptos se descartan sin impedir empezar. No sincronización entre dispositivos.

Errores de assets artísticos en desarrollo: sustituto visible y registro; antes de
publicar, bloqueo de verificación. Audio fallido en runtime: modo silencioso. Datos
inválidos o motor no inicializable: pantalla de error con «Volver a intentar».
No bucles de reintento ni peticiones continuas a rutas ausentes.

## 9. Hecho, pendiente y criterio de entrega

El diseño y los contratos están decididos. Las fases 1, 2, 3 y el reencuentro de fase 4
están implementados: cinco mapas con teclado y multitáctil, interfaz responsive,
preferencias de efectos, estados, pausa, progreso y final con personajes, luz, corazón
y dedicatoria. La validación móvil utiliza emulación.
Los tres recursos de Auriana se integran desde el ZIP aportado, conservando los
originales anteriores. La pista musical está integrada, con ciclo de vida, mute y
fallback sin bloqueo; los tres SFX y la QA de audio/navegador siguen pendientes. No se
requiere un PNG de abrazo. Aarón idle se integra desde el ZIP aportado, tanto en el
quinto paso como en el acercamiento final.
Los recursos de escenario están descargados en el repositorio e integrados en cinco
recorridos ampliados. La interfaz exterior comparte su dirección pixel art. Los resultados de pruebas
realmente ejecutadas se registran en docs/ESTADO.md; el prototipo no certifica
la entrega definitiva.

La versión final pasa el recorrido completo con teclado y multitáctil, conserva
progreso, no deja controles atascados, carga desde una subcarpeta, no altera a Auriana,
no tiene errores de consola y presenta a ambos personajes y la dedicatoria sin taparlos. Consulte la matriz de
pruebas: una comprobación de JSON no demuestra que estas condiciones se cumplan.
