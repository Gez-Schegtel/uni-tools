# Spec 31 — Sumador en Diagramas de Bloques: Sin Campo `Contenido`, Texto `"vacío"` y Máximo de Tres Signos

- **ID:** `SPEC-31`
- **Estado:** ⏳ Pendiente
- **Origen:** Pedido directo del usuario (Puntos 5, 6 y 7)
- **Prioridad:** Alta / Dominio y UX (Integrada al Bloque 2)
- **Esfuerzo estimado:** Bajo (~25 minutos)
- **Herramientas afectadas:** Diagramas de bloques (`src/bloque/panel.js`, `src/bloque/interaccion.js`, `src/bloque/dibujo.js`, `src/bloque/modelo.js`, `diagrama-bloque.html`)

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de bloques,  
> **quiero** que los sumadores no tengan campo `"Contenido"` como los bloques, que la opción sin signo en cada cuadrante diga `"vacío"` (sin guiones `"—vacío—"`), y que el programa controle que un sumador tenga como máximo tres signos para que al menos una de sus cuatro porciones quede siempre vacía (para la salida del sumador),  
> **para** que el sumador responda exactamente a las convenciones de Control y su panel sea claro y prolijo.

---

## 2. Descripción Técnica de los Tres Puntos y Análisis de Colisiones

### 2.1. Punto 5 — Los sumadores no deben tener `"Contenido"` como los bloques
Hoy en [`src/bloque/panel.js:54-68`](../src/bloque/panel.js), la condición `else if (n.type !== "node")` incluye a `n.type === "sum"`, por lo que al seleccionar un sumador aparece:
- El campo `Contenido` (`#n-label`, con placeholder `"K/(s+1), G_1, C(s)…"`).
- El campo `Tamaño letra` (`#n-font`, que además no tenía efecto sobre el sumador).
- El bloque de texto explicativo de ecuaciones y fracciones LaTeX.
- Además, en [`src/bloque/interaccion.js:20`](../src/bloque/interaccion.js), `editarElemento()` sólo excluye `n.type === "node"`, permitiendo abrir el editor de ecuaciones con doble clic sobre un sumador, y [`src/bloque/dibujo.js:26`](../src/bloque/dibujo.js) dibuja `n.label` si existe.

### 2.2. Punto 6 — Texto `"vacío"` en lugar de `"—vacío—"` en los signos del sumador
En [`src/bloque/panel.js:129`](../src/bloque/panel.js):
```js
return `<select class="sgn" data-side="${side}">${o("+", "+")}${o(MINUS, MINUS)}${o("", "—vacío—")}</select>`;
```
En la grilla de 3 columnas de `.signbox`, `"—vacío—"` se ve apretado/cortado con el guión adelante (`-vacío`). Debe decir simplemente **`"vacío"`**.

### 2.3. Punto 7 — Controlar que el sumador tenga hasta 3 signos (al menos 1 porción siempre vacía)
En [`src/bloque/panel.js:149-151`](../src/bloque/panel.js):
```js
document.querySelectorAll(".sgn").forEach(sel => {
  sel.onchange = () => { nsel.forEach(n => { if (n.signs) n.signs[sel.dataset.side] = sel.value; }); commit(); render(); };
});
```
Hoy permite poner signo (`+` o `−`) en los 4 lados (`t`, `l`, `r`, `b`) simultáneamente, dejando al sumador sin ningún cuadrante vacío para su salida.

### 2.4. Colisiones detectadas y resueltas
1. **Colisión con el test existente [`tests/specs/bloque.spec.js:255-260`](../tests/specs/bloque.spec.js):**
   - El test `"funciona también en sumadores y en la etiqueta de una flecha"` hacía doble clic sobre un sumador esperando que se abriera `.editor-hoja`.
   - **Resolución:** Actualizar ese test en `tests/specs/bloque.spec.js` para que verifique que el doble clic sobre un sumador **no** abre el editor de contenido, mientras que sobre una entrada/salida (`io`) y sobre la etiqueta de una flecha sí lo abre.
2. **Coordinación con [`SPEC-17`](./17-reglas-completas-de-conexion-en-diagrama-de-bloques.md):**
   - En `equivalenteEnBloques()` ([`src/senales/equivalente.js:76-86`](../src/senales/equivalente.js)) cada sumador se crea con como máximo 3 signos (`l`, `t`, `b`) y el lado derecho `r: ""` siempre vacío, por lo que esta regla de máximo 3 signos es 100 % compatible con `equivalenteEnBloques()`.

