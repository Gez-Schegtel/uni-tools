# Spec 45 — LGR: El Trazado de las Ramas no Traba la Página

- **ID:** `SPEC-45`
- **Estado:** ✅ Completada
- **Origen:** Auditoría del 2026-11-03
- **Prioridad:** Media / Baja (45 / 46)
- **Esfuerzo estimado:** Medio (~45 minutos)
- **Archivos afectados:** `src/lgr/trazado.js` (`trazarLGR`), `src/lgr/estado.js` (`calcular`) y `src/lgr/barra.js` (`diferir`); antes `calculo.js` e `interfaz.js`

---

## 1. Historia de Usuario

> **Como** estudiante que escribe un polinomio de grado alto,
> **quiero** poder seguir tipeando mientras se dibuja el gráfico,
> **para** que la página no se congele con cada tecla.

---

## 2. Descripción del Problema

`trazarLGR()` sigue las ramas paso a paso en el hilo principal, con un tope de 1,5 s, y `calcular()` lo llama 250 ms después de cada tecla:

| grado | tiempo de trazado |
|---|---|
| 10 | ~370 ms |
| 20 (el máximo desde el arreglo del tope) | 1,5 s, cortado por tiempo |

Mientras tanto la página no responde: no se puede tipear, ni hacer zoom, ni cerrar el panel. El aviso de «trazado incompleto» ya existe, pero no evita la traba.

---

## 3. Especificación de la Solución

1. Hacer `trazarLGR()` incremental: que avance por tandas de ~16 ms (con `requestAnimationFrame` o `setTimeout(0)`) y dibuje lo que lleva.
2. Si cambia la entrada, cancelar el trazado en curso y empezar el nuevo.
3. Calcular primero los pasos del panel (que son rápidos) y mostrarlos enseguida; el gráfico se completa después.
4. Sin Web Workers en archivo aparte (romperían el HTML único). Si hiciera falta un worker, armarlo desde un `Blob` con el código de los módulos sin DOM, conversándolo antes.

---

### 3.1. Lo que se hizo (2026-11-03)

- `crearTrazado(R)` (`trazado.js`) devuelve `{ avanzar(ms), ramas, terminado }`; `trazarLGR()` sigue existiendo y lo usa de un tirón. El presupuesto total de cómputo sigue siendo 1,5 s (`PRESUPUESTO_TRAZADO`).
- `empezarTrazado()` (`estado.js`) avanza por tandas de 12 ms con `setTimeout(0)`, dibuja lo que va cada 150 ms y, si llega un cálculo nuevo, abandona el viejo. El panel de pasos se muestra enseguida.
- No hizo falta un worker.

Pruebas: «el trazado por tandas da las mismas ramas que de un tirón» (`lgr.test.js`) y «trazar un grado alto no traba la página, y un cálculo nuevo abandona el trazado anterior» (`lgr.spec.js`).

---

## 4. Plan de Pruebas

- `tests/specs/lgr.spec.js`: con `D = s^20+3s+7`, tipear otra tecla mientras se traza y comprobar que el `input` responde (menos de 100 ms entre `keydown` y el cambio de valor) y que el trazado viejo se cancela.
- `tests/unidades/lgr.test.js`: el trazado por tandas da las mismas ramas que el de un tirón (`trazarLGR` sin límite de tiempo).

---

## 5. Criterios de Aceptación

- [x] Ninguna tarea del LGR bloquea la página más de ~100 ms seguidos (medido con grado 20: 71 ms; antes, 1575 ms). El objetivo de 50 ms no se alcanzó: el pico es el navegador pintando el gráfico con decenas de miles de puntos.
- [x] Los 27 ejemplos se dibujan igual que antes (gráfico y panel idénticos, comparados al terminar el trazado).
