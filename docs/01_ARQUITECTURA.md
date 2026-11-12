# 01 | Arquitectura y comportamiento del runtime

## Stack y arranque

JavaScript ES modules + JSDoc, Phaser 3.90.0 y Vite 8. Mantener la rama elegida;
Phaser 3.90 existe y tiene documentación versionada [S2, S3]. No mezclar ejemplos 4.x.
El renderizador se fija en Canvas 2D mediante `config.stack.renderer`; no se elige
por detección de GPU. El perfil de los nuevos entornos mostró variación excesiva
en WebGL por software y Canvas conservó el dibujo con menor coste. Los frames
recortados, transparencias y bloques de terreno usan las APIs existentes de Phaser.
Node 22.12.0 o superior compatible con Vite 8 [S4]. Usar npm; instalar con save-exact,
generar package-lock.json y versionarlo. La revisión de parche de Vite se resuelve
**una vez al inicializar** dentro de la rama 8 y queda fijada en el lockfile; este
paquete no finge incluir un lockfile ya resuelto ni una instalación probada.

```sh
npm install --save-exact phaser@3.90.0
npm install --save-dev --save-exact vite@8
```

No ejecutar create-vite encima de archivos existentes ni sobrescribir documentos.
Un index.html, CSS, src/main.js y vite.config.js bastan para arrancar.
`base: './'`; datos JSON importados en build. Los assets del manifest viven en
public/assets y se resuelven con BASE_URL, no con /assets absoluto [S5].

## Módulos y responsabilidad

```text
src/main.js                    arranque, disposición general y detección de errores
src/config.js                  importa JSON, valida y expone contratos
src/core/flow.js                estados, progreso y exclusión de transiciones
src/core/storage.js             guardado validado + fallback en memoria
src/core/input.js               teclado/pointer -> acciones; liberación de entradas
src/core/audio.js               una pista, mute y ciclo de vida; SFX pendientes
src/game/player.js              reglas de salto y selección de animación
src/game/level.js               colliders, meta, checkpoint y limpieza del mapa
src/game/environment.js         atlas real, fondos y terreno compuesto una vez por mapa
src/scenes/BootScene.js         carga y validación de recursos
src/scenes/PlayScene.js         adapta el estado a Phaser, reutilizada cinco veces
src/scenes/EndingScene.js       reencuentro, luz, corazón y dedicatoria
src/ui/ui.js                    pantallas DOM, foco, HUD y controles
src/styles.css                 variables y responsive
```

Es una distribución objetivo, no motivo para crear clases vacías. Se permite separar
un archivo que se vuelva difícil de mantener, no crear docenas de wrappers.
La sesión y el gestor de entrada pertenecen a la aplicación y se comparten entre
escenas. PlayScene sustituye el contenido del mapa y conserva el cuerpo de Auriana
durante una partida; cada mapa posee sus superficies, bordes, marcadores y collider.

Datos serializables fuera de escenas. Posición y velocidad pertenecen exclusivamente
al Body de Arcade; no mantener una segunda simulación que pueda desincronizarse.

## Estado de sesión y transiciones

Estado mínimo: mode, resumeMode, levelIndex (0–4), checkpointId (0/1), completed,
facing, transitionLocked. El reloj de reglas `activeMs` solo avanza en PLAYING.
Se pueden usar callbacks directos entre flow/ui/scene; no hace falta un bus genérico.

| Desde | Suceso | Hacia | Efectos |
|---|---|---|---|
| BOOT | carga válida | TITLE | sin audio, recuperar progreso |
| BOOT | error fatal | ERROR | no destruir progreso |
| TITLE | empezar/continuar | PLAYING | limpiar entrada, spawn seguro, desbloquear sonido |
| PLAYING | caída | RESPAWNING | una sola solicitud; no incrementar nivel |
| RESPAWNING | termina fundido | PLAYING | reset físico en checkpoint |
| PLAYING | meta de 1–4 | TRANSITION | bloquear meta e input, guardar siguiente nivel cp0 |
| TRANSITION | mapa nuevo listo | PLAYING | soltar controles y restaurar colisiones |
| PLAYING | meta 5 | ENDING | desactivar física de juego; cambiar escena |
| estado activo | pausa/foco perdido | PAUSED | recordar origen, suspender escena y audio |
| PAUSED | reanudar | origen | reset de entrada; no recargar mapa |
| PAUSED | reiniciar paso | PLAYING | cp0 del nivel actual; mismo audio |
| PAUSED | confirmar ir al final | ENDING | escena final normal, no salto de índice inválido |
| ENDING | mostrar dedicatoria | FINISHED | guardar completed=true |
| FINISHED | volver a jugar | PLAYING | nivel0/cp0, completed=false |
| ERROR | volver a intentar | BOOT | recargar página; conservar save |

