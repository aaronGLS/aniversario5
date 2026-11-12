# 06 | Implementación y pruebas de aceptación

## Método

Un flujo de trabajo, seis fases con criterios de salida. No trabajar primero en
todos los adornos ni esperar a tener los dibujos para comprobar los saltos.
Actualizar ESTADO.md al acabar cada fase. No prometer una duración de implementación:
la rapidez viene del alcance, la reutilización y no reconstruir decisiones.

### Fase 1 - Base y un recorrido
Leer ESPECIFICACION + arquitectura + niveles. Inicializar proyecto sin borrar el kit.
Importar datos, crear Boot/Play, un suelo, body y controles de teclado. Implementar
salto fijo, coyote, buffer, límites, caída y un checkpoint. Usar rectángulos provisionales.
**Salida:** paso 1 se termina; paso 2 permite caer, reaparecer y volver a saltar.

### Fase 2 - Cinco mapas y estados
Reutilizar PlayScene; crear los cinco layouts de JSON, metas protegidas y fundidos.
Pausa, reinicio, progreso local, restauración y atajo al final. Crear EndingScene
provisional. **Salida:** recorrido inicio->cinco pasos->final->reinicio funciona.
No construir cinco clases casi iguales ni cinco copias de la UI.

### Fase 3 - UI y móvil
Aplicar docs/04 y todos los textos del JSON. Pointer Events simultáneos, foco,
orientación, safe area, menús y preferencias de efectos. **Salida:** partida posible
con dos dedos y en vertical; ninguna tecla/puntero queda presionada al pausar.

### Fase 4 - Arte y final
Las secuencias del ZIP aportado por el usuario (4 reposo, 8 carrera, 9 salto)
se integran conservando los originales anteriores, siguiendo docs/03. No se produce
un PNG de abrazo: Aarón usa los ocho cuadros `west` de su ZIP a 150 ms/cuadro en el
quinto paso y el reencuentro. La escena final mantiene ambos sprites visibles frente a
frente, crea un halo y corazón pixelados en runtime, y revela la dedicatoria. El timeline
de config dura 2100 ms (walk/settle/light/heart/dedication). Integrar el entorno local y
la UI coordinada, shader-free, con los cinco mapas ampliados descritos en docs/02.
**Salida:** coherencia a tamaño real, reencuentro, mensaje y ciclo de carrera revisado.

### Fase 5 - Audio y recuperación
Parcial: una pista local, mute persistente, bloqueo/reintento, pausa por foco y carga
fallida están implementados; los tres SFX siguen pendientes. **Salida:** el sonido nunca
bloquea el flujo ni se duplica al cambiar nivel. La revisión manual de escucha y las
pruebas de navegador aún deben completar esta fase.

### Fase 6 - Pruebas, build y entrega
Ejecutar pruebas unitarias, validación de recursos, build y navegador. Corregir primero
bloqueos, input y final; luego recortes de UI y legibilidad. No dedicar esta fase a
agregar features. Registrar capturas, consola, red y lo no comprobado.

## Comandos implementados

El proyecto ya implementa los siguientes scripts. Los resultados de ejecución
pertenecen a docs/ESTADO.md:

| Script npm | Contrato |
|---|---|
| dev | vite; sustitutos permitidos en modo development. |
| test | node --test; pruebas de lógica pura. |
| check:design | node scripts/validar-diseno.mjs. |
| check:assets | node scripts/validar-diseno.mjs --release. |
| build:prototype | vite build --mode prototype; etiqueta de desarrollo visible. |
| build | npm run check:assets && npm test && vite build. |
| preview | vite preview --host 127.0.0.1. |

`build:prototype` permite verificar la web sin arte. `build` falla si falta cualquier
recurso obligatorio o no está marcado revisado. No retirar el gate para ocultar pendientes.
El chequeo de PNG valida estructura/medidas, no demuestra semejanza ni calidad de animación.
MCP/browser disponible: usarlo para playtest. Si no, Playwright puede ser una dependencia
solo de desarrollo, fijada y documentada. No inventar herramientas ni duplicar runners.

## Pruebas unitarias mínimas

Node test runner, sin instalar un framework de unidades. Extraer funciones sencillas,
no introducir una física propia solo para que sean testeables.

- U01: solo existen cinco niveles con ids 1–5 y metas consistentes.
- U02: spawn/checkpoint/meta sobre superficies válidas; valores numéricos finitos.
- U03: avance de nivel no duplica al llamar dos veces al mismo suceso.
- U04: caída vuelve a cp0/cp1 sin modificar el nivel.
- U05: save corrupto, versión incompatible, rangos/tipos incorrectos se descartan.
- U06: localStorage.getItem/setItem lanzando excepciones no bloquea la sesión.
- U07: suma de entradas: soltar una fuente no suelta otra; izquierda+derecha=0.
- U08: salto por flanco; mantener no repite; la pulsación se consume una vez.
- U09: buffer y coyote aceptan dentro de margen y rechazan fuera; no doble salto.
- U10: pause/respawn/reinicio limpian entrada; no se aplica una pulsación vieja.
- U11: transiciones permitidas; una finalización vieja no cambia un estado nuevo.
- U12: rutas bajo base relativa; un asset ready=false no se solicita.

## Matriz de navegador (obligatoria para declarar acabado)

