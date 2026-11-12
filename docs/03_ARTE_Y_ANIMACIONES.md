# 03 | Arte, recursos y animaciones

## 1. Inventario final mínimo

Son **cuatro tiras PNG de personajes y una pista MP3**. No es necesario producir una
biblioteca de animaciones por dirección. El manifest es `data/assets.json`.

| Key | Archivo en public/assets/ | Medidas / celdas | Uso |
|---|---|---|---|
| auriana.idle | sprites/auriana-zip-idle-right.png | 256×64; 4 celdas de 64×64 | Breathing_Idle del ZIP, 400 ms por cuadro. |
| auriana.run | sprites/auriana-zip-run-right.png | 512×64; 8 celdas de 64×64 | Running del ZIP, 70 ms por cuadro. |
| auriana.air | sprites/auriana-zip-air-right.png | 576×64; 9 celdas de 64×64 | Salto del ZIP, 85 ms por cuadro, una reproducción. |
| aaron.idle | sprites/aaron-idle-left.png | 512×64; 8 celdas de 64×64 | Idle west del ZIP, 150 ms por cuadro; nivel 5/final. |
| music.main | audio/camino.mp3 | <=3 MB | Una música; ver docs/05. |

El halo y el corazón final se generan y cachean en runtime; no requieren PNG adicional.

Los PNG de personajes exportados son RGBA, alpha solo 0/255 y conservan exactamente
los píxeles visibles de la fuente. Solo se retiran márgenes transparentes según
`sourceCrop` del manifest, sin escalado, recolor ni alineación por cuadro.

## 2. Qué existe realmente

Por petición del usuario del 11 de noviembre de 2026 se utiliza
`assets/Una_adorable_chica_chibi_en.zip`, extraído sin cambios en la carpeta del
mismo nombre. Contiene 67 archivos: 66 PNG y `metadata.json`.
Se integran las secuencias `east`: Breathing_Idle (4), Running (8) y salto (9).
Los perfiles derechos no llevan flor; se reflejan para ir a la izquierda.
Los perfiles `west` del paquete, algunos con flor, y las rotaciones se conservan
como originales y no se cargan en el juego.

Los frames anteriores de `assets/auriana/frames/`, sus referencias y vistas
previas, y los tres PNG públicos `auriana-{idle,run,air}-right.png` se conservan
intactos. `assets/auriana/animaciones-anteriores.json` guarda el manifest y las
duraciones anteriores para poder restaurarlos. No hay selector de personajes.

El exportador `scripts/exportar-auriana.py` lee las rutas de `data/assets.json` y
empaqueta copias en `public/assets/sprites/`. El manifest registra `integrated-imported`;
no se afirma que exportar equivalga a una revisión visual en navegador.

El ZIP `assets/Un_adorable_chico_chibi_en.zip`, aportado posteriormente por el
usuario para Aarón, contiene 25 archivos: 24 PNG y `metadata.json`. Todos se
conservan sin modificar en `assets/Un_adorable_chico_chibi_en/`. Se integran los
ocho cuadros de `Idle/animations/Idle/west` en orden 0→7; las ocho rotaciones y
la secuencia `east` quedan archivadas y no se solicitan durante la partida.

## 3. Identidad bloqueada de Auriana

Autoridad: `referencias/auriana-derecha-sin-flor.png`.
Chica chibi, piel melocotón, un ojo marrón visible al mirar a la derecha, pelo
castaño oscuro largo, ondulado y voluminoso, suéter lavanda con cuello/puños
acanalados, pantalones cortos oscuros, zapatillas claras con lavanda.
**Sin flor, moño, joyas ni accesorios nuevos.** No alargar piernas ni reducir su
cabeza para volverla una chica anime de proporciones distintas.

La imagen individual sigue siendo la referencia de identidad. La petición posterior
del usuario sustituye las poses activas por las del ZIP, conservando las anteriores.
No remuestrear el cartel de carrera ni redibujar una base para esta integración.

## 4. Cuadrícula, ancla y consistencia

