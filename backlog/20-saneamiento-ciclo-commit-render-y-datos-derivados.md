# Spec 20 — Saneamiento del Ciclo `commit() / render()` y Limpieza de Datos Derivados

- **ID:** `SPEC-20`
- **Referencia en el informe:** `BUG-06` y Sección `2.2.B`
- **Prioridad:** Media (20 / 27)
- **Esfuerzo estimado:** Medio (~45 minutos)
- **Herramientas afectadas:** Las tres (`src/comun/historial.js`, `src/bloque/modelo.js`, `src/bloque/dibujo.js`, `src/simulador/dibujo.js`, `src/senales/modelo.js`, `src/senales/dibujo.js`)

---

## 1. Historia de Usuario

> **Como** usuario de cualquiera de las tres herramientas,  
> **quiero** que cada paso guardado en el historial (`commit()`) y cada archivo exportado (`docDatos()`) contenga los tamaños de bloque, rutas manuales y estados ya actualizados al instante del cambio (y sin inflar el JSON con puntos de ruta automáticos redundantes),  
> **para** que al deshacer (`Ctrl+Z`) o abrir un archivo guardado la geometría coincida exactamente con ese paso sin desfases de un fotograma.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En las tres herramientas, las funciones que actualizan propiedades geométricas derivadas dentro de `S` se invocan recién adentro de `render()`:
- En `diagrama-bloque` ([`src/bloque/dibujo.js:141-142`](../src/bloque/dibujo.js)): `actualizarTamaños()` (actualiza `n.w` y `n.h` de cada bloque según su ecuación) y `routeAll()` (actualiza `e.pts` de cada flecha).
- En `simulador-logico` ([`src/simulador/dibujo.js:121-122`](../src/simulador/dibujo.js)): `correr()` y `routeAll()`.
- En `diagrama-señales` ([`src/senales/dibujo.js:121`](../src/senales/dibujo.js)): `acomodarRamas()`.

Como todos los manejadores de eventos hacen:
```js
modificar(S);
commit();   // <-- snapshot() guarda S ANTES de actualizarTamaños() / routeAll()
render();   // <-- recién acá se actualizan n.w, n.h, e.pts
```
el `snapshot()` guardado en `lastSnap` / `undoStack` ([`src/comun/historial.js:8-14`](../src/comun/historial.js)) tiene los tamaños `n.w, n.h` y los puntos `e.pts` **viejos** (del estado anterior).
Además:
- En [`src/simulador/modelo.js:46`](../src/simulador/modelo.js), `docDatos()` limpia `pts` al serializar cables (`S.wires.map(w => ({ id: w.id, from: w.from, to: w.to, variant: w.variant, color: w.color }))`).
- En cambio, [`src/bloque/modelo.js:31`](../src/bloque/modelo.js) serializa `edges: S.edges` crudo en `docDatos()`, guardando el arreglo `pts` en el JSON (mientras que la ruta manual real se guarda en `e.manual = { c: [...] }`, como se ve en [`src/bloque/modelo.js:72`](../src/bloque/modelo.js) y [`src/bloque/ruteo.js:80`](../src/bloque/ruteo.js)).

---

## 3. Especificación de la Solución

1. **En [`src/bloque/modelo.js:31`](../src/bloque/modelo.js) (`docDatos()`):**
   - Asegurar que `actualizarTamaños()` se ejecute antes de serializar `S.nodes` en `docDatos()` (si `typeof actualizarTamaños === "function"`), y mapear `S.edges` sin la propiedad transitoria `pts` (conservando `e.manual`, que contiene `{ c: [...] }` cuando el usuario corrió tramos a mano):
     ```js
     function docDatos() {
       if (typeof actualizarTamaños === "function") actualizarTamaños();
       return {
         version: VERSION_DOC,
         nombre: limpiarNombre(S.nombre),
         nodes: S.nodes,
         edges: S.edges.map(e => { const c = Object.assign({}, e); delete c.pts; return c; }),
         tema: S.tema,
         hoja: S.hoja
       };
     }
     ```
2. **Garantías de No Regresión:**
   - En `diagrama-bloque`, las rutas manuales viven en `e.manual = { c: [...] }` (no en `e.pts`), y `routeEdge(e)` ([`src/bloque/ruteo.js:80-108`](../src/bloque/ruteo.js)) reconstruye `e.pts` a partir de `e.manual.c` en cada `routeAll()`.
   - Por lo tanto, al omitir `e.pts` en `docDatos()`, los tests [`tests/specs/bloque.spec.js:299-319`](../tests/specs/bloque.spec.js) (`"la flecha con ruta a mano copiada conserva su forma"`) y el deshacer/rehacer de tramos manuales siguen funcionando exactamente igual, pero el JSON exportado queda limpio y `snapshot()` captura siempre los `n.w` y `n.h` ya actualizados.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

1. **En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):**
   - Agregar un test `"al cambiar la ecuación de un bloque, snapshot() ya tiene el tamaño nuevo y docDatos() no guarda pts transitorios"`:
     - Cambiar `n.label` de un bloque por una fracción alta (`"\\frac{K}{s^2+2\\zeta\\omega_ns+\\omega_n^2}"`), hacer `commit(); render();`.
     - Verificar que `JSON.parse(lastSnap).nodes` ya tenga el `w` y `h` agrandados del bloque.
     - Verificar que en `docDatos().edges`, ningún elemento tenga la propiedad transitoria `pts`, mientras que una flecha con ruta manual conserve `e.manual.c` y al abrir ese JSON reconstruya exactamente los mismos `e.pts`.

---

## 5. Criterios de Aceptación

- [ ] `commit()` captura los tamaños `n.w` y `n.h` ya actualizados cuando cambia la ecuación o fuente de un bloque.
- [ ] `docDatos()` en `diagrama-bloque` sólo serializa `pts` en las flechas cuya ruta fue fijada a mano (`e.manual === true`).
- [ ] Las flechas con ruta manual siguen conservando su forma al deshacer/rehacer, copiar/pegar y guardar/abrir.
- [ ] `node src/construir.js` actualiza las páginas y todos los tests pasan.
