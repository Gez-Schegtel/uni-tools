# Spec 14 — Sincronización del Editor Flotante de Doble Clic al Desplazar la Hoja

- **ID:** `SPEC-14`
- **Referencia en el informe:** `BUG-18`
- **Prioridad:** Baja (14 / 27)
- **Esfuerzo estimado:** Bajo (~15 minutos)
- **Herramientas afectadas:** Las tres (`src/comun/doble-clic.js`, `src/comun/vista.js`)

---

## 1. Historia de Usuario

> **Como** usuario que hizo doble clic sobre un elemento del lienzo para editar su texto in-situ (`.editor-hoja`),  
> **quiero** que si desplazo la hoja o hago zoom con la rueda del mouse mientras el cuadro de texto está abierto, el cuadro siga anclado a la posición del elemento en la hoja (o confirme y cierre la edición),  
> **para** que el campo de texto no quede flotando desfasado en un lugar arbitrario de la pantalla.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/comun/doble-clic.js:15-31`](../src/comun/doble-clic.js), `editarEnLaHoja(xMundo, yMundo, valor, alGuardar)` crea un `<input class="editor-hoja">` dentro de `#wrap` con coordenadas fijas en píxeles calculadas en el instante de abrirse:

```js
ed.style.left = (S.pan.x + xMundo * S.zoom) + "px";
ed.style.top = (S.pan.y + yMundo * S.zoom) + "px";
```

Si mientras ese `<input>` está abierto el usuario gira la rueda del mouse sobre el lienzo, `instalarRueda()` ([`src/comun/vista.js:29-45`](../src/comun/vista.js) y [`src/senales/interaccion.js:25-43`](../src/senales/interaccion.js)) modifica `S.pan.x`, `S.pan.y` o `S.zoom` y llama a `moverVista()`, desplazando el SVG de fondo mientras `.editor-hoja` permanece inmóvil en las coordenadas viejas de pantalla.

---

## 3. Especificación de la Solución

En [`src/comun/doble-clic.js:15-31`](../src/comun/doble-clic.js), guardar las coordenadas del mundo en `dataset` del input (`ed.dataset.xMundo = xMundo; ed.dataset.yMundo = yMundo;`), y en `moverVista()` ([`src/comun/vista.js:1-4`](../src/comun/vista.js)), si existe `.editor-hoja`, actualizar su `style.left` y `style.top`:

```js
function moverVista() {
  vp.setAttribute("transform", `translate(${S.pan.x},${S.pan.y}) scale(${S.zoom})`);
  stZ.textContent = Math.round(S.zoom * 100) + "%";
  const ed = document.querySelector(".editor-hoja");
  if (ed) {
    ed.style.left = (S.pan.x + (+ed.dataset.xMundo) * S.zoom) + "px";
    ed.style.top = (S.pan.y + (+ed.dataset.yMundo) * S.zoom) + "px";
  }
}
```

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js) (dentro de `test.describe("doble clic para editar el contenido directamente")`, línea 194):
- Agregar un test `"al mover la hoja con la rueda, el editor flotante acompaña al bloque"`:
  - Hacer doble clic sobre un bloque para abrir `.editor-hoja`.
  - Medir `top` inicial de `.editor-hoja`.
  - Girar la rueda del mouse (`await page.mouse.wheel(0, 100)`).
  - Verificar que el `top` de `.editor-hoja` haya cambiado en la misma proporción que `S.pan.y`.

---

## 5. Criterios de Aceptación

- [ ] Al desplazar la hoja o hacer zoom con la rueda mientras `.editor-hoja` está abierto, su posición `left`/`top` se actualiza junto con `moverVista()`.
- [ ] `node src/construir.js` regenera las tres páginas y el nuevo test en `bloque.spec.js` pasa.
