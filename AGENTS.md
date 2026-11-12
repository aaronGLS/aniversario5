# A cinco pasos de ti - instrucciones para Codex

## Objetivo
Implementar un regalo web de quinto mesiversario para Auriana: cinco recorridos de
plataformas muy sencillos y un reencuentro final con Aarón. Prioridad: terminar una
experiencia pequeña y coherente, no construir un motor ni ampliar el alcance.

## Lectura progresiva
1. Lee `ESPECIFICACION.md` y `docs/ESTADO.md` al empezar.
2. Lee solo el documento de la tarea actual:
   - Motor, controles, guardado: `docs/01_ARQUITECTURA.md`.
   - Geometría y dificultad: `docs/02_NIVELES.md`, `data/levels.json`.
   - Sprites y recursos: `docs/03_ARTE_Y_ANIMACIONES.md`, `data/assets.json`.
   - Pantallas y responsive: `docs/04_UI_Y_TEXTOS.md`, `data/texts.es.json`.
   - Sonido: `docs/05_AUDIO.md`.
   - Orden de trabajo y verificación: `docs/06_PLAN_Y_PRUEBAS.md`.
   - Publicación y fuentes: `docs/07_ENTREGA_Y_FUENTES.md`.
3. No vuelvas a leer todo el paquete en cada cambio. Consulta por necesidad.

## Autoridad y decisiones
- Petición explícita más reciente del usuario > esta versión 2.0.1 > propuesta anterior.
- `data/config.json`, `data/levels.json`, `data/texts.es.json` y `data/assets.json`
  son las fuentes canónicas para números, mapas, textos y recursos.
- No inventes fechas, retratos fieles, recuerdos ni apodos. No hay bloqueo por fecha.
- No reabras decisiones cerradas por preferencia personal. Corrige bugs sin aumentar alcance.
- Si cambias un contrato por un fallo demostrado, actualiza dato, documentación y prueba.

## Arquitectura obligatoria
- JavaScript ES modules con JSDoc; Phaser **3.90.0**, Arcade Physics, Vite 8.
- No migrar a Phaser 4 ni a TypeScript; no React, backend, cuentas, analíticas o CDN.
- Tres escenas como máximo: carga, juego reutilizable, final. Menús/HUD en DOM.
- Reglas/estado serializable en módulos pequeños; escenas adaptan el motor.
- Arcade es la única autoridad de posición/velocidad. No implementar otra física.
- Una sola implementación de entrada para teclado y multitáctil.
- Una sola fuente de parámetros; no copiar constantes por escena.
- Usa rutas compatibles con subcarpetas. No cargar archivos inexistentes para probar suerte.

## Arte: prohibiciones importantes
- Auriana lateral **sin flor**, tanto a derecha como a izquierda reflejada.
- Autoridad: `referencias/auriana-derecha-sin-flor.png`.
- No cambiar cabello, ropa, paleta o proporciones por reutilizar versiones antiguas.
- Los carteles con números son referencias, no spritesheets listos para jugar.
- No convertir el estilo a ilustración suavizada ni deformar sprites por frame.
- Conserva los originales; archivos finales separados, PNG RGBA con celdas exactas.
- No dibujar/recrear a la protagonista por código y presentarlo como el arte aprobado.
- Gráficos provisionales solo en desarrollo, claramente indicados. El final aprobado
  mantiene ambos personajes visibles frente a frente; no simular un abrazo ni declararlo
  recurso final terminado.

## Ejecución
- Inspecciona el repositorio antes de crear archivos; no borres trabajo del usuario.
- Implementa las fases de `docs/06_PLAN_Y_PRUEBAS.md` en orden.
- Continúa hasta completar lo realizable; no pidas permiso entre fases rutinarias.
- Si falta arte, usa el sustituto de desarrollo definido y continúa la programación.
- No compres, publiques, accedas a cuentas ni uses servicios de pago sin autorización.
- No asumas que PixelLab, MCP o un navegador de automatización están disponibles.
- Un agente implementador por defecto. Una revisión independiente solo si existe esa
  capacidad y aporta valor; no crear una red de subagentes para este juego.
- No crear versiones duplicadas, frameworks internos, editores, sistema de plugins o ECS.
- Prefiere una función clara a una abstracción que solo tiene un consumidor.

## Verificación
- Ya disponible: `node scripts/validar-diseno.mjs` (datos/documentos, NO juego).
- Tras implementar: `npm test`, `npm run build`, `npm run check:assets`, navegador.
- Estos tres scripts de npm son objetivos de implementación: no existen aún en el kit.
- Prueba el recorrido completo, caídas, pausa, multitáctil, recarga, audio y subcarpeta.
- Captura escritorio, móvil vertical, móvil horizontal y reencuentro; revisa consola y red.
- No sustituir pruebas de navegador por capturas de código o por simulaciones aisladas.
- No asegurar 60 FPS, compatibilidad móvil o entrega final sin evidencia real.
- Revisa también el cambio 4→1 de carrera y el tamaño del sprite al cambiar estado.

## Cierre de cada bloque
Actualiza `docs/ESTADO.md` con cambios, comandos realmente ejecutados, resultado,
archivos pendientes y siguiente tarea concreta. No marques como hecho lo pendiente.
Distingue: documentado, implementado, probado automáticamente y visto en navegador.
No declares «listo para regalar» con assets obligatorios ausentes o pruebas críticas pendientes.
