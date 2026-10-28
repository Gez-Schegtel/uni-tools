# Spec 16 — Inclusión de Flechas y Cables en el Recorte de Exportación y Encuadre (`bboxAll()`)

- **ID:** `SPEC-16`
- **Estado:** ✅ Completada
- **Referencia en el informe:** `BUG-12` y Sección `5.4.A.3`
- **Prioridad:** Media (16 / 27)
- **Esfuerzo estimado:** Bajo (~20 minutos)
- **Herramientas afectadas:** Diagramas de bloques y Simulador lógico (`src/comun/ortogonal.js`, `diagrama-bloque.html`, `simulador-logico.html`)

---

## 1. Historia de Usuario

> **Como** usuario que exporta un diagrama de bloques o un circuito lógico a SVG o PNG (sin área de impresión fija) o pulsa `Encuadrar` (`F`),  
> **quiero** que el cálculo de la caja envolvente (`bboxAll()`) tenga en cuenta también el recorrido de las flechas y los cables,  
> **para** que los lazos de realimentación o los tramos desplazados manualmente por fuera de los bloques no salgan cortados ni mutilados en la imagen exportada.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/senales/geometria.js:116-127`](../src/senales/geometria.js), `bboxAll()` recorre tanto `S.nodos` como las curvas de `S.ramas` y devuelve `{ l, t, r, b }`.  
En cambio, en [`src/comun/ortogonal.js:5-11`](../src/comun/ortogonal.js) (compartido por `diagrama-bloque` y `simulador-logico`):

```js
function bboxAll() {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  S.nodes.forEach(n => { const k = rectOf(n); l = Math.min(l, k.l); t = Math.min(t, k.t); r = Math.max(r, k.r); b = Math.max(b, k.b); });
  return { l, t, r, b };
}
```

`bboxAll()` ignora por completo los puntos `pts` de `S.edges` (`diagrama-bloque`) y `S.wires` (`simulador-logico`). Cuando un lazo de realimentación rodea por abajo o por arriba a los bloques a más de `28 px` (el margen `pad` usado por [`recorteExportacion()`](../src/comun/exportar.js) en `src/comun/exportar.js:6-9`), el `viewBox` calculado por [`buildExportSVG()`](../src/comun/exportar.js) corta el trazo del lazo y su etiqueta.

---

## 3. Especificación de la Solución

1. **En [`src/comun/ortogonal.js:5-11`](../src/comun/ortogonal.js):**
   Tras recorrer `S.nodes`, recorrer también las conexiones `S[HERRAMIENTA.conexiones]` y expandir `{ l, t, r, b }` con todos los puntos `p` de `c.pts` (dejando un margen extra de ~18 px cuando una flecha tenga etiqueta `c.label` para que tampoco se corte el texto de la flecha):

   ```js
   function bboxAll() {
     let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
     S.nodes.forEach(n => {
       const k = rectOf(n);
       l = Math.min(l, k.l); t = Math.min(t, k.t);
       r = Math.max(r, k.r); b = Math.max(b, k.b);
     });
     for (const c of (S[HERRAMIENTA.conexiones] || [])) {
       if (!c.pts) continue;
       const pad = c.label ? 18 : 0;
       for (const p of c.pts) {
         l = Math.min(l, p.x - pad); t = Math.min(t, p.y - pad);
         r = Math.max(r, p.x + pad); b = Math.max(b, p.y + pad);
       }
     }
     return { l, t, r, b };
   }
   ```

2. **En `fit()` de [`src/bloque/comandos.js:35-39`](../src/bloque/comandos.js) y [`src/simulador/comandos.js:43-47`](../src/simulador/comandos.js):**
   - En `abrirTexto()` ([`src/comun/documento.js:46`](../src/comun/documento.js)), `fit()` se invoca **antes** de `render()`. Tal como ya hace [`src/senales/interaccion.js:179`](../src/senales/interaccion.js) (`acomodarRamas(); // el encuadre tiene que ver los arcos ya acomodados`), en `bloque` conviene ejecutar `actualizarTamaños(); routeAll();` (y en `simulador`, `routeAll();`) antes de `encuadrar(bboxAll(), 60, 2)` para que `c.pts` ya esté calculado al encuadrar un documento recién abierto.

### 3.1. Garantías de No Regresión
- Se respeta el formato exacto `{ l, t, r, b }` que consumen `encuadrar(b, margen, zoomMax)` ([`src/comun/vista.js:18-19`](../src/comun/vista.js)) y `recorteExportacion()` ([`src/comun/exportar.js:8`](../src/comun/exportar.js)).
- Si se usa una hoja de impresión fija (`hojaActiva()`), `recorteExportacion()` sigue usando `{ x: h.x, y: h.y, w: h.w, h: h.h }` sin cambios.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):
- Agregar un test `"al exportar sin hoja fija, un tramo de flecha corrido lejos de los bloques entra entero en el viewBox del SVG"`:
  - Cargar el ejemplo (`loadExample()`), tomar la flecha de realimentación inferior y desplazar su tramo horizontal `180 px` más abajo (`e.manual = { c: [...] }`, `render()`).
  - Llamar a `buildExportSVG()` y leer su atributo `viewBox` (`[vx, vy, vw, vh]`).
  - Verificar que todos los puntos `p` de todas las flechas `S.edges` cumplan `p.x >= vx && p.x <= vx + vw && p.y >= vy && p.y <= vy + vh`.

---

## 5. Criterios de Aceptación

- [x] Ningún punto `p` de `S.edges` ni de `S.wires` queda fuera del `viewBox` devuelto por `buildExportSVG()` cuando no hay hoja fija activa.
- [x] `fit()` (`Encuadrar`) también encuadra los tramos manuales lejanos dentro de la vista.
- [x] `node src/construir.js` regenera `diagrama-bloque.html` y `simulador-logico.html` y todos los tests de exportación SVG/PNG pasan.
