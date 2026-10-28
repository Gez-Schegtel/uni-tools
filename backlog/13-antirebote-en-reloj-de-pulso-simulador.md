# Spec 13 — Antirrebote y Consistencia de Historial en el Reloj de Pulso (`simulador-logico`)

- **ID:** `SPEC-13`
- **Estado:** ✅ Completada
- **Referencia en el informe:** `BUG-17` y Sección `5.4.C.2`
- **Prioridad:** Baja (13 / 27)
- **Esfuerzo estimado:** Bajo (~20 minutos)
- **Herramientas afectadas:** Simulador de circuitos lógicos (`src/simulador/interaccion.js`, `simulador-logico.html`)

---

## 1. Historia de Usuario

> **Como** usuario del Simulador de circuitos lógicos que prueba contadores o registros con un reloj en modo `"Pulso (sube y baja)"`,  
> **quiero** que al hacer clic sobre el reloj (incluso varios clics seguidos rápidos) cada clic produzca un flanco ascendente y descendente completo sin trabarse ni ensuciar el historial de deshacer con pasos intermedios incoherentes,  
> **para** avanzar mis circuitos secuenciales paso a paso de manera confiable.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/simulador/interaccion.js:163-166`](../src/simulador/interaccion.js):

```js
function pulso(n) {
  n.on = true; commit(); render();
  setTimeout(() => { n.on = false; commit(); render(); }, 140);
}
```

### Problemas de esta implementación
1. **Condición de carrera en clics rápidos (< 140 ms):** Si el usuario hace dos clics rápidos sobre el reloj (o sobre el botón `#n-pulso` del panel):
   - En el segundo clic, `n.on` todavía vale `true` porque el primer `setTimeout` no venció.
   - Al hacer `n.on = true; render();`, los biestables ven `clkPrev === true` y `clk === true`: **no hay flanco ascendente**, por lo que el segundo clic no avanza el contador.
   - Pocos milisegundos después vence el primer `setTimeout` y apaga `n.on = false` antes de tiempo.
2. **Doble entrada en `undoStack` por cada pulso:** Cada clic en un reloj de pulso llama a `commit()` dos veces (una cuando sube a `1` y otra 140 ms después cuando baja a `0`). Si el usuario pulsa `Ctrl+Z`, el reloj de pulso queda clavado en `1` permanentemente.

---

## 3. Especificación de la Solución

En [`src/simulador/interaccion.js:163-167`](../src/simulador/interaccion.js), llevar un mapa de temporizadores activos por nodo (`const _pulsos = new Map();`):
1. Si ya había un temporizador activo para `n.id`, cancelarlo con `clearTimeout(_pulsos.get(n.id))` y forzar sincrónicamente la bajada previa (`n.on = false; correr();`) antes de iniciar el nuevo pulso, garantizando que el nuevo clic produzca siempre un flanco `0 → 1` real.
2. Registrar un **único `commit()`** al completarse el pulso (cuando `n.on` vuelve a `false` tras haber actualizado el estado `q` de los biestables):

```js
const _pulsos = new Map();
function pulso(n) {
  if (_pulsos.has(n.id)) {
    clearTimeout(_pulsos.get(n.id));
    _pulsos.delete(n.id);
    n.on = false;
    correr();
  }
  n.on = true;
  render();
  _pulsos.set(n.id, setTimeout(() => {
    _pulsos.delete(n.id);
    n.on = false;
    correr();
    commit();
    render();
  }, 140));
}
```

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/simulador.spec.js`](../tests/specs/simulador.spec.js):
- Agregar un test `"dos clics rápidos en un reloj de pulso avanzan dos veces el contador y dejan el reloj en 0"`:
  - Cargar el ejemplo `"cont"` (`cargarEjemplo("cont")`), donde el reloj `P` arranca en `modo: "pulso"`.
  - Medir la cuenta inicial `(Q1, Q0)` y `undoStack.length`.
  - Invocar dos pulsos seguidos separados por sólo 30 ms (menos de los 140 ms del pulso).
  - Esperar ~200 ms a que termine el pulso visual.
  - Verificar que el contador haya avanzado exactamente **2 unidades** (`(inicial + 2) % 4`), que `P.on` haya quedado en `false` y que un `undo()` devuelva el contador al estado anterior sin dejar `P.on` clavado en `true`.

---

## 5. Criterios de Aceptación

- [x] Dos o más clics rápidos (< 140 ms) sobre un reloj en modo `"pulso"` producen sendos flancos ascendentes efectivos en los biestables conectados.
- [x] Al finalizar el pulso, `n.on` queda en `false` y cada pulso suma un único paso coherente en `undoStack`.
- [x] `node src/construir.js` actualiza `simulador-logico.html` y el nuevo test pasa en Chromium y Firefox.
