# Spec 09 — Invocar `autoguardar()` en `undo()` y `redo()` (`src/comun/historial.js`)

- **ID:** `SPEC-09`
- **Estado:** ✅ Completada
- **Referencia en el informe:** `BUG-19` y Sección `5.4.A.4`
- **Prioridad:** Media / Quick Win (9 / 27)
- **Esfuerzo estimado:** Muy bajo (~10 minutos)
- **Herramientas afectadas:** Las tres (`src/comun/historial.js`, `diagrama-bloque.html`, `simulador-logico.html`, `diagrama-señales.html`)

---

## 1. Historia de Usuario

> **Como** usuario de cualquiera de las tres herramientas,  
> **quiero** que al deshacer (`Ctrl+Z`) o rehacer (`Ctrl+Y`) un cambio se programe automáticamente el autoguardado en `localStorage`,  
> **para** que si el navegador se cierra inesperadamente o abro la portada en otra pestaña sin recargar la actual, el estado guardado refleje los pasos deshechos o rehechos.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/comun/historial.js:11-24`](../src/comun/historial.js):

```js
function commit() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  autoguardar();
}
function undo() {
  if (undoStack.length <= 1) return;
  redoStack.push(undoStack.pop());
  restore(undoStack[undoStack.length - 1]);
}
function redo() {
  if (!redoStack.length) return;
  const s = redoStack.pop();
  undoStack.push(s);
  restore(s);
}
```

Mientras `commit()` llama a `autoguardar()`, ni `undo()` ni `redo()` lo hacen. Hoy el test en [`tests/specs/inicio.spec.js:66-76`](../tests/specs/inicio.spec.js) pasa únicamente porque ejecuta `await page.reload()`, lo cual dispara el listener `window.addEventListener("pagehide", guardarAhora)` ([`src/comun/autoguardado.js:23`](../src/comun/autoguardado.js)). Si no ocurre `pagehide` (por ejemplo, si el usuario deshace todo hasta dejar la hoja vacía y abre `index.html` en otra pestaña, o si la pestaña se cierra de forma abrupta), `localStorage` conserva el estado viejo previo al `undo()`.

---

## 3. Especificación de la Solución

En [`src/comun/historial.js:15-24`](../src/comun/historial.js), agregar `autoguardar();` al final de `undo()` y de `redo()`:

```js
function undo() {
  if (undoStack.length <= 1) return;
  redoStack.push(undoStack.pop());
  restore(undoStack[undoStack.length - 1]);
  autoguardar();
}
function redo() {
  if (!redoStack.length) return;
  const s = redoStack.pop();
  undoStack.push(s);
  restore(s);
  autoguardar();
}
```

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/inicio.spec.js`](../tests/specs/inicio.spec.js):
- En el test `"se guarda solo, también lo deshecho, y sobrevive a recargar la página"` (líneas 66-76), verificar que **antes** de hacer `page.reload()` (esperando los ~450 ms del debounce de `autoguardar()` o usando `expect.poll`), el contenido de `localStorage.getItem("uni-tools-autoguardado-" + h.clave)` ya se haya actualizado reflejando el `undo()`, y también verificar lo mismo tras un `redo()`.

---

## 5. Criterios de Aceptación

- [x] `undo()` y `redo()` invocan `autoguardar()`.
- [x] `localStorage` se actualiza automáticamente tras `Ctrl+Z` y `Ctrl+Y` sin necesidad de disparar `pagehide`.
- [x] `node src/construir.js` regenera las tres páginas y `tests/specs/inicio.spec.js` pasa en Chromium y Firefox.
