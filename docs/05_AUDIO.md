# 05 | Música y efectos de sonido

## Una sola pista

Archivo: `public/assets/audio/camino.mp3`, key `music.main`. Una sola música para
los cinco niveles y el final; no sincronizar compases con plataformas ni crear
cinco canciones. No hay letra, voz, texto a voz ni grabación personal en esta versión.

Dirección cerrada: cozy pop instrumental con electrónica suave, 92 BPM, métrica 4/4,
piano eléctrico cálido, acentos discretos de marimba, pad suave, bajo redondo,
shaker ligero. Melodía sencilla de cinco notas, cariñosa y algo juguetona; no triste,
no épica, no infantil de circo, sin impactos fuertes ni gran subida de volumen.

El diseño original calculaba 32 compases, aproximadamente 83.48 segundos a 92 BPM.
La pista aportada que se integra dura 164.821338 segundos; se conserva completa, sin
recorte. El derivado web es MP3 estéreo 44.1 kHz, 128 kbps y 2,638,201 bytes.
Medición del derivado: -18.45 LUFS integrados y -3.24 dBTP. Se retiraron portada y
metadatos del derivado. `assets/audio/sources.json` registra hashes, transformación y
procedencia; autoría y licencia no están confirmadas. No se afirma que el inicio y final
formen un loop perfecto: la unión y la escucha siguen pendientes de revisión manual.

### Prompt de producción

> Cozy pop instrumental con electronica chill suave, piano electrico calido,
> acentos sutiles de marimba, pads suaves, bajo redondo, shaker y percusion ligera.
> Sonido limpio, tierno y acogedor; melodia memorable de cinco notas. 92 BPM, 4/4,
> 32 compases, energia suave y estable, sensacion de bucle continuo. Sin voces,
> sin letra, sin introduccion larga, sin climax fuerte ni final abrupto.

La herramienta de producción puede no obedecer compases/loop con exactitud. Ajustar
el archivo una vez antes de integrarlo. No introducir un generador musical runtime
para compensar una exportación mal terminada. No se necesita una IA conectada al juego.
Solo usar audio propio o con permiso de uso; registrar su procedencia.

## Tres SFX sin archivos externos

Usar el contexto Web Audio del gestor de sonido cuando exista, sin crear otro
AudioContext por escena. Si el backend solo dispone de audio HTML, omitir estos
SFX; la música sigue funcionando. No hacer fallar el juego por este fallback.

| Efecto | Forma | Frecuencias y tiempo | Trigger |
|---|---|---|---|
| Salto | Seno | 440 a 660 Hz, 90 ms | Solo al consumir un salto real. |
| Paso completado | Triangular suave | 523.25 y 659.25 Hz secuenciales, 90 ms cada nota | Una vez por meta 1–4. |
| Reencuentro | Seno | 523.25, 659.25, 783.99 Hz, acorde 350 ms | Al terminar de revelar la dedicatoria. |

Envolvente: ataque 8 ms, release 35 ms (80 ms en reencuentro), sin clipping; limpiar
oscillator y GainNode al acabar. No mantener osciladores infinitos silenciados.
Sin pasos, sonido de caída, aterrizaje, botones, alarmas ni aplausos adicionales.
SFX gain maestro 0.10; música 0.25. El gain no es una garantía de volumen percibido.
La música implementada baja a 0.18 en 200 ms al terminar la dedicatoria.

## Desbloqueo, mute y ciclo de vida

Los navegadores pueden bloquear reproducción automática [S9]. Intentar desbloquear
el gestor dentro de la acción Empezar/Continuar/Ver reencuentro. No hacer await de otras
tareas antes de ese intento. La música solo se reproduce si no está muted.
Si está bloqueada, permitir activar sonido con otra interacción; no repetir intentos
cada frame ni registrar error de autoplay como fallo fatal de partida.

Estados de audio separados del juego: loading, ready, blocked, unavailable. La UI
refleja disponibilidad real. En esta entrega parcial el botón controla la música; los
tres SFX siguen pendientes. Si no hay una fuente disponible, ocultar el botón y mostrar
un aviso discreto una vez.

No emitir sonido en TITLE. Al entrar a jugar iniciar la pista; transiciones, caídas
y checkpoints no la reinician. Pausa conserva posición. Reanudar solo con acción
del usuario. Volver al inicio detiene la pista; una partida nueva empieza desde cero.
FINISHED mantiene el bucle bajo a 0.18. Al ocultar la pestaña, suspenderlo; una nueva
interacción explícita en la pantalla final lo puede reanudar si no está muted.
Silenciar persiste; la auto-pausa no cambia la preferencia guardada de muted.

## Carga y falta de archivo

`ready:false` en manifest: no solicitar esa ruta, no crear un elemento audio con un
src vacío. `ready:true` carga una vez; si hay 404/decodificación fallida, registrar y
degradar a silencio, sin impedir el final.
No se debe describir una pista ausente como entregada: el release requiere el MP3
válido, aunque el runtime tenga un fallback robusto.

## Pruebas de escucha

Reproducir dos bucles seguidos; comprobar la unión y que no aparezca silencio.
Probar comenzar con mute, desmutear, pausar, cambiar pestaña, volver, reanudar,
completar nivel y volver a jugar. No debe haber dos pistas superpuestas.
Repetir con archivo ausente y contexto bloqueado. Verificar en Firefox y en un
navegador móvil disponible. No afirmar verificación auditiva tras mirar solo una waveform.
