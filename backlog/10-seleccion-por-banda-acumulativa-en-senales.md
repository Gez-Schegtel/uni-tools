# Spec 10 — Selección por Banda Acumulativa (`Shift` y Modo Selección Múltiple) en `diagrama-señales`

- **ID:** `SPEC-10`
- **Estado:** ✅ Completada
- **Referencia en el informe:** `BUG-09` y Sección `5.4.D.2`
- **Prioridad:** Media / Quick Win (10 / 27)
- **Esfuerzo estimado:** Muy bajo (~15 minutos)
- **Herramientas afectadas:** Diagramas de flujo de señales (`src/senales/interaccion.js`, `diagrama-señales.html`)

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de flujo de señales,  
> **quiero** que al arrastrar un rectángulo de selección (banda) manteniendo apretada la tecla `Shift` o teniendo activo el modo `"Selección múltiple"` (`X`), los nodos encerrados se sumen a los que ya tenía seleccionados en lugar de reemplazarlos,  
> **para** que la selección múltiple funcione de forma consistente con Diagramas de bloques y el Simulador lógico.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/bloque/interaccion.js:179, 344`](../src/bloque/interaccion.js) y [`src/simulador/interaccion.js:90, 146`](../src/simulador/interaccion.js), cuando comienza un arrastre de banda (`drag.kind === "band"`), se guarda `add: sumandoALaSeleccion(ev)` y, al soltar el botón del mouse, si `drag.add` es verdadero se concatenan los nuevos nodos con `S.sel`.

En cambio, en [`src/senales/interaccion.js:98-100`](../src/senales/interaccion.js) y [`165-171`](../src/senales/interaccion.js):

```js
  // En pointerdown (línea 98):
  drag = { kind: "band", x0: w.x, y0: w.y, x1: w.x, y1: w.y };
```
```js
  // En pointerup (líneas 165-171):
  if (drag.kind === "band") {
    const x1 = Math.min(drag.x0, drag.x1), y1 = Math.min(drag.y0, drag.y1);
    const x2 = Math.max(drag.x0, drag.x1), y2 = Math.max(drag.y0, drag.y1);
    if (x2 - x1 > 4 || y2 - y1 > 4) {
      S.sel = S.nodos.filter(n => n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2).map(n => n.id);
      S.selR = [];
    }
  }
```
Siempre sobrescribe `S.sel`, haciendo imposible acumular dos grupos de nodos separados mediante dos bandas con `Shift` o en el modo `S.modo === "multi"`.

---

## 3. Especificación de la Solución

1. En [`src/senales/interaccion.js:98`](../src/senales/interaccion.js), guardar `add: sumandoALaSeleccion(ev)`:
   ```js
   drag = { kind: "band", x0: w.x, y0: w.y, x1: w.x, y1: w.y, add: sumandoALaSeleccion(ev) };
   ```
2. En [`src/senales/interaccion.js:168-170`](../src/senales/interaccion.js), combinar con `S.sel` cuando `drag.add` sea `true`:
   ```js
   if (x2 - x1 > 4 || y2 - y1 > 4) {
     const nuevos = S.nodos.filter(n => n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2).map(n => n.id);
     S.sel = drag.add ? Array.from(new Set(S.sel.concat(nuevos))) : nuevos;
     S.selR = [];
   }
   ```

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/senales.spec.js`](../tests/specs/senales.spec.js):
- Agregar un test `"en modo selección múltiple (X) o con Shift, la banda suma nodos a la selección existente"`:
  - Cargar el ejemplo `"simple"` (4 nodos en fila).
  - Seleccionar el primer nodo (`S.sel = [S.nodos[0].id]; render();`).
  - Activar el modo selección múltiple pulsando `x`.
  - Arrastrar una banda alrededor del tercer nodo (`S.nodos[2]`).
  - Verificar que `S.sel` contenga tanto `S.nodos[0].id` como `S.nodos[2].id`.

---

## 5. Criterios de Aceptación

- [x] Arrastrar una banda con `Shift` o en `S.modo === "multi"` agrega los nodos encerrados a `S.sel` sin perder los ya seleccionados.
- [x] Arrastrar una banda en modo normal (`"select"`) sin `Shift` sigue reemplazando `S.sel`.
- [x] `node src/construir.js` actualiza `diagrama-señales.html` y el nuevo test en `senales.spec.js` pasa.
