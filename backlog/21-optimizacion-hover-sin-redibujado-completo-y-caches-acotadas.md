# Spec 21 — Optimización de `pointermove` sin Arrastre, Cachés de Ecuaciones Acotadas y Reemplazo de `unescape()`

- **ID:** `SPEC-21`
- **Referencia en el informe:** Secciones `4.1`, `4.2` y `4.3`
- **Prioridad:** Media / Baja (21 / 27)
- **Esfuerzo estimado:** Medio (~45 minutos)
- **Herramientas afectadas:** Las tres (`src/bloque/interaccion.js`, `src/bloque/dibujo.js`, `src/bloque/ecuaciones.js`, `src/simulador/interaccion.js`, `src/comun/documento.js`)

---

## 1. Historia de Usuario

> **Como** usuario de `uni-tools`,  
> **quiero** que mover el puntero del mouse por encima del lienzo sin arrastrar nada no provoque la destrucción y recreación completa de todo el DOM SVG ni del panel derecho, que las cachés de ecuaciones tengan un límite máximo de memoria y que la codificación Base64 no utilice funciones obsoletas del estándar JS,  
> **para** que la interfaz sea más ágil, consuma menos CPU/memoria en sesiones largas y no dependa de APIs deprecadas.

---

## 2. Descripción Técnica de los Problemas (Causa Raíz)

1. **Redibujado destructivo total en `pointermove` cuando `!drag`:**
   - En [`src/bloque/interaccion.js:206-214`](../src/bloque/interaccion.js):
     ```js
     if (!drag) {
       ...
       if (near !== hoverNode) { hoverNode = near; render(); }
       return;
     }
     ```
     Cada vez que el mouse se acerca o se aleja de un bloque, `render()` vacía `gAtras`, `gEdges`, `gNodes`, `gOv` (`textContent = ""`), vuelve a rutear todas las flechas y **vuelve a ejecutar `renderInspector()`** (reconstruyendo `box.innerHTML` del panel derecho aunque la selección no cambió en absoluto).
   - En [`src/simulador/interaccion.js:97-100`](../src/simulador/interaccion.js):
     ```js
     if (!drag) {
       const h = hitSeg(w.x, w.y);
       if ((h && (!hoverSeg || hoverSeg.w !== h.w || hoverSeg.seg !== h.seg)) || (!h && hoverSeg)) {
         hoverSeg = h; render();
       }
       return;
     }
     ```
     Además de reconstruir todo el DOM y el panel `#insp`, `render()` en el simulador vuelve a correr `correr()` (re-simulando todas las compuertas del circuito) sólo para cambiar el cursor sobre un tramo de cable.

2. **Cachés de ecuaciones sin límite (`src/bloque/ecuaciones.js:160, 245`):**
   - `_mcache = new Map()` y `_bcache = new Map()` guardan cada cadena evaluada durante toda la sesión sin desalojar entradas antiguas (cuando el usuario escribe en `#n-lab`, cada pulsación de tecla agrega una clave distinta).

3. **Uso de `unescape()` deprecado (`src/comun/documento.js:69`):**
   - `function aBase64(s) { return btoa(unescape(encodeURIComponent(s))); }` utiliza `unescape()`, deprecada en el estándar ECMAScript.

---

## 3. Especificación de la Solución

### 3.1. Redibujar únicamente la capa `gOv` (puertos/pines) cuando cambia `hoverNode` sin arrastre (`!drag`)
- **⚠️ Garantía Crítica de No Regresión:** En [`src/bloque/dibujo.js:65-75`](../src/bloque/dibujo.js) (`renderPorts()`) y [`src/simulador/dibujo.js:146-161`](../src/simulador/dibujo.js) (`renderPins()`), los puertos/pines azules de conexión se dibujan dentro de la capa `gOv` para los nodos seleccionados **y para el nodo `hoverNode`** (`S.nodes.filter(n => ids.has(n.id) || n.id === hoverNode)`). Si al cambiar `hoverNode` sólo se alternara una clase CSS sin actualizar `gOv`, dejarían de aparecer los puertos/pines al acercar el mouse a un bloque o compuerta.
- Por lo tanto, la optimización segura cuando cambia `hoverNode` con `!drag` consiste en:
  - En [`src/bloque/dibujo.js`](../src/bloque/dibujo.js), extraer una función liviana `renderOverlay()` que sólo actualice `gOv`:
    ```js
    function renderOverlay() {
      gOv.textContent = "";
      renderHoja();
      renderPorts();
      renderHandles();
      renderSegHandles();
    }
    ```
  - En [`src/simulador/dibujo.js`](../src/simulador/dibujo.js), extraer `renderOverlay()`:
    ```js
    function renderOverlay() {
      gOv.textContent = "";
      renderHoja();
      renderPins();
      renderSegHandles();
    }
    ```
  - En `pointermove` (`!drag`) de [`src/bloque/interaccion.js:274`](../src/bloque/interaccion.js) y [`src/simulador/interaccion.js:103`](../src/simulador/interaccion.js), llamar a `renderOverlay()` en lugar de `render()`. De esta manera **los puertos y pines siguen mostrándose exactamente igual al pasar el mouse**, pero se evita ejecutar `actualizarTamaños()`, `correr()`, `routeAll()`, la reconstrucción de `gEdges`/`gNodes` y `renderInspector()`.

### 3.2. Acotar `_mcache` y `_bcache` en `src/bloque/ecuaciones.js`
- Antes de hacer `.set(k, v)` en `_mcache` (línea 172) y en `_bcache` (línea 254), si `map.size >= 500`, eliminar la clave más antigua: `map.delete(map.keys().next().value);`.

### 3.3. Reemplazar `unescape()` en `src/comun/documento.js:69`
```js
const aBase64 = (s) => btoa(encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16))));
```

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/lienzo.spec.js`](../tests/specs/lienzo.spec.js):
- Agregar un test `"mover el mouse sobre los elementos sin arrastrar muestra los puertos/pines en gOv sin reconstruir gNodes ni el panel #insp"`:
  - Mover el mouse sobre un bloque en `diagrama-bloque` y sobre una compuerta en `simulador-logico` sin apretar botones.
  - Verificar que en `gOv` aparezcan los `.port` / `.pin` del elemento bajo el cursor, y que la referencia a los nodos en `#nodes` y a los controles en `#insp` sea exactamente la misma instancia DOM antes y después del movimiento.

---

## 5. Criterios de Aceptación

- [ ] Mover el puntero sin arrastrar (`!drag`) no invoca `render()` en ninguna de las tres herramientas; en `diagrama-bloque` los puertos del bloque bajo el cursor siguen mostrándose con la clase `.hover`.
- [ ] `_mcache` y `_bcache` nunca superan las 500 entradas.
- [ ] No quedan usos de `unescape()` en el código fuente.
- [ ] `node src/construir.js` actualiza las tres páginas y todos los tests pasan.
