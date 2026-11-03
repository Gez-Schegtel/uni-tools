# Spec 34 — LGR: Polos y Ceros Cancelados se Analizan sobre la Función Reducida

- **ID:** `SPEC-34`
- **Estado:** ⏳ Pendiente
- **Origen:** Auditoría del 2026-11-03 al integrar `simulador-lgr.html` del proyecto original
- **Prioridad:** Media (34 / 46)
- **Esfuerzo estimado:** Medio (~45 minutos)
- **Archivos afectados:** `src/lgr/calculo.js`, `src/lgr/interfaz.js`, `tests/unidades/lgr.test.js`

---

## 1. Historia de Usuario

> **Como** estudiante que carga un ejercicio con un polo y un cero en el mismo punto,
> **quiero** que el LGR, los ángulos y la tabla de estabilidad se calculen con la función ya simplificada y que el par cancelado se muestre aparte,
> **para** no copiar en la resolución ángulos de salida o de llegada que no tienen sentido.

---

## 2. Descripción del Problema

Cuando un polo y un cero coinciden (p. ej. ceros `1±7,5j; −5±8j`, polos `−8±3,5j; 1±7,5j; −7`), la página avisa «se cancelan en la función de transferencia», pero sigue analizando con N(s) y D(s) sin simplificar:

1. **Ángulos de salida y de llegada sobre el par cancelado:** se calculan y se dibujan (θ = 126,25°, φ = 233,75° en el ejemplo), aunque en ese punto no nace ni termina ninguna rama.
2. **Rama «quieta» en el punto cancelado:** el trazado deja una rama de longitud cero sobre el par, y ese punto no cumple la condición de ángulo (K = −D/N es 0/0).
3. **Tabla de estabilidad:** si el par cancelado está sobre el eje imaginario o en el semiplano derecho, cuenta como polo de lazo cerrado para todo K. Matemáticamente es correcto (D + K·N lo tiene como raíz), pero conviene explicarlo: es un modo que la realimentación no puede mover.

El cruce del eje imaginario por un par cancelado sí quedó resuelto en el commit «LGR: cruce por un polo y un cero cancelados…» (L'Hôpital con las derivadas).

---

## 3. Especificación de la Solución

1. En `construirModelo()`, detectar los pares polo–cero coincidentes (misma tolerancia que `cancelaciones()`), separarlos en `R.cancelados` y armar `Nr(s)` y `Dr(s)` sin ellos.
2. Calcular los pasos 2 a 7 y el trazado con `Nr`/`Dr`. El paso 1 muestra la simplificación.
3. En el paso 8 (conclusión), si algún cancelado tiene parte real ≥ 0, agregar una fila o nota: «polo cancelado en s = …: queda en lazo cerrado para todo K (modo no controlable u observable)».
4. Dibujar los pares cancelados con un marcador propio (cruz dentro de un círculo) y sin ángulos.

---

## 4. Plan de Pruebas

- En `tests/unidades/lgr.test.js`: con el ejemplo de arriba, `R.angulos` no tiene entradas para `1±7,5j`, `trazarLGR()` no devuelve ramas de longitud cero y todos los puntos cumplen la condición de ángulo.
- Con un par cancelado en `+2`: la conclusión dice inestable para todo K y lo explica.

---

## 5. Criterios de Aceptación

- [ ] Ningún ángulo ni rama se dibuja sobre un par cancelado.
- [ ] La conclusión de estabilidad explica los modos cancelados en el semiplano derecho o sobre el eje.
- [ ] `node --test "tests/unidades/*.test.js"` y `tests/specs/lgr.spec.js` pasan.
