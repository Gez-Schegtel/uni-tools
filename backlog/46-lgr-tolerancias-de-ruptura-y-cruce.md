# Spec 46 — LGR: Tolerancias Relativas en Puntos de Ruptura, Cruces y Raíces Nulas

- **ID:** `SPEC-46`
- **Estado:** ✅ Completada
- **Origen:** Auditoría del 2026-11-03 (después del arreglo de `pTrim`)
- **Prioridad:** Baja (46 / 46)
- **Esfuerzo estimado:** Medio (~40 minutos)
- **Archivos afectados:** `src/lgr/calculo.js`, `tests/unidades/lgr.test.js`

---

## 1. Historia de Usuario

> **Como** estudiante con una planta de coeficientes muy distintos (constantes de tiempo de milisegundos y ganancias de miles),
> **quiero** que los puntos de ruptura y los cruces con el eje imaginario salgan bien,
> **para** no tener que reescalar el problema a mano.

---

## 2. Descripción del Problema

La tolerancia de `pTrim()` ya se corrigió (1e-12 → 1e-15). Quedan otras tolerancias relativas fijas que pueden fallar con escalas extremas:

1. **Polinomio de ruptura** `P = D′N − DN′` y **polinomio de cruce** `Q = Im(D)·Re(N) − Re(D)·Im(N)`: se recortan con `pTrim(…, 1e-11)`. Esa tolerancia sirve para limpiar el ruido de la resta, pero con coeficientes que abarcan más de 11 órdenes de magnitud puede tirar un coeficiente principal real y perder candidatos.
2. **Raíces nulas** en `raicesPoli()`: un coeficiente final menor que `1e-14·max` se toma como raíz en s = 0.
3. **Comparaciones absolutas** (`cAbs(Nv) < 1e-9`, `res > 1e-6·(1+|Dv|)`, `Math.abs(s.im) < 1e-9`) que dependen de la escala de s: con polos en ±10⁴ o ±10⁻⁴ dejan de ser «chicas».

---

## 3. Especificación de la Solución

1. **Escalado previo:** antes de analizar, cambiar la variable a `s = α·σ` con α = media geométrica de los módulos de polos y ceros (o la cota de Cauchy). Así los coeficientes quedan de orden 1; se analiza en σ y se vuelve a s al final (raíces × α, K igual, ω × α).
2. Con el problema escalado, dejar las tolerancias actuales tal como están.
3. Para el ruido de P y Q, estimar el error de la resta (suma de los productos en valor absoluto × ε) en vez de usar 1e-11 fijo.

---

### 3.1. Lo que se hizo

Se aplicó el punto 1 (escalado previo) en `analizar()`: si la media geométrica de los módulos de polos y ceros cae fuera de [0,1; 10], se analiza en σ = s/α y `volverDeEscala()` pasa todo a s (puntos × α, K × α^(n−m)); `trazarLGR()` traza en σ y escala las ramas. Los polinomios que se muestran en los pasos se recalculan en s. Dentro de [0,1; 10] no se escala, así que los ejercicios de la guía dan exactamente lo mismo que antes. Con eso no hizo falta tocar las tolerancias del punto 3.

---

## 4. Plan de Pruebas

- `tests/unidades/lgr.test.js`: el caso de libro `K/(s(s+1)(s+2))` escalado por 10⁴ y por 10⁻⁴ (polos en 0, −10⁴, −2·10⁴ y en 0, −10⁻⁴, −2·10⁻⁴) da el mismo σa, los mismos ángulos, ruptura y ωc escalados, y el mismo K crítico ajustado por la escala.
- Los 27 ejemplos de la Guía 3 siguen pasando contra las referencias independientes.

---

## 5. Criterios de Aceptación

- [x] El análisis da lo mismo (salvo la escala) para un problema y su versión escalada por 10^±4.
- [x] Las referencias independientes de `lgr.test.js` siguen pasando.
