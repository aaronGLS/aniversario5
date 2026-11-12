# Estado del proyecto

## Configuración de GitHub Pages — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R3; STATUS: DONE_WITH_WARNINGS.

- Añadido `.github/workflows/deploy-pages.yml`: push a `main` y ejecución manual,
  Node 22, `npm ci`, validación de recursos y compilación de producción. Solo se
  sube `dist/`; publicar depende de compilar correctamente y requiere la rama `main`.
- La compilación dispone de lectura del código y la publicación de `pages:write`
  e `id-token:write`, en el entorno `github-pages`. Acciones fijadas por commit,
  checkout sin credenciales persistidas y publicaciones sin solaparse.
- Nuevo `npm run build:pages`, que conserva el gate de recursos y no ejecuta el
  banco completo. Los scripts anteriores, dependencias, lockfile, juego, recursos
  y base relativa de Vite permanecen sin cambios.
- Verificado: parser YAML y contratos del workflow PASS; `git diff --check` PASS;
  `npm run build:pages` PASS, incluidos 482 checks de recursos y el build de producción.
  Continúa el aviso habitual por el tamaño del bundle de Phaser.
- Prueba específica de Chromium sobre el build de producción en `/aniversario5/`:
  PASS. Inicio, canvas y pausa funcionan; música solicitada correctamente, sin
  errores de consola/red ni rutas fuera de la subcarpeta. La etiqueta de prototipo
  y la interfaz de diagnóstico no aparecen en producción.
- Revisión independiente de flujo, permisos, rama y artefacto: PASS, sin hallazgos.
  No se ejecutó el banco completo ni se afirma despliegue remoto completado.

Siguiente paso: subir el commit a GitHub, seleccionar **Settings → Pages → Source →
GitHub Actions** y comprobar la ejecución en Actions. README y docs/07 describen el
proceso. La escucha manual, los SFX y la QA final del juego siguen pendientes.

## Preparación de GitHub — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R1; STATUS: PARTIAL; EXPORT_READY: YES; CLEANUP: PARTIAL.

- Repositorio Git inicializado en `main`, con commit inicial local. El remoto queda
  por conectar; no se creó ningún otro proyecto ni se publicó el juego.
- `.gitignore` excluye dependencias, compilaciones, QA, entornos y cachés locales,
  configuración personal y archivos temporales. `.gitattributes` normaliza código y
  conserva exactamente los recursos originales, licencias y sus hashes.
- Se retiró `INFORME_VALIDACION.md`, informe estático inicial obsoleto. El control
  automático rechazó el borrado recursivo de `qa/` y `dist/` con «blocked by policy»,
  incluso usando rutas absolutas verificadas y `Remove-Item -LiteralPath`.
  Esas carpetas permanecen en disco, ignoradas y fuera del índice de Git.
- Verificaciones: `npm run check:assets` PASS; `git diff --cached --check` del cambio
  PASS. Auditoría del índice: 347 archivos, 52 rutas requeridas cubiertas, cero
  recursos ausentes, cero cambios de bytes en los recursos protegidos y cero
  archivos generados incluidos. Reglas de exclusión verificadas.
- Se conservaron las pruebas específicas del bloque de música: 20 unidades y 11
  casos distintos de navegador aprobados por bloques. No se repitió el banco completo.

Siguiente tarea para subir el repo: conectar `origin` y subir `main`, siguiendo README.
El borrado físico de las carpetas generadas requiere limpieza manual por el rechazo
del control automático. La escucha manual, los tres SFX y la QA final siguen pendientes.

## Música aportada e integración de audio — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R2; STATUS: DONE_WITH_WARNINGS; FEATURE_OUTCOME: IMPLEMENTED.
Se integró la pista aportada por el usuario como el único archivo de música web,
`public/assets/audio/camino.mp3`. El MP3 de origen medía 3,551,237 bytes y su SHA-256
histórico se conserva en `assets/audio/sources.json`; no se guardó una segunda copia.
La fuente aportada no confirma autoría ni licencia.

- Derivado: MP3, 44.1 kHz, estéreo, 128 kbps, 2,638,201 bytes, duración 164.821338 s;
  SHA-256 `154da7fee65ad033f03c4bdfccdcc09b6f1f0e065a428927f7feb90183049852`.
  FFmpeg 8.0.1 retiró portada y metadatos, aplicó -2.3 dB y no recortó la pista.
- El principal verificó stream único de audio, duración, decodificación completa y
  medición de -18.45 LUFS / -3.24 dBTP. La unión del loop no se ha escuchado ni
  certificado.
- `music.main` queda `ready:true`, `status:"integrated-imported"` y mantiene límite de
  3 MB. El control DOM se reutiliza en inicio, pausa y dedicatoria.
- `src/core/audio.js` mantiene una instancia Phaser, estado de bloqueo/disponibilidad,
  mute persistente, pausa con seek conservado, reintento explícito y fade final a 0.18.
  El audio ausente/bloqueado no impide iniciar ni completar el reencuentro. Los tres SFX
  siguen pendientes; fase 5 es parcial y fase 6 continúa pendiente.

Checks ejecutados:

- `node --test test/unit/audio.test.js test/unit/config.test.js test/unit/assets.test.js`:
  PASS, 20/20.
- `node --check` en módulos, tests unitarios y specs de audio modificados: PASS.
- `npm run check:assets`: PASS, 482 comprobaciones, cero fallos y avisos.
- `npm run build:prototype`: PASS, 25 módulos; persiste la advertencia habitual de
  bundle Phaser mayor de 500 kB.
- El principal comprobó que el MP3 de `dist` coincide en SHA-256 con el recurso público.
- Chromium: primera corrida 5 PASS / 1 FAIL con MP3 inválido. Se corrigió el procesador
  Web Audio de Boot para consumir la promesa de decodificación: el rechazo de Phaser
  queda manejado y el juego continúa en silencio. Tras reconstruir, se repitieron solo
  el caso fallido y la reproducción normal con señal RMS: 2 PASS.
