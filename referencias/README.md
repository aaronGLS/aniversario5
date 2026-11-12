# Referencias visuales: no importar como sprites de producción

`auriana-derecha-sin-flor.png` es la autoridad de **diseño**: 759×1236 px, con canal alfa; no lleva flor.
`carrera-8-referencia.png` es una referencia de **movimiento**: 2172×724 px, totalmente opaca, con fondo negro y números.

Se incluyen sin modificación. Los hashes y las medidas comprobadas figuran en `../data/reference-audit.json`.
El usuario aceptó la dirección visual de la carrera, pero eso no garantiza su uniformidad técnica.
Si ambas referencias discrepan en proporciones o detalles, manda la imagen individual sin flor.
No aplicar recorte automático en ocho partes al cartel ni borrar todos los píxeles negros: se destruirían contornos.
No reutilizar las versiones anteriores con flor ni el Idle antiguo de seis fotogramas sin inspección.

La producción final se describe en `../docs/03_ARTE_Y_ANIMACIONES.md`. Esta carpeta no va en `public/` ni en el sitio publicado.
