# Spec 06 — Proteger el Foco y Edición del Panel Inspector Durante el Reloj Automático (`simulador-logico`)

- **ID:** `SPEC-06`
- **Referencia en el informe:** `BUG-04` y Sección `5.4.C.1`
- **Prioridad:** Alta (6 / 27)
- **Esfuerzo estimado:** Medio (~30 minutos)
- **Herramientas afectadas:** Simulador de circuitos lógicos (`src/simulador/interaccion.js`, `src/simulador/panel.js`, `src/simulador/dibujo.js`, `simulador-logico.html`)

---

## 1. Historia de Usuario

> **Como** usuario del Simulador de circuitos lógicos,  
> **quiero** poder editar etiquetas, colores, cantidad de entradas o propiedades en el panel derecho (`#insp`) mientras un reloj automático (`modo === "auto"`) está funcionando en el circuito,  
> **para** que el pulso periódico cada 400 ms no me cierre los desplegables ni me robe el foco del teclado a mitad de la escritura.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/simulador/interaccion.js:169-175`](../src/simulador/interaccion.js), `actualizarReloj()` inicia un `setInterval` de 400 ms cuando hay al menos un reloj con `modo === "auto"` y `corriendo === true`:

```js
relojTimer = setInterval(() => {
  const cs = S.nodes.filter(n => n.type === "clk" && n.modo === "auto" && n.corriendo);
  if (!cs.length) { clearInterval(relojTimer); relojTimer = null; return; }
  cs.forEach(n => n.on = !n.on);
  render();
}, 400);
```

Cada 400 ms, `render()` ([`src/simulador/dibujo.js:114-142`](../src/simulador/dibujo.js)) llama incondicionalmente a `renderInspector()` ([`src/simulador/panel.js:15-17`](../src/simulador/panel.js)):

```js
function renderInspector() {
  if (inspLock) return;
  const box = document.getElementById("insp");
  ...
  box.innerHTML = h;
```

La bandera `inspLock` sólo vale `true` durante los microsegundos que dura el callback sincrónico de un evento `input`. Entre una tecla y la siguiente del usuario, el `setInterval` dispara `render() → renderInspector()`, ejecuta `box.innerHTML = h` y **destruye el `<input>` o `<select>` donde el usuario tenía el foco**.

---

## 3. Especificación de la Solución

### Opción recomendada (Limpia y sin parpadeos en el panel)
1. En [`src/simulador/dibujo.js:114`](../src/simulador/dibujo.js), permitir que `render(soloLienzo)` reciba un parámetro opcional `soloLienzo = false` (o bien comprobar en `renderInspector()` si el foco está dentro de `#insp`):
   - En `actualizarReloj()` ([`src/simulador/interaccion.js:173`](../src/simulador/interaccion.js)), cuando el reloj conmuta automáticamente, lo único que puede cambiar en el panel derecho es el texto informativo de `Estado actual: <b>1 (alto)</b>` (si hay una entrada/salida/reloj seleccionado) o `Estado Q` (si hay un biestable seleccionado).
   - Si en `renderInspector()` (`src/simulador/panel.js:16`) se comprueba:
     ```js
     const box = document.getElementById("insp");
     if (inspLock) return;
     ```
     y además, en `actualizarReloj()` se llama a una actualización liviana o se evita reconstruir `box.innerHTML` cuando `box.contains(document.activeElement)`:
     - Mejor aún: en `actualizarReloj()`, llamar a `render(true)` (donde `soloLienzo === true` saltea `renderInspector()` o sólo actualiza un `<span id="n-estado-vivo">` puntual si existe en el panel, sin tocar `box.innerHTML`).
2. De este modo:
   - El lienzo SVG (`gWires`, `gNodes`, etc.) se actualiza cada 400 ms mostrando los cables y salidas encendidos/apagados.
   - El DOM de `#insp` **no se destruye ni se recrea** cada 400 ms, por lo que cualquier `<input>`, `<select>` o selector de color mantiene su foco y su estado abierto sin interrupciones.
   - Si el elemento seleccionado en `#insp` muestra su estado (`Estado actual` o `Estado Q`), envolver ese valor en `<b id="insp-estado">...</b>` y, cuando `soloLienzo === true`, actualizar únicamente `el.textContent` de `#insp-estado` sin tocar el resto de `box.innerHTML`.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/simulador.spec.js`](../tests/specs/simulador.spec.js):
1. Agregar un test `"con el reloj automático andando se puede escribir en el panel sin perder el foco"`:
   - Cargar el ejemplo `"cont"` (`cargarEjemplo("cont")`), que tiene un reloj y dos flip-flops JK.
   - Activar el reloj en modo `"auto"` y `corriendo = true`, llamando a `actualizarReloj()`.
   - Seleccionar la salida `Q0` (`S.sel = [idQ0]; render();`).
   - Hacer foco en `#n-lab` (`await page.locator("#n-lab").focus()`), vaciarlo y escribir `"Salida_0"` con un retardo entre teclas que supere los 400 ms (`await page.keyboard.type("Salida_0", { delay: 120 })`, total ~960 ms, es decir, al menos 2 pulsos del reloj automático durante la escritura).
   - Verificar que `#n-lab` siga teniendo el foco (`await expect(page.locator("#n-lab")).toBeFocused()`), que su valor sea `"Salida_0"` y que `getNode(idQ0).label` sea `"Salida_0"`.

---

## 5. Criterios de Aceptación

- [ ] Con un reloj en `modo: "auto"` y `corriendo: true`, escribir pausadamente en `#n-lab`, `#m-w`, `#m-h` o abrir `#n-pins` en el panel derecho nunca pierde el foco ni reinicia el cursor.
- [ ] El estado visual del circuito en el lienzo (y el indicador de estado en el panel si corresponde) sigue actualizándose cada 400 ms.
- [ ] `node src/construir.js` actualiza `simulador-logico.html` y el nuevo test en `simulador.spec.js` pasa en Chromium y Firefox.
