# Spec 33 — Selección de Conexiones (Flechas, Cables y Ramas) con el Recuadro de Selección (`band`)

- **ID:** `SPEC-33`
- **Estado:** ✅ Completada
- **Referencia:** Nuevo requerimiento de UX e interacción del usuario
- **Prioridad:** Media-Alta (Bloque 2 / Interacción en las 3 herramientas)
- **Esfuerzo estimado:** Bajo (~20 minutos)
- **Archivos afectados:**
  - `src/bloque/interaccion.js`
  - `src/simulador/interaccion.js`
  - `src/senales/geometria.js`
  - `src/senales/interaccion.js`
  - `diagrama-bloque.html`, `simulador-logico.html`, `diagrama-señales.html` (generados con `node src/construir.js`)
  - `tests/specs/bloque.spec.js`, `tests/specs/simulador.spec.js`, `tests/specs/senales.spec.js`

---

## 1. Historia de Usuario

> **Como** usuario de `uni-tools` (`diagrama-bloque`, `simulador-logico` y `diagrama-señales`),  
> **quiero** que al arrastrar el recuadro de selección por banda sobre el lienzo queden seleccionadas también todas las conexiones (flechas, cables o ramas) que sean tocadas o atravesadas por dicho recuadro,  
> **para** poder seleccionar una o varias conexiones cómodamente pasando el recuadro sobre ellas sin tener que acertar con un clic exacto sobre cada línea.

---

## 2. Control de Colisiones con el Backlog Existente

Se verificó que esta especificación no colisiona con ninguno de los 32 ítems del backlog:
1. **Compatibilidad con [`SPEC-10`](./10-seleccion-por-banda-acumulativa-en-senales.md) (✅ Completada):**
   - `SPEC-10` incorporó `drag.add` (`Shift` o modo `multi` `X`) a la selección por banda de nodos en `diagrama-señales`.
   - `SPEC-33` mantiene exactamente esa misma semántica acumulativa (`drag.add`) para las conexiones (`S.selEdges`, `S.selW` y `S.selR`).
2. **Compatibilidad con el borrado (`Supr` / `Retroceso`), el inspector (`#insp`) y el portapapeles (`Ctrl+C` / `Ctrl+X`):**
   - `borrar()` en [`src/comun/portapapeles.js:10-15`](../src/comun/portapapeles.js) ya elimina tanto los nodos en `S.sel` como las conexiones en `S[K.selConexiones]` (`S.selEdges`, `S.selW`, `S.selR`).
   - `renderInspector()` en las tres herramientas ya soporta mostrar la sección `Flecha (N)`, `Cable (N)` o `Rama (N)` cuando hay una o más conexiones seleccionadas (tanto solas como junto con elementos).
   - `copiarSel()`, `cortarSel()` y `duplicar()` en [`src/comun/portapapeles.js:16-41`](../src/comun/portapapeles.js) siguen copiando únicamente los elementos de `S.sel` y las conexiones que unen dos elementos seleccionados (para nunca dejar conexiones colgadas al pegar).

---

## 3. Descripción Técnica del Problema Actual

Actualmente, al soltar el recuadro de selección (`drag.kind === "band"`) en `pointerup`:
1. **En `diagrama-bloque` ([`src/bloque/interaccion.js:405-413`](../src/bloque/interaccion.js)):**
   ```js
   } else if (drag.kind === "band") {
     const b = drag.band;
     const R = { l: Math.min(b.x1, b.x2), r: Math.max(b.x1, b.x2), t: Math.min(b.y1, b.y2), b: Math.max(b.y1, b.y2) };
     const inside = S.nodes.filter(n => { const r = rectOf(n); return r.l >= R.l && r.r <= R.r && r.t >= R.t && r.b <= R.b; }).map(n => n.id);
     S.sel = drag.add ? Array.from(new Set(S.sel.concat(inside))) : inside;
   ```
   Sólo busca nodos en `S.nodes` e ignora por completo `S.edges`, dejando `S.selEdges` vacío (o sin cambios).
2. **En `simulador-logico` ([`src/simulador/interaccion.js:142-147`](../src/simulador/interaccion.js)):**
   Sólo busca compuertas en `S.nodes` e ignora `S.wires`, dejando `S.selW` sin actualizar.
3. **En `diagrama-señales` ([`src/senales/interaccion.js:173-181`](../src/senales/interaccion.js)):**
   Sólo busca nodos en `S.nodos` e ignora `S.ramas`, dejando `S.selR` sin actualizar.

---

## 4. Especificación de la Solución

### 4.1. En `diagrama-bloque` ([`src/bloque/interaccion.js:405-413`](../src/bloque/interaccion.js))
Dado que las flechas son polilíneas ortogonales (`e.pts`) y [`src/comun/ortogonal.js:78-87`](../src/comun/ortogonal.js) ya provee `segsOf(pts)` y `segRect(seg, R)` (que comprueba de forma exacta si un tramo ortogonal toca o cruza la caja `R`), cuando el usuario arrastra un recuadro (`R.r - R.l > 2 || R.b - R.t > 2`):

