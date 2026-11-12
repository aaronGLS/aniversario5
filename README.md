# A cinco pasos de ti

Prototipo con **fases 1–3 y escenarios/UI de fase 4** del regalo web para Auriana, basado en el diseño cerrado
2.0.1. Permite recorrer los cinco pasos con teclado o dos dedos, guardar checkpoints, pausar,
continuar una partida y llegar al reencuentro final con Aarón. Ambos personajes
permanecen visibles frente a frente mientras aparecen una luz, un corazón y la
dedicatoria. También permite ir directamente al final desde la pausa y volver a jugar.

Auriana usa las animaciones del ZIP aportado: cuatro cuadros de reposo, ocho de
carrera y nueve de salto, sin flor y reflejada a la izquierda. Las animaciones
anteriores se conservan, con sus rutas y tiempos en
`assets/auriana/animaciones-anteriores.json`. El aviso de desarrollo permanece visible.
Aarón usa los ocho cuadros de reposo hacia la izquierda de
`assets/Un_adorable_chico_chibi_en.zip`, a 150 ms por cuadro, en el quinto paso y
el acercamiento final. Se conservan los 25 archivos originales extraídos.
La música local ya está integrada como una sola pista MP3 de 164.82 segundos;
su procedencia y transformación están en `assets/audio/sources.json`.
Los escenarios usan recursos reales gratuitos de Ansimuz, descargados en este
repositorio, con cinco recorridos de 3072 píxeles.
La interfaz comparte su dirección pixel art: Pixelify Sans local, bosque, lavanda y crema.
El reencuentro está implementado; no usa un PNG de abrazo. La interfaz
responsive y el multitáctil están implementados. El botón de sonido está disponible
en el inicio, la pausa y la dedicatoria; tres efectos de sonido y la revisión manual
de escucha siguen pendientes. Todavía no es una entrega final para regalar.

## Subir a GitHub

El repositorio conserva código, datos, pruebas, recursos y licencias. `.gitignore`
excluye dependencias instaladas, compilaciones, entornos locales y los reportes de
`qa/`, que se generan al ejecutar las verificaciones. La cobertura comprobada queda
registrada en `docs/ESTADO.md`. Los recursos originales conservan sus bytes mediante
`.gitattributes`.

El flujo `.github/workflows/deploy-pages.yml` compila y publica el juego al subir
cambios a `main`; también admite ejecución manual en Actions. Usa Node 22,
`npm ci` y `npm run build:pages`, que valida los recursos y genera `dist/` en modo
producción sin ejecutar la batería completa de pruebas.

En GitHub, selecciona **Settings → Pages → Source → GitHub Actions** una vez.
Después sube los cambios con `git push` y consulta la ejecución en **Actions**.
El enlace esperado de este repositorio es https://aarongls.github.io/aniversario5/.
La base relativa de Vite permite cargar los recursos desde esa subcarpeta.

Si todavía no existe el remoto, sustituye `URL_DEL_REPOSITORIO`:

```sh
git remote add origin URL_DEL_REPOSITORIO
git push -u origin main
```

## Ejecutar

Requiere Node **22.12.0 o superior** y npm. Dependencias exactas: Phaser **3.90.0**,
Vite **8.3.7** y Playwright **1.65.0**, este último solo para desarrollo.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Abrir la dirección que imprime Vite. Pulsar «Empezar nuestro camino» para dar foco
al juego. A/D o flechas para moverse; espacio, W o flecha arriba para saltar.
Mantener salto no lo repite; ambas direcciones detienen el movimiento.
En pantallas táctiles, mantén una flecha y pulsa Saltar con otro dedo. Los controles
aparecen al detectar entrada táctil o un puntero grueso. También puedes enfocarlos
con Tab y mantener Espacio o Enter para activar su acción. La partida funciona en
vertical; en horizontal el juego ajusta su tamaño al espacio disponible.
En móviles horizontales de poca altura, el escenario ocupa el centro y los controles
quedan a ambos lados. La ayuda larga pasa a la pausa, conservando botones de 56 px
y salto de 88×56. La vista lógica, el personaje y la física conservan sus tamaños y parámetros.
Esc o «Pausa» suspenden el juego. Perder foco, ocultar la pestaña o cambiar la
orientación también pausa; vuelve con «Seguir jugando». Las teclas sostenidas no
se arrastran al reanudar o cambiar de mapa.
La pausa incluye «Reducir efectos decorativos». La preferencia guardada prevalece
sobre el valor inicial del sistema. Al activarla durante un fundido o el final
pausados, la secuencia se completa una sola vez al reanudar. No cambia la física.

