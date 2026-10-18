# Especificaciones del Núcleo Común (Core)

Este directorio contiene las especificaciones formales de la infraestructura y modelos compartidos por todas las herramientas de `uni-tools`.

## Alcance del Módulo Core

1. **Gestión de Estado e Historial (`history.spec.md`):**
   - Inmutabilidad de snapshots.
   - Pila de `undo` y `redo`.
   - Transacciones atómicas (`commit`).

2. **Esquema de Documentos y Persistencia (`document-schema.spec.md`):**
   - Esquema formal en TypeScript y validadores Zod.
   - Especificación de guardado en JSON y metadatos incrustados en SVG (`<metadata id="uni-tools-datos">`).
   - Mecanismo de autoguardado en `localStorage` con debounce.
   - Reglas de saneamiento, depuración y migración de versiones de archivos.

3. **Lienzo y Navegación (`viewport.spec.md`):**
   - Sistema de coordenadas espacio mundo vs. espacio pantalla.
   - Paneo, zoom exponencial/suave, rueda de ratón y gestos táctiles (pinch-to-zoom).
   - Grilla magnética (snap-to-grid a 20px).

4. **Portapapeles y Selección (`clipboard-selection.spec.md`):**
   - Operaciones de selección simple, selección múltiple (banda y tecla modificadora).
   - Copiar, cortar, pegar con regeneración determinística de IDs (`uid`).
   - Duplicación con desplazamiento proporcional.

5. **Ruteo Ortogonal Común (`orthogonal-router.spec.md`):**
   - Algoritmo A* en grilla ortogonal.
   - Detección de colisiones contra bounding boxes (`rectOf`).
   - Penalizaciones de puntaje por giros, longitud, solapamiento y cruces.