| ID | Acción | Resultado esperado |
|---|---|---|
| B01 | Abrir sin interacción | Inicio completo, ningún sonido. |
| B02 | Empezar con teclado | Foco en juego; no salta por la tecla del botón. |
| B03 | A/D, flechas; ambas a la vez | Movimiento correcto; ambas detienen. |
| B04 | Mantener salto al caer | Un solo salto; no bunny hop. |
| B05 | Saltar justo antes de tocar suelo | Buffer ejecuta un solo salto al aterrizar. |
| B06 | Saltar apenas después del borde | Coyote funciona, sin doble salto. |
| B07 | Recorrer los cinco niveles | Todas las metas alcanzables, una transición por nivel. |
| B08 | Tocar lateral de un bloque | No atravesarlo ni escalar automáticamente. |
| B09 | Volver hacia la izquierda | No salir del mapa; animación reflejada sin flor. |
| B10 | Caer antes del checkpoint | Volver al spawn del mismo nivel con velocidad cero. |
| B11 | Caer después del checkpoint | Volver al descanso correcto; nivel 3 y=192. |
| B12 | Cruzar checkpoint en el aire | No activarlo hasta apoyarse en su superficie. |
| B13 | Pasar sobre meta sin apoyo | No avanzar a otro nivel volando. |
| B14 | Mantener derecha al cambiar nivel | No arrastrar pulsación al nuevo mapa. |
| B15 | Pausar en salto | Todo se detiene; reanudar conserva posición. |
| B16 | Pausar durante respawn/transición | Secuencia se suspende, luego termina una vez. |
| B17 | Ocultar pestaña / perder foco | Juego/audio pausados; no reanudar automáticamente. |
| B18 | Cancelar pointer fuera del botón | No queda movimiento atascado. |
| B19 | Dos dedos: dirección + salto | Salta sin soltar la dirección. |
| B20 | Alternar touch y teclado | Estados combinados correctos, sin dobles eventos. |
| B21 | Girar móvil durante salto | Pausa; mismo mapa y cuerpo al reanudar. |
| B22 | Probar los seis viewports | HUD/controles no tapan juego, acciones visibles. |
| B23 | 200% zoom / ancho 320 | UI accesible con scroll, no botones recortados. |
| B24 | Tab/Esc en pausa/confirmación | Foco contenido; cancelar vuelve al menú correcto. |
| B25 | Reducir efectos | Sin parallax/partículas; jugabilidad igual. |
| B26 | Recargar en mitad del nivel | Continuar desde checkpoint guardado, no desde x arbitrario. |
| B27 | JSON guardado inválido | Inicio limpio, sin crash. |
| B28 | Bloquear localStorage | Partida completa posible, sin prometer persistencia. |
| B29 | Reiniciar paso / nueva partida | Reset de alcance correcto, preferencias conservadas. |
| B30 | Mute, desmute, nivel siguiente | Una sola pista; mute afecta también SFX. |
| B31 | Bloquear autoplay o faltar MP3 | Juego y reencuentro siguen; aviso no bloqueante. |
| B32 | Escuchar dos loops | Sin silencio/click evidente ni picos molestos. |
| B33 | Ver carrera a tamaño real y 4x | Ocho cuadros del ZIP, sin flor; 3->4 y 7->0 continuos. |
| B34 | Idle -> Run -> Air -> Idle | Origen y ancla y=62 estables, collider no cambia. |
| B35 | Llegar a Aarón | Acercamiento y ambos sprites visibles hasta el final; no control accidental. |
| B36 | Pausar/ocultar durante final | No se pierde ni se duplica la dedicatoria. |
| B37 | Ir al final desde pausa | Confirmar/cancelar correctos; encuentro completo sin saltos. |
| B38 | Final en móvil horizontal | Ambos personajes visibles; texto y replay alcanzables con scroll. |
| B39 | Recargar tras completar | Ver encuentro o iniciar otra partida; no nivel 6. |
| B40 | Reiniciar diez veces | Un canvas/gestor audio; listeners y objetos no se multiplican. |
| B41 | Build servido en subcarpeta | Ningún asset busca /assets en raíz incorrecta. |
| B42 | Inspeccionar red/consola | Sin errores, 404, trackers, fuentes remotas o CDN. |
| B43 | Build final sin un PNG requerido | El chequeo falla; no se publica un placeholder. |
| B44 | Archivo PNG correcto pero diseño incorrecto | Revisión visual lo rechaza aunque pase estructura. |

Las pruebas visuales de escritorio y touch emulado no equivalen a un móvil físico.
Mínimo automatizable: Chromium y Firefox en escritorio + emulación touch. Safari/iOS
y Android físico se registran solo cuando se prueben; no prometer todos los navegadores.

## Evidencias y criterio de listo

Guardar en qa/ (no public): 01-inicio-desktop, 02-nivel3-portrait,
03-nivel4-landscape, 04-pausa-foco, 05-reencuentro-mobile; captura de consola/red si falla.
Registrar navegador, viewport, acción y resultado. Capturas sin una partida completa
no demuestran que los cinco niveles funcionen.

Listo para regalar = todos los recursos obligatorios revisados + tests/build sin errores + recorrido
real + responsive + foco/audio/guardado probados + sin placeholders + sin bloqueos.
Si falta arte o navegador, entregar prototipo y un inventario honesto. Nunca escribir
«todo probado» porque el validador de datos salió con código 0.