Pausa por foco/orientación solo en PLAYING, RESPAWNING, TRANSITION o ENDING.
TITLE/FINISHED se quedan donde están; FINISHED pausa su audio al ocultarse y lo retoma
solo tras una nueva acción. Una pausa ya abierta no se apila sobre otra.
Al salir de la pausa por «Volver al inicio» detener la escena activa y su secuencia.

Usar reloj, timers y tweens de escena suspendibles, no setTimeout para progreso/respawn/final.
EndingScene avanza por el reloj PRE_UPDATE de la propia escena: walk 700 ms, settle
250 ms, light 300 ms, heart 600 ms y dedication 250 ms (2100 ms derivados de config).
Pausar suspende fase y opacidad DOM; el token impide callbacks o guardados tras cancelar.
Ambos sprites permanecen visibles; no se carga un PNG de abrazo. Toda finalización
lleva guard de estado y transitionLocked; solo un avance por meta.
La UI nunca cambia levelIndex por su cuenta. Aceptar una meta intermedia fija y
guarda el siguiente nivel cp0 antes del fundido; reiniciar o recargar durante esa
transición utiliza ese destino lógico. El índice del mapa visible se mantiene
separado mientras termina el fundido de salida.

El paso a EndingScene se ejecuta en PRE_STEP del Game, fuera del paso físico:
un callback cancelable valida el token y el estado antes de detener escenas.
Volver al inicio o empezar otra partida cancela el callback completo, de modo que
ninguna orden de parada antigua pueda destruir una escena nueva.

## Integración física

Arcade con fixedStep=true, fps=60 y gravedad del JSON [S3]. Sprite a escala 1,
origin=(0.5,62/64), body.setSize(18,36,false), body.setOffset(23,26) [S6].
No cambiar tamaño al cambiar frame. Restituir offset si alguna utilidad lo altera.
El cuerpo termina en y=62 del frame, exactamente en el ancla de pies.

Suelo: rectángulos estáticos con coordenadas de esquina superior izquierda en JSON.
Al crear zonas estáticas invisibles usar (x+width/2,y+height/2); sincronizar
el cuerpo estático tras configurar posición y tamaño. Nada de resize por frame.
Colisiones sólidas por los cuatro lados. Sin one-way ni colisiones por el pelo.
Límites horizontales activos; inferior y superior desactivados. El diseño evita
salirse por arriba. Activar un suelo invisible al fondo es un bug.

Antes de resolver movimiento leer acciones; después del paso físico comprobar, en
este orden: caída, checkpoint, meta. Si se dispara caída no evaluar meta ese tick.
Considerar grounded solo por contacto inferior real con una superficie del nivel.
No considerar el borde de mundo ni una pared como apoyo.

Cámara x = clamp(round(playerFeetX - 176), 0, width - 480); y=0. Sin lerp,
zoom o shake. Esta elección elimina un sistema de seguimiento adicional.

## Salto sin dobles activaciones

Mantener lastGroundedAt, jumpPressedAt, jumpConsumed, y una bandera de nueva pulsación.
Saltar cuando existe pulsación no consumida dentro de 120 ms y hay contacto inferior
o se dejó el borde hace <=100 ms sin haber saltado desde ese apoyo.
Al saltar: vy=-255, consumir pulsación, invalidar coyote y marcar jumpConsumed.
Rearmar elegibilidad de apoyo al aterrizar realmente. No actualizar grounded a partir
de banderas obsoletas del tick del despegue. Salir caminando permite coyote;
salir saltando no concede un segundo salto.
Pulsar antes de aterrizar conserva buffer. Mantener pulsado nunca lo renueva.
Pausa, respawn, transición y reinicio limpian timestamps y entradas pendientes.

## Teclado y multitáctil

Acciones: moveLeft, moveRight, jumpPressed, pausePressed. Mapeo central:
A/flecha izquierda; D/flecha derecha; Espacio/W/flecha arriba; Esc pausa.
Ignorar keydown.repeat para salto/pausa. No capturar Espacio/flechas sobre botones,
inputs, links o dentro de un diálogo: deben conservar su función accesible.
Prevenir scroll por teclas solo mientras el área de juego tiene foco y está PLAYING.
Al comenzar, foco al contenedor jugable con tabindex=0 y descripción breve.

