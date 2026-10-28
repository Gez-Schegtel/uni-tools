# Spec 11 — Cierre Limpio de la Creación de Rama en Dos Pasos (`curve-new`) en `diagrama-señales`

- **ID:** `SPEC-11`
- **Estado:** ✅ Completada
- **Referencia en el informe:** `BUG-08` y Sección `5.4.D.1`
- **Prioridad:** Media (11 / 27)
- **Esfuerzo estimado:** Bajo (~25 minutos)
- **Herramientas afectadas:** Diagramas de flujo de señales (`src/senales/interaccion.js`, `src/senales/barra.js`, `diagrama-señales.html`)

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de flujo de señales,  
> **quiero** que cuando termino de unir dos nodos con una rama nueva y estoy en el paso de ajustar su curvatura (`curve-new`), si presiono `Esc`, cambio de modo en la barra o abro una ventana (como Análisis de Mason o Guardar), la rama quede debidamente confirmada en el historial y deje de seguir al puntero del mouse,  
> **para** que la creación de la rama se pueda deshacer con `Ctrl+Z` y no quede el modo de curvado colgado indefinidamente.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/senales/interaccion.js:150-161`](../src/senales/interaccion.js), cuando el usuario suelta el mouse sobre un nodo destino `hit.id !== drag.de` al crear una rama:

```js
const r = nuevaRama(drag.de, hit.id);
S.ramas.push(r);
S.sel = []; S.selR = [r.id];
drag = { kind: "curve-new", rid: r.id };
toast("Mové el mouse para curvar la rama · clic para fijar");
render();
return;
```

Nótese que en ese momento **no se llama a `commit()`**. El `commit()` recién ocurre cuando el usuario hace un segundo clic sobre el `#canvas` ([`src/senales/interaccion.js:61-63`](../src/senales/interaccion.js)):

```js
if (drag && drag.kind === "curve-new") {
  drag = null; commit(); render(); return;
}
```

### Qué falla
1. Si durante `curve-new` el usuario aprieta `Esc`, [`alEscape()`](../src/senales/barra.js) (`src/senales/barra.js:23-26`) hace:
   ```js
   function alEscape() {
     S.sel = []; S.selR = [];
     setModo("select"); render();
   }
   ```
   **No limpia `drag = null` ni llama a `commit()`**. La rama sigue doblándose con cada movimiento del mouse y nunca quedó guardada en `undoStack`.
2. Si durante `curve-new` el usuario hace clic en cualquier botón de la barra superior (`#m-select`, `#m-nodo`, `#b-mason`, `#b-save`, etc.), `setModo()` tampoco cierra `curve-new`: el cambio queda sin `commit()` y `drag` sigue activo al volver al lienzo.

---

## 3. Especificación de la Solución

1. En [`src/senales/interaccion.js`](../src/senales/interaccion.js), definir una función auxiliar `cerrarCurvaNueva()`:
   ```js
   function cerrarCurvaNueva() {
     if (drag && drag.kind === "curve-new") {
       drag = null;
       commit();
     }
   }
   ```
2. Usar `cerrarCurvaNueva()`:
   - En el `pointerdown` de `#canvas` (`src/senales/interaccion.js:61-63`):
     ```js
     if (drag && drag.kind === "curve-new") {
       cerrarCurvaNueva(); render(); return;
     }
     ```
   - En `setModo(m)` (`src/senales/barra.js:3-9`), llamar a `cerrarCurvaNueva()` al principio antes de cambiar de modo.
   - En `alEscape()` (`src/senales/barra.js:23-26`), llamar a `cerrarCurvaNueva()` antes de limpiar la selección y volver a `"select"`.
   - En `mostrarMason()` (`src/senales/mason-vista.js:9`), llamar a `cerrarCurvaNueva()` al abrir la ventana de análisis.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/senales.spec.js`](../tests/specs/senales.spec.js):
1. Agregar un test `"crear una rama arrastrando entre dos nodos, curvarla y fijarla con clic o con Esc la deja en el historial"`:
   - Pasar a modo rama (`await page.keyboard.press("r")`).
   - Arrastrar con el mouse desde el primer nodo hasta el tercer nodo.
   - Verificar que `drag.kind` sea `"curve-new"` y que mover el mouse cambie `r.curva`.
   - Hacer clic sobre el lienzo para fijar: verificar que `drag` sea `null` y que un `Ctrl+Z` (`undo()`) deshaga la creación de la rama.
   - Repetir el arrastre para crear otra rama y, estando en `curve-new`, apretar `Escape`: verificar que `drag` pase a `null`, que mover el mouse ya no cambie `r.curva` y que `Ctrl+Z` deshaga la rama creada.

---

## 5. Criterios de Aceptación

- [x] Apretar `Esc`, cambiar de modo o abrir Análisis mientras se está en `curve-new` fija la rama, registra el paso en `undoStack` (`commit()`) y limpia `drag = null`.
- [x] `Ctrl+Z` deshace limpiamente una rama recién creada tanto si se fijó con clic como si se cerró con `Esc` o cambio de herramienta.
- [x] `node src/construir.js` actualiza `diagrama-señales.html` y el nuevo test en `senales.spec.js` pasa.
