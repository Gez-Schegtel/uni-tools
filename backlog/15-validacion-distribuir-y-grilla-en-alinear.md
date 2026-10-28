# Spec 15 — Validación al Distribuir (`dh`/`dv`), Ajuste a Grilla en `alinear()` y Suite de Tests

- **ID:** `SPEC-15`
- **Referencia en el informe:** `BUG-21` y Sección `5.4.A.2`
- **Prioridad:** Baja / Media (15 / 27)
- **Esfuerzo estimado:** Bajo (~25 minutos)
- **Herramientas afectadas:** Diagramas de bloques y Simulador lógico (`src/comun/ortogonal.js`, `diagrama-bloque.html`, `simulador-logico.html`)

---

## 1. Historia de Usuario

> **Como** usuario que utiliza las herramientas de alineación y distribución en el panel derecho al seleccionar varios elementos,  
> **quiero** que todas las opciones de alineación ajusten los elementos a la grilla (`snapV`), y que si intento distribuir horizontal o verticalmente (`dh`/`dv`) teniendo sólo 2 elementos seleccionados el sistema me avise que se requieren al menos 3 sin borrar las rutas manuales de mis flechas/cables ni agregar pasos vacíos al historial,  
> **para** no perder mis trazados manuales cuando una distribución no mueve ningún elemento.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/comun/ortogonal.js:13-35`](../src/comun/ortogonal.js):

```js
function alinear(kind) {
  const ns = S.sel.map(getNode).filter(n => n && !esMarco(n));
  if (ns.length < 2) return;
  const rs = ns.map(n => ({ n, r: rectOf(n) }));
  if (kind === "left")   { const x = Math.min(...rs.map(o => o.r.l)); rs.forEach(o => o.n.x += x - o.r.l); }
  if (kind === "right")  { const x = Math.max(...rs.map(o => o.r.r)); rs.forEach(o => o.n.x += x - o.r.r); }
  if (kind === "top")    { const y = Math.min(...rs.map(o => o.r.t)); rs.forEach(o => o.n.y += y - o.r.t); }
  if (kind === "bottom") { const y = Math.max(...rs.map(o => o.r.b)); rs.forEach(o => o.n.y += y - o.r.b); }
  if (kind === "cx")     { const x = snapV(rs.reduce((s, o) => s + o.n.x, 0) / rs.length); rs.forEach(o => o.n.x = x); }
  if (kind === "cy")     { const y = snapV(rs.reduce((s, o) => s + o.n.y, 0) / rs.length); rs.forEach(o => o.n.y = y); }
  if (kind === "dh" && ns.length >= 3) {
    ...
  }
  if (kind === "dv" && ns.length >= 3) {
    ...
  }
  S[HERRAMIENTA.conexiones].forEach(rutaAuto);
  commit(); render();
}
```

### Problemas detectados
1. **Con 2 elementos seleccionados y `kind === "dh"` o `"dv"`:** La guarda `if (ns.length < 2) return;` deja pasar la ejecución; los bloques `if (kind === "dh" && ns.length >= 3)` no hacen nada; pero a continuación **se ejecuta `S[HERRAMIENTA.conexiones].forEach(rutaAuto)` (que borra todas las rutas manuales de todas las flechas/cables del diagrama)** y se llama a `commit()`, apilando un paso inútil en `undoStack`.
2. **Alineaciones `left`, `right`, `top` y `bottom` sin `snapV()`:** Si un bloque tiene un ancho cuya mitad no es múltiplo de `SNAP` (p. ej. `w = 72`, `w/2 = 36`, `r.l = x - 36`), al alinear a la izquierda un nodo de otro ancho (p. ej. un sumador con `r = 16`), su nuevo centro `o.n.x` queda fuera de la grilla de 10 px, a diferencia de `cx`, `cy`, `dh` y `dv` que sí aplican `snapV()`.
3. **`rutaAuto` global en vez de afectar sólo a las conexiones de los nodos movidos:** Al alinear 2 nodos en una esquina del diagrama, `S[HERRAMIENTA.conexiones].forEach(rutaAuto)` resetea las rutas manuales de **todas** las conexiones del documento, incluso las que unen nodos que no estaban seleccionados ni se movieron.
4. **Cero cobertura de tests:** No hay ningún test para `alinear()` en toda la carpeta `tests/`.

---

## 3. Especificación de la Solución

En [`src/comun/ortogonal.js:13-35`](../src/comun/ortogonal.js):
1. Si `(kind === "dh" || kind === "dv") && ns.length < 3`, mostrar `toast("Elegí al menos 3 elementos para distribuir"); return;`.
2. Aplicar `snapV()` a las nuevas posiciones `o.n.x` / `o.n.y` en `left`, `right`, `top` y `bottom`.
3. Llamar a `rutaAuto(c)` únicamente sobre las conexiones que tocan alguno de los nodos alineados (`const movidos = new Set(ns.map(n => n.id)); S[HERRAMIENTA.conexiones].forEach(c => { if (movidos.has(c.from.id) || movidos.has(c.to.id)) rutaAuto(c); });`).

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/comun.spec.js`](../tests/specs/comun.spec.js) (o en `bloque.spec.js`):
- Agregar un bloque de pruebas para `alinear`:
  1. Verificar que `alinear("left")`, `alinear("right")`, `alinear("top")`, `alinear("bottom")`, `alinear("cx")` y `alinear("cy")` alineen correctamente 2 o más nodos seleccionados y se puedan deshacer con `Ctrl+Z`.
  2. Verificar que `alinear("dh")` y `alinear("dv")` con 3 nodos los dejen a igual distancia entre sí.
  3. Verificar que con sólo 2 nodos seleccionados, pulsar Distribuir (`dh` o `dv`) muestre el aviso `"Elegí al menos 3 elementos para distribuir"`, no agregue pasos a `undoStack` y no borre las rutas manuales existentes.

---

## 5. Criterios de Aceptación

- [ ] `alinear("dh")` y `alinear("dv")` con menos de 3 elementos avisan con `toast` y no modifican rutas ni historial.
- [ ] Al alinear elementos, sólo se recalcula la ruta automática de las conexiones vinculadas a los nodos alineados.
- [ ] Existen tests automatizados para todas las variantes de `alinear()`.
- [ ] `node src/construir.js` regenera las páginas y los tests pasan en Chromium y Firefox.