```js
  } else if (drag.kind === "band") {
    const b = drag.band;
    const R = { l: Math.min(b.x1, b.x2), r: Math.max(b.x1, b.x2), t: Math.min(b.y1, b.y2), b: Math.max(b.y1, b.y2) };
    const inside = S.nodes.filter(n => { const r = rectOf(n); return r.l >= R.l && r.r <= R.r && r.t >= R.t && r.b <= R.b; }).map(n => n.id);
    S.sel = drag.add ? Array.from(new Set(S.sel.concat(inside))) : inside;
    if (R.r - R.l > 2 || R.b - R.t > 2) {
      const tocadas = S.edges.filter(e => e.pts && segsOf(e.pts).some(seg => segRect(seg, R))).map(e => e.id);
      S.selEdges = drag.add ? Array.from(new Set(S.selEdges.concat(tocadas))) : tocadas;
    }
```

### 4.2. En `simulador-logico` ([`src/simulador/interaccion.js:142-151`](../src/simulador/interaccion.js))
De forma idéntica, usando `segsOf(w.pts)` y `segRect(seg, R)` sobre `S.wires`:

```js
  } else if (drag.kind === "band") {
    const b = drag.band;
    const R = { l: Math.min(b.x1, b.x2), r: Math.max(b.x1, b.x2), t: Math.min(b.y1, b.y2), b: Math.max(b.y1, b.y2) };
    const dentro = S.nodes.filter(n => { const q = rectOf(n); return q.l >= R.l && q.r <= R.r && q.t >= R.t && q.b <= R.b; }).map(n => n.id);
    S.sel = drag.add ? Array.from(new Set(S.sel.concat(dentro))) : dentro;
    if (R.r - R.l > 2 || R.b - R.t > 2) {
      const tocados = S.wires.filter(w => w.pts && segsOf(w.pts).some(seg => segRect(seg, R))).map(w => w.id);
      S.selW = drag.add ? Array.from(new Set(S.selW.concat(tocados))) : tocados;
    }
```

### 4.3. En `diagrama-señales` ([`src/senales/geometria.js`](../src/senales/geometria.js) y [`src/senales/interaccion.js:173-181`](../src/senales/interaccion.js))
1. En `src/senales/geometria.js`, agregar `ramaTocaCaja(r, l, t, r2, b)` que discretiza la curva Bézier de la rama (cuadrática o autolazo cúbico) en 24 segmentos y comprueba si algún segmento intersecta el rectángulo `[l, r2] × [t, b]`.
2. En `src/senales/interaccion.js:173-181`, seleccionar también las ramas tocadas por la banda:
   ```js
   if (drag.kind === "band") {
     const b = drag.band;
     const l = Math.min(b.x1, b.x2), r = Math.max(b.x1, b.x2);
     const t = Math.min(b.y1, b.y2), bo = Math.max(b.y1, b.y2);
     if (Math.abs(r - l) > 4 || Math.abs(bo - t) > 4) {
       const nuevos = S.nodos.filter(n => n.x >= l && n.x <= r && n.y >= t && n.y <= bo).map(n => n.id);
       const ramas = S.ramas.filter(rm => ramaTocaCaja(rm, l, t, r, bo)).map(rm => rm.id);
       S.sel = drag.add ? Array.from(new Set(S.sel.concat(nuevos))) : nuevos;
       S.selR = drag.add ? Array.from(new Set(S.selR.concat(ramas))) : ramas;
     }
   }
   ```

---

## 5. Plan de Pruebas

1. En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):
   - Agregar un test `"pasar el recuadro de selección sobre una flecha la deja seleccionada"` que arrastre un pequeño recuadro cruzando un tramo de una flecha (sin encerrar ningún bloque) y verifique que `S.selEdges` contenga el ID de esa flecha (y que con `Shift` o modo `X` sume otra flecha).
2. En [`tests/specs/simulador.spec.js`](../tests/specs/simulador.spec.js):
   - Verificar que pasar el recuadro de selección sobre un cable lo seleccione en `S.selW`.
3. En [`tests/specs/senales.spec.js`](../tests/specs/senales.spec.js):
   - Verificar que pasar el recuadro de selección sobre una rama la seleccione en `S.selR`.
4. Regenerar las 3 herramientas con `node src/construir.js` y ejecutar las pruebas en Chromium y Firefox.

---

## 6. Criterios de Aceptación

- [x] Pasar el recuadro de selección (`band`) sobre una o más flechas en `diagrama-bloque` las deja seleccionadas en `S.selEdges`.
- [x] Pasar el recuadro de selección sobre cables en `simulador-logico` o ramas en `diagrama-señales` los deja seleccionados en `S.selW` / `S.selR`.
- [x] Funciona tanto en selección normal como acumulativa (`Shift` o modo `X`).
- [x] `node src/construir.js` actualiza los HTML y todas las pruebas pasan en Chromium y Firefox.