Canvas 64×64 por frame. Ancla fija (32,62); el origen del sprite es
(0.5,0.96875). El ZIP mezcla lienzos de 84×84 en reposo/carrera y 64×64 en salto.
`sourceCrop` declara [x,y,ancho,alto]: reposo [10,7,64,64], carrera
[10,10,64,64] y salto [0,1,64,64]. Es una única ventana fija por secuencia,
sin perder píxeles visibles, con relleno transparente si la ventana excede el lienzo.
El punto inferior máximo del arte queda en y=62 (inclusive); se conserva el rebote
propio de las poses y no se alinea cada cuadro por su bounding box.

El origen, escala, cuerpo de 18×36 y offset (23,26) permanecen fijos en los tres
estados. Así el cuerpo termina en y=62 aunque alguna pose deje aire bajo los
zapatos. No mover el personaje dentro de la celda para simular avance;
el avance real lo produce Arcade.

Izquierda = flipX. Como el diseño lateral final no lleva flor, no existe el problema
de cambiar de lado el accesorio. Se acepta el reflejo del sombreado en este alcance.
No hacen falta sprites izquierdos nuevos ni un sistema de rotación en perspectiva.

## 5. Animaciones exactas

### Reposo: 4 frames
Se usan, en orden, los cuatro cuadros `Idle/animations/Breathing_Idle/east`,
400 ms cada uno. La secuencia se repite sin regenerar ni duplicar cuadros.
`data/config.json` es la fuente de duraciones; el ZIP no incluye temporización.

### Carrera: 8 frames, 70 ms por frame
Se usan los ocho cuadros `Run/animations/Running/east`, en orden 0→7.
El ciclo conserva los 560 ms anteriores y vuelve de 7→0. Revisar también 3→4;
ahora el cuarto cuadro continúa al quinto en vez de volver al primero.

### Aire: 9 frames, 85 ms por frame
Se usa la secuencia `Jumping/animations/Bend_knees_slightly_to_prepare_for_a_jump_then_pus/east`.
Empieza una vez al entrar en aire y mantiene el último cuadro si termina antes
de aterrizar. No retrasa el impulso físico ni reproduce la animación en bucle.
Pausar la escena suspende también esta secuencia. Al aterrizar vuelve a carrera
si Arcade informa velocidad horizontal; de lo contrario vuelve a reposo. La
prioridad es respawn > aire > carrera > reposo. Cada animación se reinicia solo al
entrar en su estado, no en cada update.

## 6. Aarón y el reencuentro

