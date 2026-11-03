# Spec 38 — Ventana de Mason: Δ Compacto cuando Tiene Muchos Términos

- **ID:** `SPEC-38`
- **Estado:** ⏳ Pendiente
- **Origen:** Auditoría del 2026-11-03 (revisión de SPEC-07)
- **Prioridad:** Baja (38 / 39)
- **Esfuerzo estimado:** Medio (~40 minutos)
- **Archivos afectados:** `src/senales/analisis.js`, `src/senales/mason.js`, `tests/specs/senales.spec.js`

---

## 1. Historia de Usuario

> **Como** estudiante con un grafo de muchos lazos que no se tocan,
> **quiero** ver la transferencia aunque Δ tenga miles de términos, con Δ resumido,
> **para** no quedarme sin resultado por un límite que sólo existe para poder mostrar el texto.

---

## 2. Descripción del Problema

El cálculo de Mason con muchos lazos disjuntos es barato: una cadena de 16 autolazos tiene 65 535 combinaciones y se resuelve en 40 ms. Lo caro es la **ventana de análisis**, que escribe Δ y cada cofactor término a término: con 16 autolazos son 31 MB de HTML y 3,4 s de página trabada; con 17, 65 MB y 13 s.

Por eso el tope de combinaciones disjuntas (`MAX_COMB = 20000` en `src/senales/mason.js`) es más bajo que lo que el cálculo aguanta. Pasado ese tope, la página avisa y no da la transferencia, aunque podría calcularla.

---

## 3. Especificación de la Solución

1. En `analisis.js`, si Δ (o un cofactor) tiene más de ~200 términos, mostrar la forma compacta (`Δ = 1 − ΣLᵢ + ΣLᵢLⱼ − …`) con la **cantidad** de términos de cada orden, y el valor numérico cuando todas las ganancias son numéricas. Ofrecer «Copiar Δ completo» al portapapeles en vez de meterlo en el DOM.
2. Con eso, subir `MAX_COMB` a 200 000: una cadena de 17 autolazos se calcula en unos 70 ms y la ventana deja de ser el límite.

---

## 4. Plan de Pruebas

- `tests/specs/senales.spec.js`: con 16 autolazos, `mostrarMason()` tarda menos de 500 ms, el HTML de la ventana pesa menos de 1 MB y la transferencia numérica coincide con Π(1 − Lᵢ).
- `tests/unidades/mason.test.js` sigue pasando (Δ = Π(1 − Lᵢ) con 14 autolazos).

---

## 5. Criterios de Aceptación

- [ ] La ventana nunca escribe más de unos cientos de términos.
- [ ] Un grafo de 16 o 17 autolazos da su transferencia.