- Firefox/touch: 4 PASS, 1 FAIL por distinto formato del error de consola esperado y
  4 omisiones de casos exclusivos de Chromium. Se corrigió únicamente ese formato
  de la fixture; se repitió el caso de decodificación de Firefox: 1 PASS. Los errores
  de página y las promesas sin manejar siguen fallando la auditoría.
- Resultado vigente por bloques: 11 casos distintos PASS, sin fallos pendientes ni
  flaky: seis Chromium, tres Firefox y dos touch (390x844 y 844x390).
  Incluye señal real, inicio silencioso, mute guardado, pausa/seek, continuidad entre
  niveles, caída/reinicio, final/fade/replay y fallos 404/MP3 inválido sin reintentos.
- Revisadas las capturas de pausa en escritorio, móvil vertical y horizontal. El
  botón de sonido permanece accesible; el diálogo corto permite desplazamiento.
  Blur/focus se simularon en headless. No se probó móvil físico ni escucha manual.
- Auditoría del alcance: sin cambios ajenos; configuración de física, mapas, entrada,
  progreso y recursos gráficos originales preservados. El build corresponde al código
  vigente. Reportes/capturas locales se excluyen de Git; esta entrada conserva
  los resultados y las limitaciones.

No se ejecutaron `npm test`, `npm run build`, una suite extensa ni revisión auditiva.
Siguiente tarea concreta del juego: revisar la escucha manual, completar SFX y ejecutar
QA final. La integración musical está terminada; no se declara listo para regalar.

## Dedicatoria actualizada — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R0; STATUS: DONE.
Encabezado actualizado en `data/texts.es.json` al texto exacto solicitado:
«Feliz quinto mesiversario, mi vida. Espero y sigamos cumpliendo más.»
Sincronizadas la cita de `ESPECIFICACION.md`, la expectativa del validador
y las comprobaciones existentes de navegador que buscaban la frase anterior.

Verificado: `node scripts/validar-diseno.mjs`, PASS, 481 comprobaciones.
Continúa el aviso previo por `music.main` pendiente.
`node --check` en `test/browser/helpers.js`, `phase2-states.spec.js` y
`phase2-journey.spec.js`: PASS. Revisión contra hashes previos: solo los
reemplazos previstos; resto del contenido y saltos de línea conservados.
El chequeo auxiliar de hashes requirió escapes Unicode por la codificación
de entrada de PowerShell; repetido con esa corrección, PASS.

No se ejecutaron el banco completo, compilación ni navegador para este cambio literal.
Pendientes previos: música/audio y QA de entrega.
Siguiente tarea concreta: integrar la pista musical cuando esté disponible.

## Reencuentro final — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R2; STATUS: DONE_WITH_WARNINGS; FEATURE_OUTCOME: IMPLEMENTED.
Se reemplazó el cierre provisional por el reencuentro aprobado. Implementación y
checks asignados pasaron; siguen pendientes música, audio y QA de entrega completa.

- `data/config.json` define el acercamiento (700 ms), reposo (250), luz (300),
  corazón (600) y revelado (250): 2100 ms derivados; no hay tiempos acumulados duplicados.
- `EndingScene` conserva a ambos sprites visibles frente a frente, genera y cachea
  `ending-halo`/`heart-8`, y usa PRE_UPDATE para fases, luz, corazón y opacidad de DOM.
  El guard de secuencia marca `completed` una sola vez al terminar la dedicatoria.
- Efectos reducidos presenta la pareja estática, la luz y el corazón fijos. Una preferencia
  reducida queda latched durante pausa; cancelar limpia escena, listeners y presentación.
- Se retiraron `couple.hug` y la tarjeta pendiente. Las reglas de release siguen basadas
  en `requiredForRelease`; el único recurso que falta ahora es `music.main`.
- Guardado versión 1, preferencias, mapas, control de entrada, física y recursos de
  personajes se preservan. No se implementó audio.
- `test/browser/reencuentro.spec.js` cubre checkpoint 5, fases pausadas, reducción,
  cancelación, atajo, replay y smoke Firefox; `test/browser/phase3-touch-reencuentro.spec.js`
  cubre retrato/paisaje táctil.
- Baseline previo: copias/hashes de 31 archivos en `qa/reencuentro-baseline/` y
  `qa/reencuentro-baseline-files.json`; `qa/reencuentro-protected-assets-sha256.json`
  y `qa/reencuentro-protected-assets-check.json` registran 214 imágenes/ZIP sin cambios.

Checks CHEAP ejecutados:

- `node --test test/unit/config.test.js test/unit/assets.test.js test/unit/levelFlow.test.js`:
  PASS, 18/18.
- `node scripts/validar-diseno.mjs`: PASS, 481 comprobaciones, sin fallos; aviso esperado
  por la música pendiente.
- `node scripts/validar-diseno.mjs --release`: rechazo esperado únicamente por
  `music.main` ausente; el gate no exige que falte ese ni ningún otro asset.
- `node --check` en `EndingScene.js`, `ui.js`, `main.js` y los specs focalizados:
  PASS. Hashes protegidos: 214 imágenes/ZIP comparados, cero cambios.
- `npm run build:prototype`: PASS, 24 módulos; permanece el aviso habitual por el
  bundle de Phaser mayor de 500 kB.
- `.venv-sprites/Scripts/python.exe -B scripts/exportar-auriana.py --check` y
  `.venv-sprites/Scripts/python.exe -B scripts/exportar-auriana.py --character aaron --check`:
  PASS, 21 y 8 frames.
  Integridad independiente: PASS, 240 recursos anteriores de Auriana y 25 originales
  de Aarón idénticos a sus fuentes/ZIP.

