# Spec 05 — Aislamiento del Estado Secuencial entre Filas en `truthTable()` (`simulador-logico`)

- **ID:** `SPEC-05`
- **Referencia en el informe:** `BUG-05` y Sección `5.4.C.4`
- **Prioridad:** Alta (5 / 27)
- **Esfuerzo estimado:** Bajo (~20 minutos)
- **Herramientas afectadas:** Simulador de circuitos lógicos (`src/simulador/logica.js`, `simulador-logico.html`)

---

## 1. Historia de Usuario

> **Como** estudiante o docente que consulta la Tabla de Verdad en el Simulador de circuitos lógicos,  
> **quiero** que cada fila de la tabla de verdad se evalúe partiendo del mismo estado inicial limpio del circuito sin arrastrar mutaciones de estado de las filas anteriores,  
> **para** que la presencia de biestables sin reloj (latches) o entradas conectadas a `CLK` no contamine los resultados de las combinaciones siguientes.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/simulador/logica.js:82-97`](../src/simulador/logica.js), `truthTable()` construye la copia de los nodos **una sola vez antes del bucle `for`**:

```js
function truthTable() {
  const ins = S.nodes.filter(n => n.type === "in").sort((a, b) => a.x - b.x || a.y - b.y);
  const outs = S.nodes.filter(n => n.type === "out").sort((a, b) => a.y - b.y || a.x - b.x);
  if (!ins.length || !outs.length || ins.length > 8) return null;
  const rows = [];
  const total = 1 << ins.length;
  const copia = S.nodes.map(n => Object.assign({}, n));
  for (let m = 0; m < total; m++) {
    ins.forEach((n, i) => {
      copia.find(x => x.id === n.id).on = !!((m >> (ins.length - 1 - i)) & 1);
    });
    const r = simulate(copia, S.wires);
    const out = outs.map(o => r.val.get(o.id) ? 1 : 0);
    rows.push({ m, in: ins.map((_, i) => (m >> (ins.length - 1 - i)) & 1), out, osc: r.osc });
  }
  return { ins, outs, rows };
}
```

Dentro de `simulate(nodes, wires)` ([`src/simulador/logica.js:55-65`](../src/simulador/logica.js)), el bucle de biestables **modifica directamente los objetos de `nodes` (`copia`)**:
- Actualiza `n.q = sig ? 1 : 0;`
- Actualiza `n.clkPrev = clk;` y `n.clkArranque = false;`

### Qué falla
1. Si hay una entrada `"in"` conectada al pin `CLK` de un biestable (por ejemplo, al probar un flip-flop D con dos entradas `D` y `CLK`), en la fila donde `CLK` pasa de `0` a `1` se dispara un flanco ascendente y cambia `n.q` en `copia`, afectando todas las filas posteriores.
2. Si hay un biestable sin reloj (`conClk === false`, como un latch RS/JK), las filas donde las entradas activan el latch cambian `n.q` en `copia`, y las filas posteriores donde las entradas valen `00` (retención) devuelven el `n.q` dejado por la fila anterior en lugar del estado original del circuito.

---

## 3. Especificación de la Solución

En [`src/simulador/logica.js:88-95`](../src/simulador/logica.js), clonar `S.nodes` dentro de cada iteración `m` del bucle (dado que `total <= 256` por `ins.length <= 8`, clonar una docena de objetos 256 veces toma menos de 0.2 ms):

```js
  for (let m = 0; m < total; m++) {
    const copia = S.nodes.map(n => Object.assign({}, n));
    ins.forEach((n, i) => {
      copia.find(x => x.id === n.id).on = !!((m >> (ins.length - 1 - i)) & 1);
    });
    const r = simulate(copia, S.wires);
    const out = outs.map(o => r.val.get(o.id) ? 1 : 0);
    rows.push({ m, in: ins.map((_, i) => (m >> (ins.length - 1 - i)) & 1), out, osc: r.osc });
  }
```
Además, al clonar cada nodo para evaluar una fila estática de la tabla de verdad, si se quiere evitar que la fila donde la entrada `CLK` vale `1` simule un falso flanco respecto a una fila anterior, conviene inicializar `clkArranque: true` (tal como hace un nodo recién creado) para que cada fila evalúe la combinación de entradas de forma completamente independiente de las demás filas.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

1. **En [`tests/unidades/logica.test.js`](../tests/unidades/logica.test.js):**
   - Agregar un test `"truthTable: cada fila parte del estado original sin contaminar las filas siguientes"`:
     - Armar un circuito con dos entradas `S` y `R`, un biestable `ff:rs` sin reloj (`conClk: false`, `q: 0`) y una salida `Q`.
     - En la fila `00` (`m = 0`), `Q` vale `0` (estado inicial `q = 0`). En las filas `01` (`S=0, R=1`) y `10` (`S=1, R=0`), `Q` vale `0` y `1`.
     - Invertir el orden o probar un latch JK con `q: 0` donde la fila `11` (`J=1, K=1`) conmuta `q` a `1`, seguida de una fila con `J=0, K=0` (p. ej. poniendo una compuerta `NOT` en las entradas para que `J=1, K=1` ocurra en `m = 0` y `J=0, K=0` ocurra en `m = 3`): verificar que en `m = 3` (`J=0, K=0`) la salida siga valiendo el `q` inicial (`0`) y no el `1` dejado por `m = 0`.
2. **En [`tests/specs/simulador.spec.js`](../tests/specs/simulador.spec.js):**
   - Ampliar la sección `test.describe("biestables")` (línea 99) con esa misma verificación desde el navegador.

---

## 5. Criterios de Aceptación

- [ ] El resultado de cualquier fila `m` en `truthTable()` es independiente de las filas `0 .. m-1`.
- [ ] `S.nodes` del circuito activo sigue sin mutar al abrir la tabla de verdad.
- [ ] `node src/construir.js` actualiza `simulador-logico.html` y pasan tanto `npm --prefix tests run test:unidades` como Playwright.
