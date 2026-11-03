# Spec 36 — LGR: Entradas Ambiguas (Coma Decimal en Listas y la Letra K)

- **ID:** `SPEC-36`
- **Estado:** ✅ Completada
- **Origen:** Auditoría del 2026-11-03
- **Prioridad:** Baja (36 / 46)
- **Esfuerzo estimado:** Bajo (~20 minutos)
- **Archivos afectados:** `src/lgr/entrada.js`, `src/lgr/modelo.js` (antes `calculo.js`), `tests/unidades/lgr.test.js`

---

## 1. Historia de Usuario

> **Como** estudiante que escribe ceros y polos rápido,
> **quiero** que la página me avise cuando lo que escribí se puede leer de dos maneras,
> **para** no resolver sin darme cuenta un ejercicio distinto del que quería.

---

## 2. Descripción del Problema

1. **Coma en listas:** en «Ceros» y «Polos», `1,2` se lee como **1,2** (un número con coma decimal) y no como los dos números 1 y 2. Con espacio (`1, 2`) o con `;` sí se separan. El placeholder usa `;`, pero no hay ningún aviso.
2. **La letra K en un polinomio:** `parsearPoli()` acepta `k`/`K` y la toma como **1**, sin aviso. `K(s+1)` en el numerador da `s+1`, que es lo esperado, pero `s^2+Ks+1` en el denominador también se acepta y da `s^2+s+1`.

---

## 3. Especificación de la Solución

1. En `parsearLista()`, si aparece `\d,\d` sin espacio y la lista tiene otras comas o ningún `;`, agregar una nota informativa («se leyó 1,2 como un número decimal; para separar usá `;`»).
2. En `parsearPoli()`, aceptar `K` sólo como factor del numerador entero. En cualquier otro lugar, rechazarla: «la K va afuera: escribí N(s) y D(s) sin K».

---

### 3.1. Agregado (2026-11-03)

Las listas de ceros y polos también aceptan notación científica (`-1e-4`, `2e-1j`), como ya la aceptaban los polinomios.

---

## 4. Plan de Pruebas

- `tests/unidades/lgr.test.js`: `parsearLista("1,2")` devuelve un número y deja una nota; `parsearPoli("s^2+Ks+1")` tira error; `parsearPoli("K(s+1)")` sigue dando `[1, 1]`.

---

## 5. Criterios de Aceptación

- [x] Ninguna entrada ambigua se toma en silencio.
- [x] Los 27 ejemplos de la Guía 3 se siguen leyendo igual.