Playwright se ejecutó por bloques: Chromium tuvo 5 PASS y 2 fallos iniciales solo de
prueba; corregidos esos dos asserts, su rerun dio 2 PASS. Touch dio 2 PASS (portrait y
landscape con replay por tap) y Firefox dio 1 PASS smoke. Son 10 casos vigentes verificados
por bloques, no una corrida única 10/10. Los dos fallos iniciales quedan documentados en
`qa/reencuentro-chromium-results.json` y los reruns en
`qa/reencuentro-chromium-corrected-results.json`; uno comparaba 2099.9999999999995 como
igual exacto a 2100 y el otro llamaba al helper de fase con la firma anterior. Solo se
cambió el spec; no hubo cambios de producción por esos fallos. Los runners finales no
tuvieron skips, flaky ni errores; auditorías de consola, red y base `/regalo/` pasaron
en los diez casos vigentes.

Visto por el principal: escritorio 1280×800 y canvas 480×270; touch 390×844 y 844×390.
Pareja persistente, luz y corazón visibles, dedicatoria debajo del canvas. Capturas:
`qa/reencuentro-chromium-desktop.png`, `qa/reencuentro-chromium-desktop-canvas.png` y
`qa/reencuentro-touch-{portrait,landscape}.png`. No se probó en dispositivos físicos.

No se ejecutaron `npm test`, `npm run build` ni una suite amplia. El gate de release
sigue fallando solo por `music.main`; no se ha publicado ni se declara listo para regalar.
Siguiente tarea concreta: completar música/audio y después la QA final de entrega.

## Aarón del ZIP aportado — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R1; STATUS: DONE_WITH_WARNINGS.
Petición completada: descomprimir `assets/Un_adorable_chico_chibi_en.zip` y usar
sus recursos para Aarón. Verificación limitada al cambio por indicación del usuario.

- Documentado e implementado: 25 archivos extraídos sin modificar en
  `assets/Un_adorable_chico_chibi_en/`: 24 PNG y metadatos. Se conservan el ZIP,
  todas las rotaciones y ambas direcciones; solo se carga la secuencia `west`.
- `public/assets/sprites/aaron-idle-left.png`: ocho celdas RGBA de 64×64 en una
  tira 512×64, copiadas con ventana fija [10,10,64,64] sin recortar arte visible,
  escalar, recolorear ni realinear cuadros. Reposo a 150 ms/cuadro (1,2 s/ciclo),
  definido en `data/config.json`; el ZIP no aporta temporización.
- `src/game/aaron.js` registra una animación compartida y crea el sprite con
  ancla (32,62), escala 1 y sin cuerpo físico. Sustituye ambos rectángulos
  provisionales: quinto mapa y acercamiento final. La pausa suspende sus cuadros;
  el mapa/escena conserva la responsabilidad de destruirlo. No se modifica a Auriana.
- Manifest, configuración, exportador existente, validadores y documentación
  actualizados. El exportador admite `--character aaron`; sin ese argumento
  conserva su comportamiento para Auriana. Se ajustan las expectativas existentes
  de carga y de cuatro definiciones de animación; sus suites amplias no se ejecutan.

Comandos realmente ejecutados y evidencia:

- `.venv-sprites/Scripts/python.exe -B scripts/exportar-auriana.py --character aaron`
  y `--character aaron --check`: PASS, ocho cuadros, RGBA, alfa 0/255 y equivalencia
  exacta de píxeles con las fuentes tras retirar el margen transparente declarado.
- El mismo exportador con `--check` y sin selector: PASS, los 21 cuadros de Auriana.
  Comprobación local de integridad con Python/ZIP/SHA-256: PASS, 25 originales
  extraídos idénticos al ZIP y 240 recursos anteriores intactos. Informe en
  `qa/aaron-zip-integrity.json`; no hay repositorio Git en este directorio.
- `node --test test/unit/assets.test.js test/unit/config.test.js`: PASS, 6/6.
  No se ejecutó `npm test`, ni el banco completo de navegador.
- `npm run build:prototype`: PASS; persiste el aviso conocido del bundle de Phaser
  mayor de 500 kB. `node scripts/validar-diseno.mjs --release`: 483 comprobaciones,
  rechazo esperado exclusivamente por `couple.hug` y `music.main`; Aarón pasa.
  No se ejecutó `npm run build`, que incluye el banco completo y el gate de entrega.
- `playwright test test/browser/aaron.spec.js --project chromium --reporter list,json`
  con `PLAYWRIGHT_JSON_OUTPUT_FILE` y `--output` propios: PASS, un único caso
  específico, sin errores de consola, red ni rutas bajo `/regalo/`. Comprueba
  ausencia en el primer paso, aparición en el quinto, ocho cuadros y ciclo 7→0,
  pausa/reanudación, acercamiento final, ocultación al mostrar el final provisional
  y un replay sin sumar animaciones ni cuerpos físicos.
  Se repitió únicamente ese caso al cambiar la captura del acercamiento por los
  píxeles del canvas, para evitar que el diálogo DOM de pausa cubriera a la pareja.
  Ambas ejecuciones pasan; resultado revisado en `qa/aaron-zip-browser-reviewed-results.json`.

Visto en capturas reales de Chromium: tira original ampliada, Aarón junto a Auriana
en el quinto paso, viewports de escritorio 1280×800, vertical 390×844 y horizontal
844×390, acercamiento 480×270 y final provisional. Esta comprobación de viewports
no acredita dispositivos físicos ni añade pruebas de multitáctil, audio o FPS.
Capturas y logs de este bloque: `qa/aaron-zip-*`.

El cambio de Aarón queda documentado, implementado, probado específicamente y
visto en navegador. Siguen pendientes el PNG real del abrazo y la música/audio;
la fase 4 continúa parcial y no se declara entrega final. Siguiente tarea concreta:
incorporar un abrazo que conserve las identidades de ambos personajes.

## Animaciones del ZIP aportado — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R2; STATUS: DONE_WITH_WARNINGS.
Petición: descomprimir `assets/Una_adorable_chica_chibi_en.zip` y sustituir las
animaciones activas sin eliminar las anteriores.

