# Spec 29 — Estabilidad de los Puertos de Conexión al Pasar el Cursor (Sin Titileo)

- **ID:** `SPEC-29`
- **Estado:** ✅ Completada
- **Origen:** Pedido directo del usuario (Punto 3)
- **Prioridad:** Alta / UX (Integrada al Bloque 2)
- **Esfuerzo estimado:** Bajo (~25 minutos)
- **Herramientas afectadas:** Diagramas de bloques (`src/bloque/interaccion.js`, `src/bloque/dibujo.js`, `diagrama-bloque.html`)

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de bloques,  
> **quiero** que al acercar el cursor a un elemento para tirar una conexión desde uno de sus círculos azules perimetrales (`.port`), dichos círculos permanezcan completamente firmes sin titilar ni desaparecer cuando apoyo el puntero sobre ellos,  
> **para** poder hacer clic y arrastrar conexiones con total comodidad.

---

## 2. Descripción Técnica del Problema (Causa Raíz Exacta del Titileo)

En [`src/bloque/interaccion.js:2-4, 273-276`](../src/bloque/interaccion.js):

```js
function hitNode(target) {
  const g = target.closest ? target.closest("[data-id]") : null;
  return g ? g.getAttribute("data-id") : null;
}
...
  if (!drag) {
    const nid = hitNode(ev.target);
    if (nid !== hoverNode) { hoverNode = nid; render(); }
    return;
  }
```

### Por qué titila hoy paso a paso
1. El puntero del mouse entra al borde de un bloque o sumador (`<g class="node" data-id="n1">` en la capa `#nodes`).
2. `hitNode(ev.target)` devuelve `"n1"`. `hoverNode` pasa a `"n1"` y se llama a `render()`.
3. `renderPorts()` ([`src/bloque/dibujo.js:65-86`](../src/bloque/dibujo.js)) dibuja los 4 `<circle class="port" data-port="r" data-pid="n1">` en la capa superior **`#overlay` (`gOv`)**, justo sobre el perímetro del bloque donde está el cursor.
4. En cuanto el mouse se mueve 1 píxel sobre el propio círculo `.port`, **`ev.target` pasa a ser `<circle class="port" data-pid="n1">`**.
5. Como `<circle class="port">` está en `#overlay` (fuera de `<g data-id="n1">`) y tiene el atributo `data-pid` en vez de `data-id`, **`hitNode(ev.target)` devuelve `null`**.
6. Al dar `null !== hoverNode`, el código hace `hoverNode = null; render();` y **borra el círculo `.port` que estaba debajo del cursor**.
7. Al desaparecer el círculo `.port`, el elemento bajo el cursor vuelve a ser el bloque (`data-id="n1"`), que en el siguiente píxel vuelve a encender `hoverNode = "n1"`, vuelve a crear el `.port`, que vuelve a dar `null` y vuelve a borrarse, produciendo el **titileo constante** que impide hacer clic cómodamente.
8. Además, en una bifurcación (`type === "node"`), los 4 puertos se dibujan a `15 px` del centro (`src/bloque/dibujo.js:76`), pero el área del nodo en `#nodes` sólo llega hasta `r = 11` (`src/bloque/dibujo.js:30`): al mover el cursor desde el centro de la bifurcación hacia uno de sus puertos, en la franja entre `11 px` y `15 px` `hitNode` da `null` y los puertos desaparecen antes de llegar a tocarlos.

---

## 3. Especificación de la Solución

### 3.1. En `src/bloque/interaccion.js`
Crear una función dedicada `nodoParaPuertos(ev, w)` para el cálculo de `hoverNode` en `pointermove` (`!drag`):
1. Si `ev.target` es un puerto (`.port` con `data-pid`), devolver inmediatamente `ev.target.getAttribute("data-pid")` (de modo que estar encima de un `.port` **jamás** apague `hoverNode`).
2. Si `hitNode(ev.target)` devuelve un nodo no marco, devolver ese `id`.
3. Si no, buscar por cercanía geométrica (`w`) con un margen cómodo alrededor de cada elemento que cubra el radio de los puertos (`12 px` alrededor de `rectOf(n)` para bloques/sumadores/io, y `22 px` desde el centro para bifurcaciones `type === "node"`), dando prioridad a mantener el `hoverNode` actual si el puntero sigue dentro de su margen (histéresis de `4 px` para evitar cualquier rebote en el límite exterior):

```js
function nodoCercaDePuertos(ev, w) {
  const t = ev.target;
  if (t && t.getAttribute && t.getAttribute("data-pid")) return t.getAttribute("data-pid");
  const directo = hitNode(t);
  if (directo && !esMarco(getNode(directo))) return directo;
  let mejor = null, mejorDist = 1e9;
  for (const n of S.nodes) {
    if (esMarco(n) || n.type === "text") continue;
    const extra = n.id === hoverNode ? 4 : 0;
    if (n.type === "node") {
      const d = Math.hypot(w.x - n.x, w.y - n.y);
      if (d <= 22 + extra && d < mejorDist) { mejorDist = d; mejor = n.id; }
      continue;
    }
    const R = rectOf(n), m = 10 + extra;
    const dx = Math.max(R.l - m - w.x, 0, w.x - (R.r + m));
    const dy = Math.max(R.t - m - w.y, 0, w.y - (R.b + m));
    if (dx === 0 && dy === 0) {
      const d = Math.hypot(w.x - n.x, w.y - n.y);
      if (d < mejorDist) { mejorDist = d; mejor = n.id; }
    }
  }
  return mejor;
}
```
Y en `pointermove` (`src/bloque/interaccion.js:273-276`):
```js
  if (!drag) {
    const nid = nodoCercaDePuertos(ev, w);
    if (nid !== hoverNode) { hoverNode = nid; render(); }
    return;
  }
```
*(Nota: revisar también en `src/simulador/dibujo.js:165` que en `simulador-logico`, cuando `ev.target` tiene `data-pid`, `hoverNode` conserve `t.getAttribute("data-pid")` para que tampoco titile en compuertas grandes o rotadas).*

### 3.2. Coordinación sin colisión con `SPEC-21`
- [`SPEC-21`](./21-optimizacion-hover-sin-redibujado-completo-y-caches-acotadas.md) quedó actualizada para usar esta misma función `nodoCercaDePuertos(ev, w)` cuando optimice `render()` → `renderOverlay()`.

---

## 4. Plan de Pruebas (Tests a agregar)

En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):
- Agregar un test `"al pasar el mouse sobre un bloque y luego sobre su puerto perimetral, el puerto no titila ni desaparece"`:
  - Mover el mouse al centro de un bloque (`hoverNode` pasa a ser el bloque y aparecen sus 4 `.port`).
  - Mover el mouse paso a paso hasta el centro exacto del `<circle class="port" data-port="r">` en el borde derecho del bloque (y también probar lo mismo sobre el puerto a `15 px` de una bifurcación `node`).
  - Verificar que `hoverNode` siga siendo el `id` del elemento y que los 4 `.port` permanezcan visibles y clickeables en todo momento.

---

## 5. Criterios de Aceptación

- [x] Apoyar el puntero sobre cualquiera de los círculos `.port` de un bloque, sumador, entrada/salida o bifurcación nunca apaga `hoverNode` ni hace titilar el círculo.
- [x] Mover el cursor desde el centro de una bifurcación (`node`) hacia cualquiera de sus 4 puertos a 15 px mantiene los puertos visibles durante todo el trayecto.
- [x] `node src/construir.js` actualiza `diagrama-bloque.html` y el nuevo test pasa en Chromium y Firefox.
