# 02 | Niveles, recorrido y dificultad

## Autoridad y unidades

`data/levels.json` contiene los cinco recorridos aprobados de 3072×400. La vista
sigue en 480×270 y la física de Auriana conserva sus parámetros. Los x/y/ancho/alto
son píxeles lógicos, con origen superior izquierdo. La geometría se amplió por
petición del usuario para aprovechar los recursos reales; no es un cambio de física.

## Geometría cerrada

| Paso | Superficie | X inicial | X final exclusivo | Y superior | Ancho |
|---|---|---:|---:|---:|---:|
| 1 | `p1-s0` | 0 | 512 | 224 | 512 |
| 1 | `p1-s1` | 512 | 640 | 208 | 128 |
| 1 | `p1-s2` | 640 | 1280 | 224 | 640 |
| 1 | `p1-s3` | 1280 | 1408 | 208 | 128 |
| 1 | `p1-s4` | 1408 | 2304 | 224 | 896 |
| 1 | `p1-s5` | 2304 | 2432 | 208 | 128 |
| 1 | `p1-s6` | 2432 | 3072 | 224 | 640 |
| 2 | `p2-s0` | 0 | 544 | 224 | 544 |
| 2 | `p2-s1` | 576 | 1120 | 224 | 544 |
| 2 | `p2-s2` | 1152 | 1792 | 224 | 640 |
| 2 | `p2-s3` | 1824 | 2368 | 224 | 544 |
| 2 | `p2-s4` | 2400 | 3072 | 224 | 672 |
| 3 | `p3-s0` | 0 | 512 | 224 | 512 |
| 3 | `p3-s1` | 544 | 1120 | 208 | 576 |
| 3 | `p3-s2` | 1152 | 1792 | 192 | 640 |
| 3 | `p3-s3` | 1824 | 2400 | 208 | 576 |
| 3 | `p3-s4` | 2432 | 3072 | 224 | 640 |
| 4 | `p4-s0` | 0 | 288 | 224 | 288 |
| 4 | `p4-s1` | 328 | 616 | 208 | 288 |
| 4 | `p4-s2` | 656 | 976 | 224 | 320 |
| 4 | `p4-s3` | 1016 | 1304 | 208 | 288 |
| 4 | `p4-s4` | 1344 | 1728 | 224 | 384 |
| 4 | `p4-s5` | 1768 | 2056 | 208 | 288 |
| 4 | `p4-s6` | 2096 | 2416 | 224 | 320 |
| 4 | `p4-s7` | 2456 | 2744 | 208 | 288 |
| 4 | `p4-s8` | 2784 | 3072 | 224 | 288 |
| 5 | `p5-s0` | 0 | 896 | 224 | 896 |
| 5 | `p5-s1` | 928 | 1952 | 224 | 1024 |
| 5 | `p5-s2` | 1984 | 3072 | 224 | 1088 |

Todas las superficies son sólidas hasta y=400. Paso 1: tres escalones contiguos
de 16 px sin huecos. Paso 2: cuatro huecos de 32. Paso 3: cuatro huecos de 32
y subida/bajada en cinco superficies anchas. Paso 4: ocho huecos de 40 con
alturas alternas. Paso 5: dos huecos de 32 y un claro final amplio.

## Entrada, descanso y salida

| Paso | Spawn (x,pies) | Checkpoint (x,pies) | Meta (x,pies) |
|---|---|---|---|
| 1 | (64,224) | (1536,224) | (3008,224) |
| 2 | (64,224) | (1536,224) | (3008,224) |
| 3 | (64,224) | (1536,192) | (3008,224) |
| 4 | (64,224) | (1536,224) | (3008,224) |
| 5 | (64,224) | (1536,224) | (2912,224) |

Los puntos conservan márgenes de al menos 32 px respecto al apoyo. Aarón espera
en (2992,224). Una meta exige overlap del cuerpo y apoyo inferior en su supportId;
cruzar su x en el aire no basta. El checkpoint se activa al apoyarse y cruzarlo,
sin click. Al recargar se conserva el checkpoint lógico, no una posición arbitraria.

Checkpoint: farol real descargado, 32×32, apagado/encendido por cambio de frame.
Metas 1–4: farol sobre pedestal de 16 px, conjunto 32×48. El paso 5 conserva
su meta invisible y a Aarón provisional. Todos los marcadores carecen de collider.

## Saltos y ritmo

Gravedad 650, velocidad 145 e impulso -255. Altura ideal 50,02 px, alcance al
mismo suelo 113,77 px. Las subidas obligatorias siguen siendo de 16 y los huecos
máximos de 40; se validan ventanas conservadoras en ambos sentidos y luego se
prueban con entrada real en Phaser. No hay plataformas móviles ni mecánicas nuevas.

Distancia total spawn-meta: 14624 px; tiempo ideal horizontal 100,86 s. La primera
experiencia busca 3–5 minutos contando aprendizaje y caídas, sin garantizar duración
ni insertar esperas. Un solo descanso por mapa limita el retroceso tras una caída.

## Entorno y composición

Cinco ambientes: claro azul, bosque lavanda, camino elevado violeta, bosque rosa
y claro cálido. Fondos de SunnyLand Woods y Tall Forest con scrollFactors 0/0,10/0,25;
efectos reducidos los fijan en cero. Cada nivel declara sus adornos, sin azar runtime.
El atlas combina solo recursos reales, conservando fuentes y licencias en vendor.

El terreno se compone una vez en tres bloques de hasta 1024×80 a partir de tiles
de 16×16, con bordes únicamente expuestos. Los cuerpos son zonas invisibles exactas;
un bloque de imagen nunca añade colisión. La cuadrícula de cada superficie se mantiene
al cruzar un bloque de renderizado, incluso en coordenadas x múltiplo de 8.

La decoración queda detrás del personaje y evita el spawn, checkpoint y llegada.
No oculta el destino ni convierte troncos, rocas o setas en obstáculos físicos.
La llegada del paso 5 también deja libre la zona de Aarón. Los elementos lejanos
se omiten del dibujado; la visibilidad se actualiza al cruzar bloques de cámara
de 16 px, con un margen conservador de un tile para evitar apariciones tardías.
Cambiar efectos o reaparecer actualiza la visibilidad del nuevo encuadre.

## Revisión

Recorrer cada mapa, probar saltos en ambos sentidos y caída antes/después del descanso.
Revisar inicio, checkpoint y llegada en escritorio, móvil vertical y horizontal,
incluidas costuras en x=1024/2048. Comprobar el checkpoint elevado del paso 3 en y=192,
alineación entre borde visual y físico, claridad de huecos y coherencia de escala.
La caída ocurre con pies >320; el borde inferior del mundo nunca colisiona.