El progreso local usa `acinco5.save.v1`: nivel, checkpoint y finalización, sin guardar
posiciones exactas. Un dato inválido permite empezar de nuevo. Si el almacenamiento
falla, la sesión sigue en memoria mientras la página permanezca abierta. Reiniciar
este paso vuelve a su spawn; empezar desde el principio reinicia todo el recorrido.
Ambas acciones conservan las preferencias. Una meta aceptada ya guarda el siguiente
nivel, incluso si se recarga durante el fundido.

Para volver a empaquetar los frames del ZIP extraído de Auriana, prepara Python local
con Pillow 13.0.0 en el entorno ignorado `.venv-sprites` y ejecuta:

```sh
py -3.12 -m venv .venv-sprites
# PowerShell / Windows
.\.venv-sprites\Scripts\python.exe -m pip install -r scripts/requirements-sprites.txt
.\.venv-sprites\Scripts\python.exe -B scripts/exportar-auriana.py
.\.venv-sprites\Scripts\python.exe -B scripts/exportar-auriana.py --check
# Aaron: mismo exportador, sin reescribir los PNG de Auriana
.\.venv-sprites\Scripts\python.exe -B scripts/exportar-auriana.py --character aaron
.\.venv-sprites\Scripts\python.exe -B scripts/exportar-auriana.py --character aaron --check
```

`--check` compara los píxeles exportados con sus fuentes y no escribe archivos.

`npm install` inicializó las dependencias y generó el lockfile incluido;
`npm ci` reproduce esa instalación. No abrir el HTML mediante doble clic o
`file://`: se necesita un servidor HTTP. No se usan CDN ni servicios remotos
durante la partida.

## Recursos de escenario y fuente

Los originales y sus hashes están en `assets/vendor/environment/` y `assets/vendor/fonts/`.
Las imágenes de SunnyLand, SunnyLand Woods y Tall Forest son CC0; Pixelify Sans utiliza
OFL 1.1. Los manifests fijan URL y revisión. No se copian personajes, audio o código de los
proyectos de origen. La fuente y su licencia se sirven localmente.

```sh
node scripts/descargar-entorno.mjs --check
.\.venv-sprites\Scripts\python.exe scripts/preparar-entorno.py --check
```

Para reproducir, ejecutar ambos sin `--check`: el primero descarga los trece archivos
fijados; el segundo compone el atlas de 31 frames, la portada y copia la fuente/licencia.
Los originales permanecen intactos. Los comandos de comprobación y el build no necesitan
descargar recursos. La partida solo pide archivos al mismo servidor.

## Builds

```sh
npm run build:prototype
npm run preview
```

El prototipo genera `dist/` con rutas relativas y el aviso de desarrollo.
Referencias, documentos, experimentos artísticos y capturas QA no se publican.

```sh
npm run check:assets
npm run build
```

El build **final** conserva el bloqueo por recursos obligatorios ausentes o sin
revisar. El inventario actual pasa la validación de recursos; eso no certifica
los SFX ni la QA final. No cambiar `ready` para ocultar pendientes. El build final
ejecuta validación de recursos, pruebas unitarias y Vite, en ese orden.

## Pruebas

```sh
npm test
npm run check:design
npx playwright install chromium firefox
npm run build:prototype
npm run test:browser
```

Las unidades usan `node --test`; el validador de diseño comprueba JSON y documentos,
no ejecuta el juego. La instalación de navegadores se hace una vez por versión.