Táctil mediante Pointer Events [S7]. Map< pointerId, action >, no una sola bandera
`isTouching`. pointerdown captura ese puntero; pointerup, pointercancel y
lostpointercapture liberan su acción. Dos dedos: mantener derecha y pulsar salto.
En pointerdown táctil de controles jugables, evitar el click sintético y conservar
el foco del contenedor de juego; no aplicar este tratamiento a menús/dialogos.
Los botones siguen disponibles por Tab. A/D, flechas y las teclas de salto se usan
con foco en el área jugable. Un control enfocado también admite mantener Espacio
o Enter para su propia acción, dentro del mismo estado agregado. Al pasar de ese
control al área jugable por un gesto táctil se conserva su tecla hasta keyup;
salir por Tab, blur o pausa limpia la acción correspondiente. No activar salto
una segunda vez desde un evento click.
No registrar simultáneamente touch y mouse: produciría acciones duplicadas.
Combinar fuentes por OR; soltar teclado no libera un botón táctil aún pulsado.
Izquierda + derecha = movimiento cero. No disparar salto sintético por click posterior.

Blur, visibilitychange y pausa vacían todos los controles. Tras reanudar exigir
soltar antes de una nueva pulsación; una tecla de reanudar no debe causar un salto.
Touch-action:none solo en controles/área jugable; no desactivar scroll de la dedicatoria.

La disposición táctil horizontal reutiliza los mismos botones en dos carriles
laterales. El cambio de modo limpia las fuentes antes de reubicar nodos y restaura
el foco después; no recrea escena, cuerpo o listeners. El layout mide el ancho
central y descuenta del viewport el contenido exterior a la fila completa del
escenario, para que la altura mínima de los carriles no lo reduzca iterativamente.
En este modo usa FIT exacto. La distribución normal conserva la regla de escala
entera. El desmontaje restaura los padres DOM sin programar otro callback de layout.

## Guardado y restauración

Dos claves: las de data/config.json. Forma exacta del progreso:
```json
{"version":1,"levelIndex":0,"checkpointId":0,"completed":false}
```
Preferencias: {version:1, muted:false, reducedEffects:false}. El valor inicial de
reducedEffects se toma de prefers-reduced-motion cuando aún no hay preferencia guardada.
No guardar posición exacta, velocidades, mode, audioTime ni instancias de Phaser.

Validar tipos, rangos y version===1; ignorar campos adicionales. Un checkpointId=1
usa el checkpoint del nivel, nunca un x leído del almacenamiento. completed=true
normaliza levelIndex=4/checkpointId=1. Datos incompatibles empiezan una sesión nueva.
Guardar al empezar, activar checkpoint, entrar al siguiente nivel, reiniciar y acabar.
No escribir cada frame. Un fallo se captura y se usa memoria; el runtime no se bloquea
si localStorage no está disponible [S8]. No borrar preferencias al volver a jugar.

## Limpieza, seguridad y límites

Destruir colliders, cuerpos, listeners, marcadores y tweens del mapa al abandonarlo.
Los listeners DOM se registran una vez y se retiran con AbortController o cleanup.
Audio no se recrea por nivel. Animaciones globales se registran una vez por key.
Destruir el Game al desmontar/HMR para no duplicar canvas, audio o input.
El controlador crea una sola instancia de `music.main` después del arranque válido;
no inicia en TITLE, conserva la posición en pausa y solo reanuda por gesto explícito.
El manager no se auto-pausa con blur: la aplicación controla la suspensión, incluso
en FINISHED. Una pista ausente o bloqueada oculta/activa el botón según disponibilidad,
sin detener Boot ni el reencuentro. Actualmente el mute cubre la música; faltan los SFX.
No insertar texto de almacenamiento con innerHTML; usar textContent.

Presupuestos de diseño: una pista simultánea, sin partículas en el entorno, hasta 32 adornos,
nueve superficies por mapa como máximo, render 480×270. Evitar allocs grandes en update.
El objetivo son 60 FPS en escritorio y 30 FPS estables en móvil; se debe medir,
no atribuirlo a estas decisiones sin probar. No usar shaders de glow ni luces dinámicas.