- Documentado e implementado: 67 archivos extraídos sin modificar en
  `assets/Una_adorable_chica_chibi_en/`. Reposo de 4 cuadros, carrera de 8 y salto
  de 9, usando las secuencias `east` y su reflejo izquierdo sin flor. Las variantes
  `west` y rotaciones se conservan como originales y no se cargan.
- Nuevas tiras `public/assets/sprites/auriana-zip-{idle,run,air}-right.png`, de
  256×64, 512×64 y 576×64. Ventana fija por secuencia, sin escalado ni pérdida de
  píxeles visibles. Ancla (32,62), escala 1 y cuerpo Arcade 18×36 sin cambios.
- Tiempos en `data/config.json`: reposo 400 ms/cuadro, carrera 70 ms/cuadro
  (ciclo de 560 ms) y salto 85 ms/cuadro. El salto se reproduce una vez al entrar
  en aire, conserva su último cuadro si termina antes de aterrizar y se suspende
  con la pausa. No retrasa el impulso físico.
- Conservados: ZIP, frames anteriores, referencias, vistas previas y tres PNG
  públicos anteriores. `assets/auriana/animaciones-anteriores.json` registra sus
  entradas del manifest y sus tiempos. README, especificación y documentos de
  arte/pruebas describen ahora el set activo y distinguen el archivo anterior.
- Exportador y validadores actualizados, sin nuevas dependencias. Revisión
  independiente: PASS en píxeles, extracción, preservación de imágenes,
  transiciones, pausa/reaparición y geometría; sin modificaciones del revisor.

Comandos realmente ejecutados:

- `.venv-sprites/Scripts/python.exe -B scripts/exportar-auriana.py` y `--check`:
  PASS, 21 cuadros, RGBA y alfa binario, equivalencia de píxeles tras las ventanas
  transparentes declaradas. Las ventanas que corten arte visible se rechazan.
- `npm test`: PASS, 43/43. `node scripts/validar-diseno.mjs`: PASS,
  456 comprobaciones y solo los tres avisos de recursos pendientes ya existentes.
- `npm run build:prototype`: PASS; advertencia habitual de Vite por Phaser >500 kB.
- `npm run check:assets` y `npm run build`: rechazo esperado, 459 comprobaciones,
  exactamente Aarón idle, abrazo y música pendientes. No se retiró el gate.
- Playwright desde `qa/auriana-zip-run`, usando `../../playwright.config.js`,
  `--reporter list,json` y `PLAYWRIGHT_JSON_OUTPUT_FILE`: 8 casos específicos
  vigentes de Auriana verificados en Chromium/Firefox (6 conservados de
  `specific-results.json` y 2 de `specific-jump-corrected-results.json`). Se
  conserva el primer fallo de la prueba del segundo salto: la observación remota
  empezaba después del primer cuadro; se corrigió capturando antes de la entrada,
  sin modificar el juego.
- Regresión Playwright: PASS, 18/18 en `regression-results.json`, sin saltados,
  flaky ni errores del runner. Recorridos completos y replay con teclado en
  Chromium/Firefox y touch emulado vertical/horizontal, caída/reaparición,
  checkpoint/recarga, pausa de juego/final, giro, dos dedos y diez finales/replays.
  En total, 26 casos vigentes de navegador verificados por bloques; no es una
  única ejecución de 26. Auditorías de consola, red y base `/regalo/`: PASS.

Visto: tiras a tamaño nativo/ampliado, cuadros sin recortes, reposo, carrera en
ambos sentidos, salto, llegada al quinto paso, escritorio y móvil vertical/horizontal,
incluidas las pantallas finales provisionales.
Las capturas y resultados nuevos se guardan en `qa/auriana-zip-run/`, separados
de las evidencias históricas. El abrazo sigue siendo el sustituto identificado.

Integridad y cobertura quedan en `qa/auriana-zip-integrity.json` y
`qa/auriana-zip-verification-summary.json`. Ninguna imagen anterior se elimina
o sobrescribe; tampoco se modifica el ZIP ni sus 67 originales extraídos.

Este bloque queda documentado, implementado, probado automáticamente y visto
en navegador, sin trabajo pendiente de sustitución de animaciones. Siguiente
tarea concreta del proyecto: incorporar Aarón, abrazo y música definitivos y
completar el audio. QA final y dispositivos físicos/Safari siguen pendientes;
no se midieron de nuevo FPS ni se probó audio completo. No se publica ni se
declara entrega final.

## Skill sprites-python actualizada — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R1; STATUS: DONE.
Se documenta el método que produjo el redibujo aceptado, sin regenerar imágenes.

- `.agents/skills/sprites-python/SKILL.md` dirige al nuevo documento
  `references/dibujo-pixel-art.md`: referencia alineada, anclas, calco opcional
  del alfa, regiones, curvas, grupos de color y retoques limitados a lo solicitado.
- La guía distingue referencia de identidad, pose y estilo; diseño desde cero;
  conversión automática y redibujo. Explica procedencia y límites de las métricas.
  Enlaza implementación, informe y mediciones reales, sin universalizar las
  coordenadas, el tamaño o la cantidad de colores de Auriana.
- `references/auriana.md` incorpora el resultado aceptado y corrige la convención
  antigua de la flor: ambos perfiles laterales del juego van sin flor.
  `references/recetas-python.md` incluye el caso reproducible y usa Pillow como
  instalación mínima; NumPy/scikit-image quedan para trabajos que los necesiten.
- Ejecutado: `quick_validate.py .agents/skills/sprites-python` del skill-creator
  con Python en UTF-8 y PyYAML instalado solo en un directorio temporal: PASS,
  «Skill is valid!», código 0; directorio temporal retirado. No se añadieron
  dependencias al proyecto ni se cambiaron los metadatos de invocación.