Diseño ficcional cerrado de Aarón, no retrato afirmado: misma proporción chibi,
pelo corto castaño oscuro, piel melocotón, ojos marrones, sudadera azul noche
(#596789 como tono medio), pantalón gris oscuro, zapatillas crema/lavanda.
Sin gafas, barba o accesorios inventados. El ZIP aportado es la autoridad visual
para Aarón: perfil izquierdo, manos relajadas y altura visible de 59–60 píxeles.
Cada fuente mide 84×84; se retira solo un margen transparente con la ventana
fija [10,10,64,64]. No se escala, recolorea ni alinea cada cuadro por separado.
Los pies terminan en y=62 (exclusivo), con ancla (32,62), escala 1 y sin flip.
Los ocho cuadros se repiten a 150 ms por cuadro (1,2 s por ciclo); este tiempo
se define en `data/config.json`, pues el ZIP no incluye duraciones.
La misma animación se usa en el quinto mapa y el acercamiento, se suspende al
pausar la escena y se destruye con ella o con su mapa. No necesita caminar ni
tener cuerpo físico: se queda quieto mientras ella se acerca.

El final reutiliza esos mismos sprites: Auriana camina desde x=164 hasta x=220;
Aarón permanece en x=260. Ambos tienen pies en y=224, cuadros de 64×64, escala 1
y las anclas actuales. Tras la fase walk pasan a reposo y permanecen visibles frente
a frente hasta salir o volver a jugar. No se superponen ni se sustituyen por una
imagen de abrazo.

El velo usa `palette.page` y opacidad 0.28; detrás de ambos actores se funde un halo
pixelado de 160×128 en `palette.focus`, centro (240,184), opacidad máxima 0.14. Un
corazón local de 8×8 usa `palette.accent`, escala 2, x derivada del centro de la pareja
y baja de y=140 a y=130. Todo parámetro está en `data/config.json`; las texturas se
crean una sola vez. La dedicatoria aparece debajo del canvas, limitada a 42dvh en alto.

## 7. Entorno real descargado e interfaz

Se han incorporado SunnyLand, SunnyLand Woods y SunnyLand Tall Forest de Luis Zuno
(Ansimuz), con licencia CC0 verificada en sus publicaciones. Diez archivos originales
se conservan sin cambios en `assets/vendor/environment/`, junto a URLs fijadas por
revisión, SHA-256, evidencia de licencia y texto CC0 completo.

El atlas local de 1024×1024 contiene 31 frames: quince fondos, nueve tiles de terreno,
cinco props y dos estados del farol. Se reutiliza en los cinco mapas y el final.
Los fondos reciben las mezclas de color declaradas en config; no se modifica a Auriana.
No hay texturas dibujadas como sustituto del entorno ni descargas durante la partida.
La portada de 480×144 es una composición de los mismos recursos.

Pixelify Sans se descarga del repositorio Google Fonts en una revisión fijada,
sin modificar la fuente. El original, metadatos y OFL 1.1 quedan en vendor/fonts;
la fuente y su licencia se distribuyen localmente. La interfaz comparte colores de
bosque, crema y lavanda, bordes pixel y controles del tamaño aprobado.

Reproducir: `node scripts/descargar-entorno.mjs`, después
`.venv-sprites/Scripts/python.exe scripts/preparar-entorno.py`.
Ambos admiten `--check`; las comprobaciones son offline y no reescriben recursos.
El preparador valida hashes, conserva alpha, recorta sin suavizado y extruye dos
píxeles alrededor de cada frame. Los originales nunca se sirven desde public.

Para reducir trabajo de dibujo, los fondos omiten bandas transparentes o completamente
tapadas por una capa más cercana. El atlas guarda su tamaño lógico y desplazamiento
originales mediante trim metadata de Phaser. La preparación compara los píxeles
compuestos en treinta combinaciones de ambiente/cámara. Este recorte del entorno
es independiente de las ventanas fijas de Auriana. El atlas ocupa 87668 bytes.

## 8. Producción pendiente

La integración de Auriana empaqueta los originales del ZIP; no requiere generar
ni redibujar frames. Para reproducirla, instala `scripts/requirements-sprites.txt`
y ejecuta `python scripts/exportar-auriana.py`. Para comprobar sin escribir, usa
`python scripts/exportar-auriana.py --check`.

Para exportar solo Aarón con el mismo empaquetador, añade `--character aaron`;
con `--character aaron --check` se comprueba sin reescribir ningún PNG.
No hay un recurso PNG pendiente para el final: la escena reutiliza las tiras
integradas. La música sigue pendiente en `data/assets.json`. No reutilizar perfiles
con flor ni modificar las identidades aprobadas.

## 9. Exportación y validación

El exportador empaqueta tiras horizontales sin margen entre celdas ni rotación y compara
cada frame exportado byte a byte con su fuente tras la ventana transparente declarada.
Rechaza ventanas que recorten píxeles visibles. `--check` valida rutas, dimensiones,
modo RGBA, alpha binario y equivalencia de píxeles sin escribir. Esto verifica la
integración, no una revisión visual del ciclo ni el comportamiento en navegador.
La validación estructural no sustituye la revisión de arte ni las pruebas runtime.

**Final de desarrollo:** ambos personajes importados permanecen visibles frente a
frente; el halo y el corazón son texturas generadas por código y cacheadas. No hay
tarjeta ni arte de abrazo simulado. El label global de desarrollo permanece visible;
en release siguen bloqueados los recursos reales ausentes del manifest.

Procedencia: los frames activos se extraen de los ZIP aportados por el usuario y
el exportador conserva sus píxeles visibles. Las referencias son materiales aportados en esta
conversación; no se declara una licencia pública ni se afirma exclusividad. No
extraer assets de Stardew Valley u otros juegos.
