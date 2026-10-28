# Spec 18 — Paridad Funcional de Recuadros (`marco`) en `simulador-logico`

- **ID:** `SPEC-18`
- **Referencia en el informe:** `BUG-11` y Sección `5.4.C.5`
- **Prioridad:** Media (18 / 27)
- **Esfuerzo estimado:** Medio (~45 minutos)
- **Herramientas afectadas:** Simulador lógico y módulo común de recuadros (`src/comun/recuadros.js`, `src/bloque/dibujo.js`, `src/bloque/interaccion.js`, `src/simulador/dibujo.js`, `src/simulador/interaccion.js`)

---

## 1. Historia de Usuario

> **Como** usuario del Simulador de circuitos lógicos,  
> **quiero** poder seleccionar un recuadro (`marco`) haciendo clic en su borde, moverlo desde su asa superior y cambiar su tamaño arrastrando los 8 tiradores de sus esquinas y lados (igual que en Diagramas de bloques),  
> **para** delimitar etapas de mi circuito cómodamente con el mouse sin tener que adivinar y tipear píxeles de ancho y alto en el panel derecho.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En `simulador-logico` existen dos causas por las cuales un recuadro (`marco`) no se puede manipular con el mouse una vez deseleccionado:

1. **En [`src/simulador/dibujo.js:34`](../src/simulador/dibujo.js), `renderNode(n)` dibuja los recuadros pasando `agarrable = false` y no llama a `renderHandles()`:**
   ```js
   if (esMarco(n)) {
     dibujarMarco(g, n, false);
     ...
   ```
   A diferencia de [`src/bloque/dibujo.js:24, 76-95`](../src/bloque/dibujo.js), no agrega el borde invisible `.m-hit` de 20 px de ancho, ni el asa `.m-grip`, ni los 8 tiradores `.m-handle-wrap`.

2. **En [`src/simulador/interaccion.js:3-10, 60-95, 149, 156`](../src/simulador/interaccion.js), la detección de clics (`nodoCerca(w)`) ignora explícitamente los recuadros (`if (esMarco(n)) continue;`) y `pointerdown` no consulta `.node.marco` ni `.m-handle-wrap`:**
   - Como `nodoCerca(w)` salta `esMarco(n)` y la selección por banda (línea 149) también filtra `!esMarco(n)`, **en `simulador-logico` hoy es imposible volver a seleccionar un `marco` con el mouse una vez que se deseleccionó** (ni con clic, ni con doble clic, ni con banda).

---

## 3. Especificación de la Solución

1. **Mover la lógica compartida de redimensionamiento y tiradores a [`src/comun/recuadros.js`](../src/comun/recuadros.js):**
   - Mover `HANDLES_MARCO`, `renderHandles()` (hoy en [`src/bloque/dibujo.js:76-95`](../src/bloque/dibujo.js)) y `aplicarResize(m, handle, x, y)` (hoy en [`src/bloque/interaccion.js:6-24`](../src/bloque/interaccion.js)) a `src/comun/recuadros.js`.
2. **En [`src/simulador/dibujo.js`](../src/simulador/dibujo.js):**
   - Línea 34: cambiar `dibujarMarco(g, n, false)` por `dibujarMarco(g, n, true)`.
   - En `render()` (línea 138, dentro de la capa `gOv`), invocar `renderHandles()`.
3. **En [`src/simulador/interaccion.js`](../src/simulador/interaccion.js):**
   - En `pointerdown`:
     - Detectar `const hEl = ev.target.closest(".m-handle-wrap");` para iniciar `drag = { kind: "resize", id: m.id, handle: hEl.getAttribute("data-handle"), moved: false }`.
     - Si `pendiente === "marco"`, iniciar `drag = { kind: "draw-marco", id: n.id, x0: snapV(w.x), y0: snapV(w.y) }` igual que en [`src/bloque/interaccion.js:68-86`](../src/bloque/interaccion.js).
     - Si `nodoCerca(w)` es `null`, comprobar si el clic fue sobre el borde `.m-hit`, el texto `.m-label` o el asa `.m-grip` de un recuadro (`const mEl = ev.target.closest(".node.marco, .m-grip");`) para seleccionarlo y permitir arrastrarlo como el resto de los nodos.
   - En `pointermove`, `pointerup` y `dblclick`: procesar `drag.kind === "resize"` y `drag.kind === "draw-marco"`, y permitir doble clic sobre el borde/título de un `marco` para editar su `label`.

### 3.1. Garantías de No Regresión
- `nodoCerca(w)` sigue ignorando el interior vacío de los recuadros (`if (esMarco(n)) continue;`), de modo que los recuadros **nunca tapan ni bloquean** el clic sobre las compuertas, pines o cables que estén adentro de ellos; el recuadro sólo se selecciona cuando se hace clic sobre su borde `.m-hit` / `.m-shape`, su etiqueta `.m-label` o su asa `.m-grip` (exactamente igual que en `diagrama-bloque`).

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/simulador.spec.js`](../tests/specs/simulador.spec.js):
- Agregar un bloque `test.describe("recuadros: seleccionar, mover y cambiar tamaño")` análogo al de [`tests/specs/bloque.spec.js:49-91`](../tests/specs/bloque.spec.js):
  1. Verificar que un clic sobre el borde de un `marco` sin relleno lo seleccione gracias a `.m-hit` y muestre los 8 `.m-handle-wrap`.
  2. Verificar que arrastrar `.m-grip` mueva el recuadro.
  3. Verificar que arrastrar el tirador `"se"` cambie `w` y `h` y que `undo()` restaure la geometría anterior.

---

## 5. Criterios de Aceptación

- [ ] En `simulador-logico`, los recuadros (`marco`) tienen área de agarre `.m-hit` de 20 px, asa `.m-grip`, los 8 tiradores `.m-handle-wrap` al seleccionarse y creación arrastrando en diagonal.
- [ ] El código de tiradores y `aplicarResize` vive una sola vez en `src/comun/recuadros.js` sin duplicarse entre `bloque` y `simulador`.
- [ ] `node src/construir.js` actualiza `diagrama-bloque.html` y `simulador-logico.html`, y pasan los tests de recuadros en ambas herramientas.