- Comprobación Python de enlaces Markdown e integridad: PASS, 8 enlaces locales
  resueltos, `agents/openai.yaml`, PNG aceptado y 36 archivos protegidos intactos.
  Revisión manual de los usos con referencia, retoque local y dibujo desde cero.
  No se ejecutaron generadores ni pruebas de navegador/npm: cambios de documentación.

No queda trabajo pendiente en esta actualización. Siguiente uso concreto:
consultar la nueva guía al crear o redibujar un personaje con `sprites-python`.

## Redibujo guiado de Auriana — aceptado el 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R1; STATUS: DONE.
El usuario acepta la nueva representación y, después, los retoques de suéter y
zapatos. El resultado se guarda separado de los originales en
`assets/auriana/experimentos/redibujo_guiado_reposo_derecha/frame_000.png`.
No se integra en el runtime ni cambia las fases de producción del juego.

- Implementado: calco del alfa del reposo derecho para fijar la silueta;
  interiores redibujados mediante regiones, curvas Bézier rasterizadas y parches
  a resolución nativa. Colores del frontal, perfil derecho sin flor. No es una
  imagen de alta resolución reducida ni se afirma haber dibujado la silueta desde cero.
- El usuario aprueba el aspecto general de `base_guiada.png` y pide ajustar solo
  suéter y zapatos. La revisión final modifica 124 píxeles dentro de esas regiones;
  cabeza, cara, pantalón y mano conservan sus píxeles. No hay cambios fuera del alcance.
- Entregado: PNG 64×64 RGBA y ampliación 8×, guías, comparaciones con original,
  intento anterior y control automático de cuantización identificado. El control
  es una prueba aparte, no el resultado presentado como dibujo.
- Ejecutado: `.venv-sprites/Scripts/python.exe -B
  assets/auriana/experimentos/redibujo_guiado_reposo_derecha/dibujar.py`, con salida
  final registrada en `ultima_ejecucion.log`: PASS, código 0. Se corrigieron una
  entrada de paleta faltante y la reescritura de una vista previa durante el desarrollo.
- Verificado automáticamente: tamaño, RGBA, alfa 0/255, 23 colores incluyendo
  transparencia, paleta del frontal, ampliación exacta, límites del retoque y
  SHA-256 de 36 archivos protegidos antes/después. Originales y recursos públicos intactos.
- Medido: silueta anterior IoU 92,866 %, nueva 100 % porque se calca deliberadamente.
  El centro estimado del suéter pasa de 0,948 px de desplazamiento a 0,047 px;
  el de la mano de 1,216 px a 0 px. Son comprobaciones de posición, no garantías
  de calidad artística. `mediciones.json` incluye el control y las limitaciones.
- Visto: estático a tamaño nativo y ampliado, damero claro, detalles de suéter y
  zapatos; respuesta visual positiva del usuario. No se ejecutaron pruebas de
  navegador, animación o npm para este cambio de un PNG experimental.

Detalles y reproducción en el `INFORME.md` del experimento. No queda un ajuste
solicitado pendiente en este bloque. La siguiente tarea del proyecto sigue siendo
completar los recursos de Aarón y del abrazo de la fase 4; no se ha publicado nada.

## Intento de redibujo de Auriana de pie — 11 de noviembre de 2026

TASK_KIND: CHANGE; RISK_LEVEL: R1; STATUS: FAILED_SAFE.
El usuario rechaza el resultado por falta de fidelidad y calidad artística.
La solicitud de redibujo no está satisfecha. Los archivos quedan como prueba
rechazada, separados de los originales y sin integración en el juego.
La referencia de postura es `assets/auriana/frames/reposo/derecha/frame_000.png`;
la referencia de acabado es `reposo/frente/frame_000.png`. Perfil sin flor.

- Implementado: matriz de píxeles escrita a mano en
  `assets/auriana/experimentos/redibujo_reposo_derecha/dibujar.py`, con cara,
  cabello, cuello, brazo relajado, piernas de pie y zapatillas de perfil.
  El dibujo no reduce, cuantiza, filtra ni copia píxeles de la referencia.
- Archivos de prueba: `frame_000.png` nativo 64×64 RGBA, `vista_8x.png` transparente
  512×512 y `comparacion.png` con el lateral de reposo, el redibujo y el frontal.
  Las ampliaciones usan exclusivamente vecino más cercano.
- Ejecutado: `.venv-sprites/Scripts/python.exe -B
  assets/auriana/experimentos/redibujo_reposo_derecha/dibujar.py`: ejecuciones
  previas PASS; la última falló al guardar `comparacion.png` con
  `OSError: [Errno 22] Invalid argument`, después de guardar PNG nativo y ampliación.
  La comparación no se presenta como regenerada por esa última ejecución.
  Comprobación local con Pillow y `hashlib`: PASS en dimensiones, RGBA, alfa
  0/255, 23 colores incluyendo transparencia, paleta contenida en el frontal,
  equivalencia exacta entre matriz/PNG y ampliación, y márgenes sin recortes.
  Una sola componente opaca con vecindad de ocho píxeles; sin píxeles aislados.
- Integridad: SHA-256 del reposo derecho, frontal, salto derecho inicial y
  referencia de identidad conservados. Se trabajó sin Git; no se sobrescribieron
  frames de producción, recursos públicos ni datos del juego.
- Visto: PNG estático a tamaño nativo y ampliado, incluida comparación sobre
  damero claro. No se integró en el runtime ni se ejecutaron pruebas de navegador,
  animación, build o npm para este cambio exclusivamente artístico.

Pendiente: una recreación que conserve la silueta, la geometría facial y el
cabello del original con calidad aceptable para el usuario. Las comprobaciones
de formato no acreditan esa fidelidad. No se continúa iterando con el mismo
método fallido ni se aprueba arte definitivo. El estado de las fases del juego
y sus recursos pendientes se conserva.

## Escenarios e interfaz — bloque terminado

