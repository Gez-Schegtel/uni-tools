# Spec 23 — Corrección de Falsos Positivos XSS, Datos Inválidos y Esperas Fijas en `tests/`

- **ID:** `SPEC-23`
- **Referencia en el informe:** Secciones `5.2.2`, `5.2.3`, `5.2.4` y `5.2.5`
- **Prioridad:** Media (23 / 27)
- **Esfuerzo estimado:** Bajo (~30 minutos)
- **Archivos afectados:** `tests/specs/archivos-danados.spec.js`, `tests/unidades/logica.test.js`, `tests/specs/comun.spec.js`, `tests/specs/bloque.spec.js`

---

## 1. Historia de Usuario

> **Como** desarrollador que confía en la suite de pruebas automatizadas del proyecto,  
> **quiero** que el test de inyección XSS realmente abra el panel de conexiones y pruebe colores/números trampa en nodos con IDs válidos, que `logica.test.js` use nombres de pines reales (`"o0"`) y que los tests de duración de avisos y doble clic usen reloj simulado en lugar de pausas fijas en tiempo real,  
> **para** eliminar puntos ciegos de seguridad en los tests y ahorrar ~20 segundos de espera pasiva en cada ejecución de CI.

---

## 2. Descripción Técnica de los Problemas (Causa Raíz)

1. **Agujero en el test de XSS (`tests/specs/archivos-danados.spec.js:66-105`):**
   - En `DOCS["diagrama-bloque.html"]` (línea 69), el primer nodo tiene `id: TRAMPA` y `color: { relleno: TRAMPA }`. Como `idValido(n.id)` rechaza `TRAMPA`, todo el nodo se descarta antes de evaluar `color.relleno`.
   - Además, la flecha `edges[0]` sale de `from: { id: "m", port: "r" }` (donde `"m"` es un `"marco"`).
   - En las líneas 91-94, el bucle `for (const n of S[k]) { S.sel = [n.id]; render(); }` **jamás selecciona las conexiones** (`S.selEdges = ["e"]`, `S.selW = ["w"]`, `S.selR = ["r"]`), por lo que el panel inspector de flechas/cables/ramas nunca se renderiza durante la prueba.

2. **Pines inexistentes `"o"` en `tests/unidades/logica.test.js:47-49`:**
   - El test `"tabla de verdad: una AND de dos entradas"` define cables con `pin: "o"` en lugar de `pin: "o0"`. Pasa por casualidad porque `simulate()` trata cualquier string distinto de `"o1"` como índice `0`.

3. **Esperas pasivas en tiempo real en `tests/specs/comun.spec.js:32-54` y `tests/specs/bloque.spec.js:228-231`:**
   - `comun.spec.js:32-54` espera ~3000 ms reales en cada una de las 3 herramientas × 2 navegadores (~18 s totales) para medir cuánto tarda `setTimeout` en quitar la clase `.show` de `#toast`.
   - `bloque.spec.js:228, 231` hace dos `await page.waitForTimeout(600)` reales (~2.4 s en 2 navegadores).

---

## 3. Especificación de la Solución

1. **En [`tests/specs/archivos-danados.spec.js:68-98`](../tests/specs/archivos-danados.spec.js):**
   - Agregar un nodo adicional con `id: "a"` válido y `color: { relleno: TRAMPA, borde: TRAMPA, texto: TRAMPA }`, y conectar la flecha `e` entre `"a"` y `"b"` (dos bloques válidos).
   - En el bloque `page.evaluate()` de las líneas 91-97, además de recorrer `S[k]`, recorrer también las conexiones y seleccionarlas una por una para que `renderInspector()` arme el HTML del panel de flechas, cables y ramas:
     ```js
     const u = S.edges ? "edges" : S.wires ? "wires" : "ramas";
     const selU = S.selEdges ? "selEdges" : S.selW ? "selW" : "selR";
     for (const c of S[u]) { S.sel = []; S[selU] = [c.id]; render(); }
     S[selU] = []; render();
     ```
2. **En [`tests/unidades/logica.test.js:47-49`](../tests/unidades/logica.test.js):**
   - Cambiar `pin: "o"` por `pin: "o0"` en los tres cables.
3. **En [`tests/specs/comun.spec.js:32-54`](../tests/specs/comun.spec.js) y [`tests/specs/bloque.spec.js:224-235`](../tests/specs/bloque.spec.js):**
   - Utilizar `await page.clock.install()` y `await page.clock.fastForward(...)` (o interceptar `setTimeout`) para verificar que a los `2500 ms` el aviso sigue visible (`toHaveClass(/show/)`) y a los `3200 ms` ya se ocultó (`not.toHaveClass(/show/)`), completando el test en `< 50 ms` reales.

---

## 4. Criterios de Aceptación

- [ ] El test de XSS en `archivos-danados.spec.js` selecciona tanto cada nodo válido (con propiedades `TRAMPA`) como cada conexión (`edges`, `wires`, `ramas`) y verifica que `window.__ejecutado` nunca sea `true`.
- [ ] `tests/unidades/logica.test.js` usa `pin: "o0"` en todos sus cables de salida simple.
- [ ] `comun.spec.js` y `bloque.spec.js` verifican los tiempos de `#toast` y de doble clic sin esperas bloqueantes de varios segundos.
- [ ] Tanto `npm --prefix tests run test:unidades` como `npx --prefix tests playwright test` pasan en Chromium y Firefox en menos tiempo total.
