# Spec 24 — Eliminación de Tests Redundantes y Consolidación en `tests/unidades/`

- **ID:** `SPEC-24`
- **Estado:** ✅ Completada
- **Referencia en el informe:** Sección `5.3`
- **Prioridad:** Baja / Media (24 / 27)
- **Esfuerzo estimado:** Medio (~35 minutos)
- **Archivos afectados:** `tests/unidades/logica.test.js`, `tests/specs/simulador.spec.js`, `tests/specs/correccion.spec.js`, `tests/specs/comun.spec.js`, `tests/specs/bloque.spec.js`, `tests/specs/senales.spec.js`, `tests/specs/humo.spec.js`

---

## 1. Historia de Usuario

> **Como** desarrollador de `uni-tools`,  
> **quiero** que las pruebas de funciones puras (como Quine–McCluskey `simplify` y `limpiarNombre`) corran una sola vez en Node (`tests/unidades/`) en lugar de levantarse por triplicado en Chromium y Firefox, y que los tests E2E idénticos entre las tres herramientas vivan parametrizados una sola vez en `comun.spec.js` / `lienzo.spec.js`,  
> **para** que la suite de pruebas sea más rápida, no tenga código copiado y pegado en múltiples archivos y cada comportamiento tenga una única fuente de verdad.

---

## 2. Descripción Técnica de las Redundancias Actuales

1. **Triple duplicación de `simplify()` (Quine–McCluskey):**
   - `simplify()` (`src/simulador/logica.js:99-192`) es una función pura sin acceso al DOM.
   - Se prueba en:
     1. [`tests/unidades/logica.test.js:33-41`](../tests/unidades/logica.test.js) (casos básicos en Node).
     2. [`tests/specs/simulador.spec.js:186-240`](../tests/specs/simulador.spec.js) (376 casos + benchmark de 10 entradas corriendo dentro de `page.evaluate()` en Chromium y Firefox).
     3. [`tests/specs/correccion.spec.js:216-311`](../tests/specs/correccion.spec.js) (~1000 casos exhaustivos de 1 a 7 variables corriendo otra vez dentro de `page.evaluate()` en Chromium y Firefox).
2. **`limpiarNombre()` probado 6 veces en navegador (`tests/specs/comun.spec.js:105-111`):**
   - Evalúa `limpiarNombre` (función pura de `src/comun/util.js:19-25`) 6 veces (3 herramientas × 2 navegadores).
3. **`Ctrl + arrastrar` y `rueda del mouse` repetido en 4 archivos E2E:**
   - Ya se prueba para las 3 herramientas en [`tests/specs/lienzo.spec.js:22-49`](../tests/specs/lienzo.spec.js) y en [`tests/specs/comun.spec.js:85-103`](../tests/specs/comun.spec.js).
   - Está duplicado en [`tests/specs/bloque.spec.js:326-365`](../tests/specs/bloque.spec.js), [`tests/specs/simulador.spec.js:173-184`](../tests/specs/simulador.spec.js) y [`tests/specs/senales.spec.js:249-260`](../tests/specs/senales.spec.js).
4. **Test de `"área de impresión"` copiado idéntico en `bloque.spec.js:381-395` y `simulador.spec.js:242-256`:**
   - Y ausente en `senales.spec.js`. Moviéndolo al bucle de `HERRAMIENTAS` en [`tests/specs/comun.spec.js`](../tests/specs/comun.spec.js) se eliminan las dos copias y de paso queda cubierto también `diagrama-señales.html`.
5. **Regex de `<script src>` y `<link rel="stylesheet">` duplicado entre [`tests/specs/fuentes.spec.js:23`](../tests/specs/fuentes.spec.js) y [`tests/specs/humo.spec.js:31-36`](../tests/specs/humo.spec.js).**

---

## 3. Especificación de la Solución

1. **En [`tests/unidades/logica.test.js`](../tests/unidades/logica.test.js):**
   - Incorporar la verificación de optimalidad de `simplify()` (incluyendo el caso contraejemplo de elección golosa `[0, 1, 3, 4, 7, 9, 11, 13, 15]` en 4 variables, todas las funciones de 1 a 3 variables, muestras de 4 a 6 variables con nombres propios y el test de rendimiento con 10 variables).
   - Eliminar el bloque duplicado `test.describe("simplificación (Quine–McCluskey)")` de [`tests/specs/simulador.spec.js:186-240`](../tests/specs/simulador.spec.js) y el test duplicado de [`tests/specs/correccion.spec.js:216-311`](../tests/specs/correccion.spec.js) (ya que `correccion.spec.js:313-462` ya verifica las expresiones simplificadas renderizadas en `#ov-truth` sobre 80 circuitos aleatorios en el navegador).
2. **En [`tests/specs/comun.spec.js`](../tests/specs/comun.spec.js):**
   - Mover el test `"con hoja, la exportación es exactamente ese recorte"` al bucle de las 3 herramientas en `comun.spec.js` y eliminar las copias de `bloque.spec.js:382-395` y `simulador.spec.js:242-257`.
3. **Eliminar los tests duplicados de `Ctrl + clic izquierdo y arrastrar mueve la hoja; la rueda también`:**
   - Eliminar de `simulador.spec.js:173-184` y `senales.spec.js:249-260`, y de `bloque.spec.js` conservar únicamente los dos casos específicos que no están en `lienzo.spec.js` (`"con Ctrl se mueve la hoja aunque se agarre sobre un bloque"` y `"el botón del medio y la barra espaciadora siguen moviendo la hoja"`).
4. **En [`tests/specs/humo.spec.js:31-36`](../tests/specs/humo.spec.js):**
   - Eliminar el último test redundante con `fuentes.spec.js` (o dejar en `fuentes.spec.js` también a `index.html`).

---

## 4. Criterios de Aceptación

- [x] `npm --prefix tests run test:unidades` ejecuta toda la batería exhaustiva de Quine–McCluskey (`simplify`) en Node en menos de 1 segundo.
- [x] El recorte por área de impresión (`ponerHoja("a4-h")`) se prueba en un solo lugar (`comun.spec.js`) cubriendo las herramientas con hoja.
- [x] No quedan bloques de tests copiados y pegados entre `bloque.spec.js`, `simulador.spec.js` y `senales.spec.js`.
- [x] Toda la suite (`test:unidades` + `playwright test`) pasa en verde.