TASK_KIND: CHANGE; RISK_LEVEL: R2; STATUS: DONE_WITH_WARNINGS.
Alcance autorizado: descargar e integrar entornos pixel art reales, ampliar los cinco
mapas y coordinar también el diseño exterior, la tipografía y la UI.

### Implementado

- Diez originales de Ansimuz descargados en `assets/vendor/environment`, con URLs
  fijadas a commits, SHA-256, evidencia del autor, NOTICE y licencia CC0 completa.
- Pixelify Sans local, con original, metadatos y OFL 1.1 en `assets/vendor/fonts`.
- Atlas 1024×1024 de 31 frames y 87668 bytes, más portada derivada de estos recursos.
  Preparación offline reproducible; originales conservados. Sin peticiones externas
  durante la partida ni nuevas dependencias de npm.
- Cinco mapas de 3072×400, checkpoint x=1536, metas x=3008 y x=2912 en el quinto.
  Terreno continuo, huecos de 32/40 px y subidas de 16 px. Decoración explícita sin
  colisión; faroles reales para checkpoint y destino. Aarón provisional queda visible.
- Portada, HUD, pausa, botones, indicadores, final y tipografía comparten paneles
  pixel, bosque, crema y lavanda. Controles fuera del escenario y horizontal grande.
  La tarjeta «Abrazo pendiente» contiene el texto completo también en horizontal.
- Auriana y sus recursos originales/exportados conservados; carrera de cuatro
  frames, física Arcade, entrada, progreso y textos personales sin cambios.

### Rendimiento

Canvas 2D se fija en `config.stack.renderer`, con validación y prueba negativa.
Se corrigió una variación de WebGL por software (SwiftShader): dos perfiles de
escritorio dieron 46,52/40,91 FPS; la comparación independiente de 30 segundos dio
58,84 para WebGL y 59,94 para Canvas. Se conservan todos los informes preliminares;
no se utilizan como resultados finales ni se promete que WebGL mantenga 60 FPS.

El terreno se dibuja una vez en tres bloques de hasta 1024×80. El descarte fuera de
cámara se actualiza cada 16 px con margen conservador. Se recortan solo bandas
transparentes/ocultas de fondos, preservando offsets y verificando 30 composiciones
RGBA exactas. Estimación de atlas y bloques RGBA: 5177344 bytes (4,94 MiB); no es una
medición de toda la memoria del proceso del navegador.

Perfiles finales de 30 segundos, Windows headless, resolución interna 480×270, DPR 1:

| Caso | FPS medio | p95 | Frames >50 ms | Long tasks |
|---|---:|---:|---:|---:|
| Escritorio, mapa 1 | 59,97 | 16,8 ms | 0 | 0 |
| Escritorio, mapa 4 | 59,94 | 16,7 ms | 0 | 0 |
| Touch vertical, mapa 4 | 59,94 | 16,8 ms | 0 | 0 |
| Touch horizontal, mapa 4 | 59,67 | 16,7 ms | 0 | 0 |

PASS frente a fase 3: caída media máxima 0,56 %, p95 sin aumento >10 %, cero callbacks
de layout durante los perfiles táctiles. Ver `qa/phase4-environment-performance-comparison.json`.
Son medidas de este equipo y de emulación; Android/iPhone físicos y Safari pendientes.

### Verificación actual

- `npm test`: PASS, 42/42, incluido rechazo de renderer no admitido.
- `node scripts/descargar-entorno.mjs --check`: PASS, 13 fuentes, sin red.
- `.venv-sprites/Scripts/python.exe scripts/preparar-entorno.py --check`: PASS,
  reproducción exacta y prueba de equivalencia de las bandas recortadas.
- `npm run build:prototype`: PASS, JS 1272,52 kB / 339,38 kB gzip, CSS 8,48 kB.
  Advertencia existente de Vite >500 kB conservada.
- Navegador: PASS, **130/130 casos únicos sobre Canvas**, sin skipped, flaky ni
  errores del runner. Bloques de 8 recursos/errores, 4 perfiles y 118 regresiones;
  este último pasó completo en 29,8 minutos. Dos comprobaciones adicionales de
  pintura real reemplazan dos entradas del smoke y no se suman como casos nuevos.
  Ver `qa/phase4-environment-verification-summary.json`; no es una sola ejecución
  de 130 casos. Chromium 59, Firefox 54 y touch emulado 17.
- Recorridos completos con teclado y touch en ambas orientaciones; caídas,
  checkpoints, saltos en ambos sentidos, guardado bloqueado/corrupto, pausa, foco,
  multitáctil, cancelación, giro, recarga, final y replay verificados.
- Diez ciclos de reaparición, reinicio/inicio/continuación, final/replay y lifecycle
  táctil conservaron los recursos contados: un cuerpo dinámico, superficies según
  mapa, un collider, ocho texturas, dos animaciones, un canvas y listeners estables.
  Se mantiene un ResizeObserver con diez targets. No es una medida del heap total.
- Revisión estática independiente: PASS, integración de terreno/atlas, procedencia,
  controles de carga y compatibilidad/wiring de Canvas. Sin shaders/tintes requeridos.
- Revisión visual final: PASS, **60 composiciones Canvas**, inicio/checkpoint/llegada
  de cada nivel en Chromium, Firefox y las dos orientaciones táctiles. También
  portada, ancho de 320 px, pausa, final y controles a tamaño nativo. Sin cortes
  de terreno ni adornos ocultando saltos. Ver `qa/phase4-environment-visual-review.json`.
- `npm run check:design`: PASS, 435 comprobaciones.
- `npm run check:assets` y `npm run build`: rechazo esperado, 438 comprobaciones
  y exactamente los tres recursos futuros de Aarón, abrazo y música; sin otros fallos.
