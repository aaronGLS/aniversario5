# 07 | Entrega, despliegue y fuentes técnicas

## Entrega local

El paquete incluye un prototipo ejecutable. La entrega final debe incluir código fuente,
package.json, package-lock.json, datos, recursos del manifest, pruebas y README operativo.
No incluir node_modules, credenciales, caches, fuentes del sistema o archivos personales.
Las referencias grandes se conservan fuera de public: no son contenido web.
Las capturas y reportes QA se generan localmente y están excluidos de Git.

Para GitHub se conservan fuentes, lockfile, datos, recursos y licencias. `.gitignore`
excluye dependencias instaladas, `dist/`, `qa/`, entornos, cachés y configuración
personal. `.gitattributes` conserva exactamente los recursos con hashes verificados.
El informe estático inicial obsoleto se retiró y las salidas generadas se excluyen
de Git; los resultados documentados permanecen en `docs/ESTADO.md`.

Secuencia de verificación prevista:
```sh
npm ci
npm test
npm run check:design
npm run check:assets
npm run build
npm run preview
```

Para un prototipo sin arte: npm run build:prototype y npm run preview, con etiqueta
de desarrollo. No confundirlo con el build final, que bloquea recursos ausentes.
El README del juego debe distinguir npm install inicial, npm ci con lock existente,
y la diferencia entre dev, prototype y release.

## Web compartible

GitHub Pages está configurado en `.github/workflows/deploy-pages.yml`: push a `main`
o ejecución manual, instalación con lockfile en Node 22, `npm run build:pages` y
publicación exclusiva de `dist/`. El job de compilación tiene lectura del código;
el de publicación recibe `pages:write` e `id-token:write`, depende de la compilación
y solo publica desde `main`, en el entorno `github-pages`. Las acciones están fijadas
por commit y una sola publicación se ejecuta cada vez.
`build:pages` conserva el gate de recursos y compila en producción sin invocar
el banco completo. `build` sigue siendo el chequeo de entrega más amplio.
Hay que seleccionar **Settings → Pages → Source → GitHub Actions** en GitHub y
subir este workflow. El resultado remoto se consulta en Actions y Pages; la
verificación local no demuestra que el despliegue remoto ya haya terminado.

Salida dist/ de Vite, con base './', sin router ni endpoints [S5].
Un sitio HTTPS estático sirve index.html, el bundle y assets desde la misma base.
Comprobar también en /regalo/ o subcarpeta similar, no solo en localhost/.
No abrir el archivo HTML mediante file:// como método soportado.
No service worker ni caché de aplicación: no se promete uso offline tras cerrar la página.
La ausencia de servicios externos durante la partida no significa que la primera
carga desde un enlace no necesite conexión.

No fijar proveedor ni crear cuentas: ese acceso pertenece al usuario. Entregar
archivos desplegables; publicar solo con instrucción explícita y acceso autorizado.
La elección del hosting no modifica el juego. No simular que se ha publicado al
proporcionar un enlace local o un ZIP. No poner contraseñas en JavaScript cliente.
Un enlace no listado no equivale a contenido privado; no subir fotos personales
ni grabaciones adicionales fuera del alcance aprobado.

Metadata: title «A cinco pasos de ti»; description «Un pequeño camino para reencontrarnos.».
lang=es, viewport-fit=cover, viewport sin prohibir zoom. Favicon: corazón SVG local
simple, generado por el código; no necesita un pack. No revelar el reencuentro en una
imagen Open Graph por defecto. No analytics/cookies de terceros ni social embeds.
El final usa las tiras existentes, halo y corazón runtime; no requiere un PNG de pareja.

## Fuentes verificadas

Consultadas para los contratos técnicos. Las decisiones artísticas, medidas de mapas
y objetivos de dificultad son diseño de este paquete, no requisitos de estas fuentes.
Las citas [S#] en los documentos remiten a esta tabla. No se requieren para jugar.

| ID | Fuente primaria | Aplicación |
|---|---|---|
| S1 | OpenAI, guía AGENTS.md | Instrucciones persistentes y nombre del archivo. |
| S2 | Phaser, lanzamiento 3.90 | Rama fijada, sin afirmar que sea la más reciente. |
| S3 | Phaser 3.90, World | Arcade y paso de física fijo. |
| S4 | Vite, Getting Started | Requisitos de Node y desarrollo/build. |
| S5 | Vite, Building for Production | Base relativa y artefactos estáticos. |
| S6 | Phaser 3.90, Body | setSize, setOffset y sincronización. |
| S7 | MDN, Pointer Events | Captura y cancelación de punteros. |
| S8 | MDN, localStorage | Persistencia y posibles excepciones. |
| S9 | MDN, Autoplay | Reproducción por interacción y fallback. |

```text
[S1] https://developers.openai.com/codex/guides/agents-md
[S2] https://phaser.io/news/2025/05/phaser-v390-released
[S3] https://docs.phaser.io/api-documentation/3.90.0/class/physics-arcade-world
[S4] https://vite.dev/guide/
[S5] https://vite.dev/guide/build#relative-base
[S6] https://docs.phaser.io/api-documentation/3.90.0/class/physics-arcade-body
[S7] https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
[S8] https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
[S9] https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
```

Al consultar APIs, mantener la versión 3.90 en las rutas de Phaser: su documentación
general puede mostrar otra versión. Si el registro de paquetes no está disponible,
no inventar un lockfile ni decir que npm install funcionó. Registrar el bloqueo.

## Procedencia de escenarios y tipografía

- SunnyLand — Luis Zuno/Ansimuz, CC0: https://ansimuz.itch.io/sunny-land-pixel-game-art
- SunnyLand Woods — Luis Zuno/Ansimuz, CC0: https://ansimuz.itch.io/sunnyland-woods
- SunnyLand Tall Forest — Luis Zuno/Ansimuz, CC0: https://opengameart.org/content/sunnyland-tall-forest-environment
- Pixelify Sans — The Pixelify Sans Project Authors / Stefie Justprince, OFL 1.1: https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/pixelifysans

Los manifests `assets/vendor/environment/sources.json` y `assets/vendor/fonts/sources.json`
identifican cada URL pública fijada a una revisión y cada hash. Las publicaciones del
autor verifican la licencia de las imágenes; no se hereda la licencia del código de
los mirrors. Se conservan diez originales de entorno, tres archivos de fuente/metadatos,
CC0 completo y OFL distribuida junto a la fuente. No se copió código de los proyectos.
Solo se publican atlas, portada, fuente, su licencia y assets de runtime; las fuentes
originales, documentación, scripts y QA permanecen fuera de dist.

## Música aportada

`public/assets/audio/camino.mp3` es la única pista web. Se registran el hash y los datos
técnicos de la fuente aportada, junto con la transformación de FFmpeg, en
`assets/audio/sources.json`. El derivado omite la portada y metadatos, conserva los
164.82 segundos y queda por debajo de 3 MB. No se afirma autoría ni licencia; ambas
siguen sin confirmar. El archivo de origen no se conserva como una segunda copia.