---

## 3. Especificación de la Solución

1. **Quitar `Contenido` del sumador:**
   - En [`src/bloque/panel.js:46-98`](../src/bloque/panel.js):
     - Si `n.type === "sum"`, no mostrar el campo `Contenido` (`#n-label`), ni `Tamaño letra` (`#n-font`), ni la nota `.hint` de ecuaciones. Mostrar directamente dentro de la sección del sumador los signos (`.signbox`), `Cruz interna` (`#s-cross`), `Diámetro` (`#n-w`) y la posición (`#n-x`, `#n-y`).
   - En [`src/bloque/interaccion.js:20`](../src/bloque/interaccion.js):
     - Cambiar `if (!n || n.type === "node") return;` por `if (!n || n.type === "node" || n.type === "sum") return;`.
   - En [`src/bloque/dibujo.js:26`](../src/bloque/dibujo.js):
     - Eliminar `if (n.label) dibujarMath(g, n.label, 12, 0, -r - 12);` dentro de la rama `else if (n.type === "sum")`.
   - En [`src/bloque/modelo.js:4, 50-51`](../src/bloque/modelo.js):
     - En `depurarNodos()`, si `n.type === "sum"`, forzar `n.label = ""` y sanear `n.signs`.

2. **Cambiar `"—vacío—"` por `"vacío"` en [`src/bloque/panel.js:129`](../src/bloque/panel.js):**
   ```js
   function signSel(side, val) {
     const o = (v, t) => `<option value="${v}"${v === val ? " selected" : ""}>${t}</option>`;
     return `<select class="sgn" data-side="${side}">${o("+", "+")}${o(MINUS, MINUS)}${o("", "vacío")}</select>`;
   }
   ```

3. **Controlar máximo de 3 signos por sumador (al menos 1 porción vacía):**
   - En [`src/bloque/panel.js:149-151`](../src/bloque/panel.js):
     Al cambiar un `<select class="sgn">`, si `sel.value !== ""` y el sumador tendría los 4 lados con signo (`["l", "r", "t", "b"].filter(k => (k === side ? sel.value : n.signs[k])).length > 3`):
     - No aplicar ese cuarto signo, restaurar el `<select>` al valor anterior (`""`), y mostrar `toast("El sumador admite hasta tres signos: un lado debe quedar vacío")`.
   - En [`src/bloque/modelo.js:51`](../src/bloque/modelo.js) (`depurarNodos()`):
     Sanitizar `n.signs` para que sólo contenga `"+"`, `"−"` o `""` en `["l", "t", "r", "b"]`, y si algún archivo externo trajera los 4 lados con signo, vaciar el cuarto (`r` o el último) para que siempre quede al menos uno vacío.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):
1. Actualizar el test de la línea 255 para verificar que hacer doble clic sobre un sumador **no** abre `.editor-hoja` y que en la etiqueta de una flecha sí lo abre.
2. Agregar un test `"sumador: no tiene campo Contenido, muestra 'vacío' en las opciones de signo y no permite poner más de tres signos"`:
   - Seleccionar el sumador del ejemplo (`S.sel = [idSum]; render();`).
   - Verificar que `#n-label` no exista en el panel (`expect(await page.locator("#n-label").count()).toBe(0)`).
   - Verificar que los `<select class="sgn">` tengan la opción con texto exacto `"vacío"` (y no `"—vacío—"`).
   - Poner signo en un tercer lado libre (queda con 3 signos y 1 vacío: permitido).
   - Intentar poner un signo en el cuarto lado (el único que quedaba vacío): verificar que el programa lo impida, muestre el aviso en `#toast` y conserve exactamente 3 signos y 1 lado vacío (`""`).

---

## 5. Criterios de Aceptación

- [ ] Al seleccionar un sumador no aparece el campo `Contenido` ni se abre el editor flotante al hacerle doble clic.
- [ ] La opción sin signo en los 4 selectores del sumador dice `"vacío"`.
- [ ] Nunca se pueden activar 4 signos a la vez en un sumador (siempre queda al menos una porción vacía).
- [ ] `node src/construir.js` actualiza `diagrama-bloque.html` y todos los tests pasan en Chromium y Firefox.
