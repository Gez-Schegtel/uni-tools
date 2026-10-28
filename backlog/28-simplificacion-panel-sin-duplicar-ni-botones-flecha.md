# Spec 28 — Simplificación del Panel Inspector: Quitar Botón `Duplicar` y Botones de Acción en Flechas

- **ID:** `SPEC-28`
- **Estado:** ✅ Completada
- **Origen:** Pedido directo del usuario (Puntos 1 y 2)
- **Prioridad:** Media / Quick Win (Integrada al Bloque 2)
- **Esfuerzo estimado:** Bajo (~20 minutos)
- **Herramientas afectadas:** Las tres para `#n-dup` (`src/bloque/panel.js`, `src/simulador/panel.js`, `src/senales/panel.js`) y Diagramas de bloques para opciones de flecha (`src/bloque/panel.js`)

---

## 1. Historia de Usuario

> **Como** usuario de `uni-tools`,  
> **quiero** que el panel derecho no muestre el botón redundante `Duplicar (Ctrl+D)` (ya que el atajo figura en la barra inferior y alcanza con `Ctrl+D`) y que al seleccionar una flecha en Diagramas de bloques no aparezcan los botones `Insertar bifurcación`, `Ruta alternativa`, `Ruta automática` ni `Invertir sentido`,  
> **para** tener un panel inspector más limpio, directo y sin acciones innecesarias o confusas sobre las flechas.

---

## 2. Descripción Técnica y Análisis de Colisiones con el Backlog

### 2.1. Botón `#n-dup` en las tres herramientas (Punto 1)
Actualmente se renderiza y conecta un botón `<button class="btn" id="n-dup">...Duplicar...<kbd>Ctrl+D</kbd></button>` en:
- [`src/bloque/panel.js:69-71, 152`](../src/bloque/panel.js)
- [`src/simulador/panel.js:45-47, 166`](../src/simulador/panel.js)
- [`src/senales/panel.js:46-48, 104`](../src/senales/panel.js)

### 2.2. Botones de acción en el panel de Flecha de `diagrama-bloque` (Punto 2)
En [`src/bloque/panel.js:30-38, 160-163`](../src/bloque/panel.js), al seleccionar una flecha se muestran cuatro botones:
```html
<div class="iconbar" style="margin-top:10px">
  <button class="btn" id="e-split">Insertar bifurcación</button>
  <button class="btn" id="e-alt">Ruta alternativa</button>
  <button class="btn" id="e-reset">Ruta automática</button>
  <button class="btn" id="e-flip">Invertir sentido</button>
</div>
```
- `Invertir sentido` (`#e-flip`) no tiene sentido conceptual en un diagrama de bloques (además permitía violar la regla de entrada única).
- `Insertar bifurcación` (`#e-split`), `Ruta alternativa` (`#e-alt`) y `Ruta automática` (`#e-reset`) recargan el panel innecesariamente (las bifurcaciones ya se insertan con la herramienta `Bifurcación (N)` haciendo clic sobre la línea, y los tramos ya se acomodan arrastrando sus tiradores en el lienzo).

### 2.3. Colisiones detectadas y resueltas en el Backlog
1. **Colisión con [`SPEC-17`](./17-reglas-completas-de-conexion-en-diagrama-de-bloques.md):** `SPEC-17` incluía validar `admiteEntrada()` dentro del handler de `#e-flip`. Al eliminarse `#e-flip` en esta `SPEC-28`, se actualizó `SPEC-17` quitando toda referencia a `#e-flip`.
2. **Colisión con [`SPEC-25`](./25-nuevos-tests-faltantes-de-interaccion-y-oscilacion.md):** `SPEC-25` proponía agregar un test para los botones de ruta alternativa y ruta automática del panel de flechas en `bloque.spec.js`. Se actualizó `SPEC-25` eliminando ese punto.
3. **Interacción con [`tests/specs/comun.spec.js:69-71`](../tests/specs/comun.spec.js):** El test ya usa `if (await boton.count()) await boton.click(); else await page.keyboard.press("Control+d");`, por lo que seguirá pasando y además podemos verificar explícitamente que `#n-dup` no exista.

---

## 3. Especificación de la Solución

1. **Quitar `#n-dup` en las tres herramientas:**
   - En [`src/bloque/panel.js:69-71, 152`](../src/bloque/panel.js), eliminar el `<div class="row">...<button id="n-dup">...</div>` (cerrando `<div class="sec">` con `</div>`) y eliminar `if ($("#n-dup")) $("#n-dup").onclick = duplicar;`.
   - En [`src/simulador/panel.js:45-47, 166`](../src/simulador/panel.js), eliminar el bloque de `#n-dup` (cerrando `<div class="sec">` con `</div>`) y su listener en la línea 166.
   - En [`src/senales/panel.js:46-48, 104`](../src/senales/panel.js), eliminar el bloque de `#n-dup` y su listener en la línea 104.
2. **Quitar `#e-split`, `#e-alt`, `#e-reset` y `#e-flip` en [`src/bloque/panel.js:30-38, 160-163`](../src/bloque/panel.js):**
   - Eliminar el `<div class="iconbar">` con los cuatro botones (`#e-split`, `#e-alt`, `#e-reset`, `#e-flip`).
   - Actualizar el texto `.hint` (líneas 36-38) para que diga únicamente:
     ```html
     <div class="hint" style="margin-top:8px">Las flechas se rutean solas esquivando bloques y otras líneas. Con la flecha seleccionada, arrastrá los cuadraditos de sus tramos (o la línea misma) para acomodarla a mano.</div>
     ```
   - Eliminar las líneas 160-163 (`alClic("e-split", ...)`, `alClic("e-alt", ...)`, `alClic("e-reset", ...)`, `alClic("e-flip", ...)`).
   - *(Nota: la función `splitEdge(e)` en `src/bloque/comandos.js` se conserva porque la usa la herramienta `Bifurcación` de la paleta al hacer clic sobre una flecha en el lienzo, en `src/bloque/interaccion.js:205`).*

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

1. En [`tests/specs/comun.spec.js:67-75`](../tests/specs/comun.spec.js):
   - Verificar que al seleccionar un elemento en cualquiera de las tres herramientas, `#n-dup` no exista (`expect(await page.locator("#n-dup").count()).toBe(0)`) y que `Ctrl+D` duplique y se deshaga en un solo paso.
2. En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):
   - Verificar que al seleccionar una flecha en `diagrama-bloque`, el panel muestre `Etiqueta`, `Trazo`, `Punta`, `Grosor`, `Origen` y `Destino`, y no contenga `#e-split`, `#e-alt`, `#e-reset` ni `#e-flip`.

---

## 5. Criterios de Aceptación

- [x] Ninguna de las tres herramientas muestra el botón `#n-dup` en el panel derecho, y `Ctrl+D` sigue funcionando igual.
- [x] El panel de `Flecha` en `diagrama-bloque` no muestra `#e-split`, `#e-alt`, `#e-reset` ni `#e-flip`.
- [x] `node src/construir.js` actualiza las tres páginas y todos los tests pasan en Chromium y Firefox.
