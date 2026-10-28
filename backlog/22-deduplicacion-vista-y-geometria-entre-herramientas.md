# Spec 22 — Deduplicación de `fit()`, `instalarRueda()` y Utilidades entre Herramientas

- **ID:** `SPEC-22`
- **Referencia en el informe:** Sección `4.4`
- **Prioridad:** Baja / Mantenibilidad (22 / 27)
- **Esfuerzo estimado:** Medio (~40 minutos)
- **Herramientas afectadas:** Las tres (`src/comun/vista.js`, `src/senales/interaccion.js`, `src/senales/pagina.html`)

---

## 1. Historia de Usuario

> **Como** desarrollador/mantenedor de `uni-tools`,  
> **quiero** que la función de encuadre (`fit()`), las constantes de dirección de puertos (`DIRS`/`DIRP`) y el cálculo de extremos de bloque (`portPoint`/`puerto`) no estén repetidos entre herramientas,  
> **para** reducir código duplicado entre `src/bloque/`, `src/simulador/` y `src/senales/` sin alterar el comportamiento de ninguna de las tres aplicaciones.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

Si bien [`src/comun/vista.js`](../src/comun/vista.js) ya centralizó `moverVista()`, `encuadrar()` e `instalarRueda()`, todavía persisten tres duplicaciones innecesarias en el código fuente:

1. **`fit()` repetido en las tres herramientas:**
   - [`src/bloque/comandos.js:35-39`](../src/bloque/comandos.js):
     ```js
     function fit() {
       if (!S.nodes.length) { S.zoom = 1; S.pan = { x: 90, y: 70 }; render(); return; }
       encuadrar(bboxAll(), 60, 2);
     }
     ```
   - [`src/simulador/comandos.js:43-47`](../src/simulador/comandos.js):
     ```js
     function fit() {
       if (!S.nodes.length) { S.zoom = 1; S.pan = { x: 80, y: 60 }; render(); return; }
       encuadrar(bboxAll(), 60, 1.8);
     }
     ```
   - [`src/senales/interaccion.js:177-181`](../src/senales/interaccion.js):
     ```js
     function fit() {
       if (!S.nodos.length) { S.zoom = 1; S.pan = { x: 90, y: 70 }; render(); return; }
       acomodarRamas(); // el encuadre tiene que ver los arcos ya acomodados
       encuadrar(bboxAll(), 60, 2);
     }
     ```
2. **Constantes de dirección de puertos (`DIRS` / `DIRP`) y geometría de puertos de bloques duplicadas entre `src/bloque/` y `src/senales/equivalente.js`:**
   - [`src/bloque/geometria.js:18`](../src/bloque/geometria.js) define `const DIRS = { r: { x: 1, y: 0 }, l: { x: -1, y: 0 }, b: { x: 0, y: 1 }, t: { x: 0, y: -1 } };` y `portPoint(n, p)`.
   - [`src/senales/equivalente.js:7-16`](../src/senales/equivalente.js) vuelve a definir `const DIRP = { r: { x: 1, y: 0 }, l: { x: -1, y: 0 }, b: { x: 0, y: 1 }, t: { x: 0, y: -1 } };`, `const STUB = 20;` y `function puerto(n, p)` con la misma matemática que `portPoint(n, p)`.
3. **Generación de letras libres (`proximoNombreFF()` y `proximaLetra()`) duplicada en el mismo archivo [`src/simulador/modelo.js:31-40`](../src/simulador/modelo.js):**
   - Ambas funciones recorren `for (let i = 0; i < 26; i++) { const l = String.fromCharCode(65 + i); if (!usadas.has(l)) return l; } return "X";` cambiando únicamente el filtro (`n.type === "ff"` vs `n.type === "in"`).

---

## 3. Especificación de la Solución

1. **En [`src/comun/vista.js`](../src/comun/vista.js):**
   - Definir una función `fit()` común que consulte `S[HERRAMIENTA.nodos]`, ejecute la preparación previa de rutas si existe (`if (typeof actualizarTamaños === "function") actualizarTamaños(); if (typeof routeAll === "function") routeAll(); if (typeof acomodarRamas === "function") acomodarRamas();`) y llame a `encuadrar(bboxAll(), 60, HERRAMIENTA.zoomMax || 2)`.
2. **En [`src/simulador/modelo.js:31-40`](../src/simulador/modelo.js):**
   - Unificar `proximoNombreFF()` y `proximaLetra()` en una sola función parametrizada `proximaLetraLibre(tipo)`.

### 3.1. Garantías de No Regresión
- El cálculo de `encuadrar(bboxAll(), 60, ...)` se mantiene idéntico, respetando el margen de la paleta flotante (`#palette`) verificado por [`tests/specs/comun.spec.js:32-40`](../tests/specs/comun.spec.js).

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

- Ejecutar [`tests/specs/comun.spec.js`](../tests/specs/comun.spec.js) (que prueba `fit()` evitando que la paleta tape elementos y prueba `Shift + rueda` y `Ctrl + rueda` en las 3 herramientas) y [`tests/specs/lienzo.spec.js`](../tests/specs/lienzo.spec.js).

---

## 5. Criterios de Aceptación

- [ ] `fit()` e `instalarRueda()` están definidos una sola vez en `src/comun/vista.js` y funcionan en las tres herramientas.
- [ ] `src/senales/interaccion.js` tiene ~42 líneas menos de código duplicado.
- [ ] `node src/construir.js` actualiza las tres páginas y todos los tests de `comun.spec.js`, `lienzo.spec.js` y `senales.spec.js` pasan.