- Integridad: PASS, 309 archivos iniciales, 270 intactos y 39 cambios del alcance
  autorizado, sin archivos eliminados. Los 126 archivos de Auriana/referencias, 116
  evidencias históricas y 13 archivos de núcleo/textos/dependencias permanecen
  intactos; grupos que pueden solaparse. Ver `qa/phase4-environment-integrity.json`.

No se ha publicado. Los tres recursos finales de Aarón, abrazo y música siguen
pendientes y no se marcan como disponibles. No se declara «listo para regalar».
Este bloque de escenarios e interfaz queda documentado, implementado, probado
automáticamente y visto en navegador. Siguiente tarea concreta del proyecto:
incorporar los recursos definitivos de Aarón y abrazo y la pista de música, con
su revisión de identidad/audio y el gate de entrega. No forma parte de este bloque.

Los resultados de fase 3 conservados a continuación son históricos; no sustituyen
las comprobaciones de esta ampliación.

## Registro anterior: fase 3

## Situación actual — 2026-11-10

- Diseño 2.0.1, con la petición posterior de aprovechar el móvil horizontal con un escenario grande.
- Fases 1, 2 y 3 implementadas. Clasificación: TASK_KIND: CHANGE; RISK_LEVEL: R2; STATUS: DONE_WITH_WARNINGS.
- Verificación móvil mediante emulación, como acordó el usuario. Android físico, iPhone y Safari no comprobados.
- Tres de seis recursos finales disponibles: Auriana idle/run/air. Aarón, abrazo y música pendientes.
- Escenario definitivo con recursos de Internet pendiente en fase 4; no se evaluó su estética.
- Sin publicación, nuevas dependencias, backend, CDN o servicios remotos durante la partida.

## Fase 3 implementada

La entrada agrega códigos de teclado, teclas de controles enfocados y cada pointerId.
Las fuentes se combinan por OR; ambas direcciones producen cero. Salto por flanco
de la unión, sin repetición al mantenerlo ni un segundo salto desde click.

Los punteros se capturan individualmente. Salir del botón mantiene la acción;
pointerup, pointercancel y lostpointercapture liberan solo esa fuente. Pausa, blur,
ocultación, giro, reaparición, transición, reinicio y salida limpian fuentes,
capturas y salto pendiente. Reanudar exige pulsación nueva.

Botones y textos pertenecen al DOM. La carga muestra progreso real. Inicio con
progreso o finalización, cinco puntos de HUD, pausa y confirmaciones comparten
una sola UI. Se conservan foco, Tab, Enter, Espacio y Esc según el control.
El anillo de foco de 3 px también aparece en asignaciones programáticas y en el
encabezado final. Diálogos dentro del rectángulo seguro, incluidos insets asimétricos.

«Reducir efectos decorativos» se edita en pausa y guarda una vez por cambio,
preservando mute y progreso. Preferencia válida guardada prevalece al valor inicial
del sistema. Un fallo de almacenamiento conserva la selección en memoria.
Activarla durante una secuencia pausada no la adelanta: al reanudar completa una
vez el checkpoint, destino aceptado o dedicatoria, retirando timers/tweens pendientes.
Desactivarla no recupera efectos ya omitidos. Se mantienen tokens y cancelaciones
de fase 2, incluido el handoff PRE_STEP y foco correcto al completar el final.

El canvas interno sigue en 480×270, con escala de personaje 1 y física Arcade
original. El tamaño visible cambia por eventos agrupados en un RAF, sin mediciones
DOM por frame ni reinicios de escena. La disposición normal conserva la regla
de escala entera del 80 %. Safe areas en los cuatro lados, texto crítico >=16 px,
controles 56×56 y salto 88×56. La reserva de ayuda impide que su texto mueva el juego.

### Móvil horizontal grande

Por petición del usuario, una partida táctil horizontal de ancho >=560 y altura
<=500 usa dos carriles pequeños a los lados y FIT exacto en el centro:
paso/puntos y dirección a la izquierda; pausa, aviso de desarrollo y salto a la derecha.
El nombre y los avisos breves quedan debajo, con ayuda larga en inicio y pausa.
Los botones nunca se superponen al escenario y ocupan menos área que este.

Tamaños medidos del canvas visible, sin contar el contorno de foco:

| Viewport | Escenario CSS | Dirección / salto |
|---|---:|---:|
| 844×390 | 544.0×306.0 | 56×56 / 88×56 |
| 640×360 | 424.0×238.5 | 56×56 / 88×56 |
| 568×320 | 352.0×198.0 | 56×56 / 88×56 |

Se reutilizan los mismos nodos al cambiar de modo. La entrada se limpia antes de
reubicarlos y el foco se restaura después. El límite 559→560→559 se comprueba sin
pausar por un mero resize ni arrastrar una tecla sostenida. La fila completa del
escenario se descuenta al medir la altura, evitando que la altura mínima de los
carriles lo encoja repetidamente. El desmontaje restaura los padres sin callbacks nuevos.

El final conserva un bloque 16:9 de hasta 42dvh con dedicatoria y replay debajo,
scroll natural y la tarjeta «Abrazo pendiente» claramente identificada.
Una región polite anuncia nivel y checkpoint; caída se limita a un aviso cada tres
segundos. La dedicatoria mantiene su texto y foco en el encabezado.

## Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| npm test | PASS: 34/34 |
| npm run check:design | PASS: 311 comprobaciones, tres avisos de recursos pendientes |
| npm run build:prototype | PASS; aviso de tamaño de Phaser conservado |
| Navegador: cobertura vigente por bloques | PASS: 122 casos únicos vigentes = 74 regresiones conservadas + 48 casos actuales |
| Revisión estática independiente | PASS: entrada/foco, safe areas, layout y cambios de modo |
| npm run check:assets | Rechazo esperado: tres recursos pendientes |
| npm run build | Rechazo esperado en el mismo gate, antes de pruebas/Vite |