Playwright abre su propio preview en `127.0.0.1:4173/regalo/`: dejar ese puerto libre.
Prueba Chromium y Firefox con teclado y añade un proyecto Chromium táctil.
Los contactos simultáneos se envían mediante CDP y generan Pointer Events del
navegador; los recorridos no teletransportan al personaje.
Comprueba movimiento, escalón, metas y checkpoints con apoyo, coyote, buffer,
caídas y rutas; rechaza errores de consola o red. El diagnóstico de solo lectura
solo se expone en desarrollo y prototipo.

La suite cubre los cinco mapas con entrada real, saltos en ambos sentidos en los
mapas nuevos, pausa en salto y secuencias, cancelaciones, foco, orientación,
continuación, almacenamiento bloqueado, final y replay. Los eventos blur/visibilidad
se simulan explícitamente en headless; no equivalen a una prueba manual de pestaña.
La detección de un primer touch en escritorio también tiene una prueba sintética
identificada. Las pruebas móviles usan emulación, sin acreditar Android físico,
iPhone o Safari. El reflow del 200 % se emula con viewport reducido y DPR doble;
los safe areas se prueban con el override del navegador.

También existen casos de estabilidad de recursos y perfiles de rendimiento.
La integración de música dispone de pruebas propias en `test/unit/audio.test.js`,
`test/browser/audio.spec.js` y `test/browser/phase3-touch-audio.spec.js`.
Los reportes y capturas de `qa/` son salidas locales regenerables y están excluidos
de Git. `docs/ESTADO.md` conserva los resultados realmente ejecutados;
no equivalen a una verificación en móvil físico ni a una escucha manual.
El diagnóstico de nuevos fallos genera captura, consola/red y estado de solo
lectura; la suite desactiva tracing para no retrasar la entrada de los saltos.

## Rendimiento y siguientes fases

Un solo juego Phaser y tres escenas: Boot, Play y Ending. Play reemplaza los mapas
y reutiliza el cuerpo de Auriana dentro de una partida. Arcade es la única física:
un cuerpo dinámico, entre tres y nueve superficies estáticas y un collider. Reaparecer
no reconstruye el mapa. Boot carga los tres assets de Auriana y el atlas de entorno;
registra tres animaciones globales una sola vez (reposo, carrera y salto). Los fondos repiten imágenes del atlas
y el terreno se compone una vez en tres bloques de hasta 1024×80.
El DOM cambia por sucesos. La resolución lógica
es 480×270, sin multiplicarla por DPR.
El renderizado usa Canvas 2D, fijado en los datos tras comparar su coste con
WebGL por software; se mantienen las mismas escenas, imágenes y física Arcade.

El objetivo es 60 FPS en escritorio; las mediciones incluyen sus condiciones.
Vite conserva la advertencia por el bundle de Phaser: aproximadamente 1,27 MB
sin gzip y 339 kB con gzip. No se ha ocultado elevando el límite de aviso.
La UI solo cambia por eventos. El layout agrupa los cambios en un RAF pendiente;
no mide el DOM por frame ni modifica la resolución interna al rotar o cambiar DPR.
El entorno descarta el dibujado fuera de cámara con margen de un tile y actualiza
esa selección cada 16 px de desplazamiento. Las bandas ocultas de los fondos se
recortan conservando su ancla y verificando equivalencia de píxeles.
La vista horizontal táctil usa FIT exacto para aprovechar el espacio entre los
controles, manteniendo el resto de las distribuciones y sus reglas de escala.

`AGENTS.md` guía la lectura del diseño. Los JSON de `data/` son canónicos;
`ESPECIFICACION.md` fija el producto y `docs/06_PLAN_Y_PRUEBAS.md` sus seis fases.
Los originales de `referencias/` y trabajos existentes de `assets/` se conservan.

La fase 4 integra el reencuentro con ambos sprites visibles, el entorno real y
la dirección visual exterior. La fase 5 está parcial: pista, mute y ciclo de vida
están implementados y probados en navegador; faltan los tres SFX y la escucha manual.
La QA final de fase 6 sigue pendiente. No se ha publicado el sitio.
