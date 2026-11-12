# Auriana: diseño y organización

Las rutas son relativas a la raíz del proyecto. La fuente de las poses y tiempos
actuales es `assets/auriana/README.md`; consúltala porque el inventario puede
cambiar.

## Aspecto

- Los sprites de Auriana solicitados hasta ahora miden **64 × 64**, son PNG
  RGBA de fondo transparente y usan bordes nítidos. Mantén alfa 0 o 255 salvo
  que el usuario pida otro acabado.
- Tiene piel melocotón, ojos marrones, cabello castaño oscuro largo y ondulado,
  suéter lavanda de cuello alto, shorts morado oscuro y zapatillas blancas con
  detalles lilas. Conserva las proporciones chibi y la silueta de las referencias.
- Para los perfiles de juego manda `referencias/auriana-derecha-sin-flor.png`:
  **sin flor tanto a derecha como a izquierda reflejada**, según `AGENTS.md`.
  Hay originales históricos con flor en el frontal y el perfil izquierdo;
  consérvalos, pero no traslades ese accesorio al lateral nuevo.
- Mantén el rostro, la barbilla y la unión con el cuello coherentes entre poses.
  Evita pegar la cabeza de reposo sobre un cuerpo con otras proporciones: esa
  solución ya produjo uniones visibles y fue rechazada. Si se componen capas,
  integra sus contornos y comprueba que la anatomía siga continua.

## Archivos de trabajo

- `assets/auriana/frames/reposo/derecha/frame_000.png`: perfil derecho sin flor,
  útil como referencia del personaje.
- `assets/auriana/frames/<acción>/<dirección>/frame_000.png`: fotogramas nativos
  de producción, numerados en orden.
- `assets/auriana/vistas_previas/<acción>/<dirección>/`: ampliaciones, hojas de
  contacto y GIF para revisión. Las ampliaciones no son los sprites nativos.
- `assets/auriana/referencias/`: imágenes de referencia y guías de poses.
- `assets/auriana/experimentos/`: variantes y pruebas separadas de producción.
- `assets/auriana/scripts/`: generadores existentes; revisa sus entradas y
  destinos antes de ejecutarlos porque regeneran archivos de su dirección.

La prueba de seis cuadros creada con una malla partió de cuatro poses de carrera
y añadió dos deformaciones leves de las piernas;
no equivale a seis poses redibujadas ni ha demostrado ser una mejora artística.
El retoque de color y zapatillas también es una prueba separada. Usa las
comparaciones para decidir, sin tratar ninguna variante experimental como final
por defecto.

## Redibujo guiado aceptado

El resultado estático aceptado se encuentra en
`assets/auriana/experimentos/redibujo_guiado_reposo_derecha/frame_000.png`.
Se conservó el alfa del reposo derecho y se redibujaron sus interiores usando
la paleta del frontal. El frontal fue referencia de acabado; la postura fue
la del lateral quieto, no la preparación del salto. La imagen se construyó a
64×64, sin reducir una ilustración grande. No se ha integrado en el runtime.

El usuario aceptó el aspecto general y pidió retocar solo suéter y zapatos.
`base_guiada.png` conserva esa base; `detalles.png` compara los retoques. Consulta
[el método y sus límites](dibujo-pixel-art.md) y el `INFORME.md` del experimento
para aplicar el conocimiento. No reutilices sus coordenadas para otra pose.
