# Spec 12 — Cancelación Limpia de Herramienta Pendiente (`pendiente`) en `simulador-logico`

- **ID:** `SPEC-12`
- **Referencia en el informe:** `BUG-22`
- **Prioridad:** Media / Baja (12 / 27)
- **Esfuerzo estimado:** Bajo (~15 minutos)
- **Herramientas afectadas:** Simulador de circuitos lógicos (`src/simulador/interaccion.js`, `simulador-logico.html`)

---

## 1. Historia de Usuario

> **Como** usuario del Simulador de circuitos lógicos,  
> **quiero** que si seleccioné un componente en la paleta flotante (p. ej. apretando `1` para colocar una compuerta `AND`), pero en lugar de hacer clic en el fondo vacío decido arrastrar una compuerta existente, tirar un cable desde una pata o seleccionar un cable, la herramienta pendiente se desactive automáticamente,  
> **para** que más adelante, cuando haga clic en el fondo vacío para deseleccionar, no se coloque por sorpresa aquella compuerta que había quedado pendiente.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/simulador/interaccion.js:64-92`](../src/simulador/interaccion.js), dentro del manejador `pointerdown` de `svgEl`:

1. Primero se evalúan los clics sobre llaves/pulsadores (`if (sw)`, línea 65), sobre patas (`const p = pinCerca(w); if (p)`, línea 70), sobre tramos de cable (`const h = hitSeg(w.x, w.y); if (h)`, línea 77) y sobre nodos existentes (`const nid = nodoCerca(w); if (nid)`, línea 84).
2. Recién si el clic cae en el fondo vacío se inicia `drag = { kind: "band", ... }` (línea 91), y al soltar el botón sin haber arrastrado (`pointerup`, líneas 144-147) se evalúa `if (pendiente)`:
   ```js
   if (pendiente) {
     const n = makeNode(pendiente, snapV(drag.x0), snapV(drag.y0));
     S.nodes.push(n); S.sel = [n.id]; S.selW = [];
     setPendiente(null); commit();
   }
   ```
3. Si el usuario activó `pendiente = "and"` pero luego hizo clic sobre un nodo existente (`if (nid)`), sobre un pin (`if (p)`), sobre un cable (`if (h)`) o sobre una llave (`if (sw)`), `pendiente` **sigue valiendo `"and"`** (y el botón de la paleta sigue encendido con `.on`). Cuando minutos después hace clic sobre el fondo vacío con la intención de limpiar la selección, se dispara el `if (pendiente)` de la línea 144 y le inserta una compuerta `AND` no deseada.

---

## 3. Especificación de la Solución

En [`src/simulador/interaccion.js:64-89`](../src/simulador/interaccion.js), si `pendiente` está activo pero el usuario inicia una acción sobre una llave (`sw`), un pin (`p`), un tramo de cable (`h`) o un nodo existente (`nid`), cancelar la herramienta pendiente llamando a `setPendiente(null);` al entrar en cualquiera de esas ramas:

```js
  if (sw) {
    if (pendiente) setPendiente(null);
    ...
  }
  const p = pinCerca(w);
  if (p) {
    if (pendiente) setPendiente(null);
    ...
  }
  const h = hitSeg(w.x, w.y);
  if (h) {
    if (pendiente) setPendiente(null);
    ...
  }
  const nid = nodoCerca(w);
  if (nid) {
    if (pendiente) setPendiente(null);
    ...
  }
```

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/simulador.spec.js`](../tests/specs/simulador.spec.js):
- Agregar un test `"elegir una compuerta en la paleta y luego tocar un elemento existente suelta la herramienta pendiente"`:
  - Cargar `"half"`.
  - Presionar la tecla `"1"` (`pendiente` pasa a `"and"`).
  - Hacer clic sobre una entrada existente del circuito.
  - Verificar que `pendiente` sea `null` y que ningún botón `.ptool.on` quede marcado en la paleta.
  - Hacer clic en un punto vacío del fondo y verificar que no se agregue ninguna compuerta nueva (`S.nodes.length` no cambia).

---

## 5. Criterios de Aceptación

- [ ] Interactuar con un pin, un nodo o un cable mientras había una herramienta `pendiente` activa limpia `setPendiente(null)`.
- [ ] Un clic posterior en el fondo vacío simplemente deselecciona sin insertar elementos fantasma.
- [ ] `node src/construir.js` actualiza `simulador-logico.html` y el nuevo test en `simulador.spec.js` pasa.