La ejecución actual `npm run test:browser -- phase3-ui.spec.js phase3-touch runtime-profile.spec.js --max-failures=1` pasó **48/48**, sin skipped, flaky ni errores del runner, en 8,9 minutos. Se conservan 74 regresiones de teclado/física/estados del bloque anterior, cuyos módulos de jugabilidad no cambiaron en la revisión de layout. No se presenta esta cobertura combinada como una única ejecución completa de 122 casos. El resumen enlaza cada caso con su informe de origen. Chromium/Firefox headless en Windows; servicio bajo `http://127.0.0.1:4173/regalo/`, con auditoría de consola, red y rutas.

Se conservan regresiones de los cinco mapas, colisiones, coyote/buffer, metas y
checkpoints apoyados, pausa, cancelaciones, almacenamiento, Auriana, final y replay.
Las partidas táctiles completas recorren los cinco mapas en vertical y horizontal
con contactos del navegador, sin modificar cuerpos ni teletransportar.

La matriz incluye 1366×768, 1920×1080, 390×844, 844×390, 360×640, 640×360,
568×320 y ancho mínimo 320×568. Insets se emulan con el override de Chromium,
incluidos márgenes desiguales izquierda/derecha y límite superior de 60 px.

El reflow del 200 % se emula a 683×384/DPR2 respecto de 1366×768/DPR1;
no se presenta como zoom nativo. Blur/visibilidad y detección inicial de touch en
escritorio tienen pruebas sintéticas identificadas. Los giros usan resize real
del viewport. Los recorridos táctiles comprueban Pointer Events trusted generados
por CDP; no equivalen a un teléfono físico.

Tracing se desactiva para no retrasar la inyección durante ventanas breves de salto.
Los fallos conservan captura, auditoría de consola/red y diagnóstico de solo lectura.
Los informes previos con fallos se conservan como reproducciones, no como el resultado
final. No se declara conformidad WCAG total ni compatibilidad móvil universal.

## Rendimiento y estabilidad

Perfiles de 30 segundos, canvas interno 480×270, DPR 1:

| Caso | FPS medio | p95 | Frames >50 ms | Long tasks |
|---|---:|---:|---:|---:|
| Escritorio, mapa 1 | 60.00 | 16.8 ms | 0 | 0 |
| Escritorio, mapa 4 | 60.00 | 16.8 ms | 0 | 0 |
| Touch vertical, mapa 4 | 60.00 | 16.7 ms | 0 | 0 |
| Touch horizontal, mapa 4 | 60.00 | 16.7 ms | 0 | 0 |

Sin regresión sostenida superior al 10 % frente a los perfiles de fase 2. Los perfiles táctiles registraron cero callbacks de layout durante el movimiento, además del trabajo inicial de ajuste. Ver comparación en qa/phase3-performance-comparison.json.

Diez reapariciones, diez reinicios/inicio/continuación, diez finales/replay y diez ciclos táctiles de cancelación, pausa, giro y reinicio conservaron sus recursos al volver al mismo estado: un cuerpo dinámico, tres/cinco estáticos, un collider, ocho texturas, dos animaciones y un canvas. Listeners estables, incluido el motor y la instrumentación de pruebas; un ResizeObserver con diez targets, sin crecimiento por ciclo.

Build de prototipo: 1.258,57 kB JS / 336,40 kB gzip y 7,05 kB CSS. El aviso de Vite >500 kB permanece visible; no se elevó el límite para ocultarlo.

Estas mediciones describen los navegadores headless en este equipo Windows;
la emulación táctil no reproduce CPU/memoria/FPS de Android o iPhone físicos.

## Integridad y evidencias

144 archivos protegidos comparados con el recibo de fase 2, sin cambios; se excluye de ese grupo docs/04 porque su actualización de UI forma parte del trabajo autorizado. Las 56 evidencias históricas de fases 1 y 2 mantienen sus hashes del inicio de la reanudación. Los grupos pueden solaparse. El recibo final enumera hashes, cambios autorizados y pruebas de preservación.

Auriana mantiene los seis idle, cuatro run y pose aérea originales, perfil derecho
sin flor y reflejo izquierdo; no se redibujó ni reexportó arte. Origen
(0.5,62/64), cuerpo 18×36, offset (23,26) y animaciones originales conservados.

- qa/phase3-verification-summary.json: cobertura vigente y procedencia de cada caso.
- qa/phase3-browser-results.json: última ejecución de UI, táctil y runtime.
- qa/phase3-performance-*.json: perfiles y comparación con fase 2.
- qa/phase3-{respawn,restart,ending}-counts.json y phase3-touch-lifecycle-counts.json: estabilidad.
- qa/phase3-touch-{portrait,landscape}-journey.json: recorridos y contactos.
- qa/phase3-layout-metrics.json y phase3-landscape-*.png: tamaños y capturas horizontales.
- qa/phase3-safe-dialog-*.png: márgenes seguros del diálogo.
- qa/phase3-integrity.json: hashes y alcance.
- qa/phase3-release-build.log: rechazo esperado del build final.

Las capturas se revisaron para legibilidad, foco y separación del playfield,
sin evaluar el arte definitivo del escenario. Las evidencias de fases 1 y 2
permanecen conservadas.

## Fases y siguiente tarea

| Fase | Estado | Pendiente |
|---|---|---|
| 1 Base/jugabilidad | completada | Regresiones conservadas |
| 2 Mapas/estados | completada | Regresiones conservadas |
| 3 UI/móvil | completada en el alcance de emulación acordado | Dispositivos físicos y Safari no comprobados |
| 4 Arte/final | parcial | Escenario con recursos de Internet, Aarón y abrazo definitivos |
| 5 Audio/fallos | pendiente | Música, SFX, ciclo de audio y recuperación general de carga |
| 6 QA/entrega | pendiente | QA de arte/audio y build final con todos los recursos |

Siguiente tarea: fase 4, conservando a Auriana. El gate continúa impidiendo entregar
los sustitutos como arte final. No se ha publicado el juego.
