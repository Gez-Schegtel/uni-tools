# Spec 41 — Redibujar por Capas en Vez de Rearmar Todo en Cada Cambio

- **ID:** `SPEC-41`
- **Estado:** ✅ Completada
- **Origen:** Revisión de estructura del 2026-11-03 (informe, sección `4.1`)
- **Prioridad:** Baja (41 / 46)
- **Esfuerzo estimado:** Alto (~2 horas, una herramienta por vez)
- **Depende de:** `SPEC-20` (sacar la geometría de `render()`) y `SPEC-21` (el caso del mouse sin arrastre)
- **Archivos afectados:** `src/bloque/dibujo.js`, `src/simulador/dibujo.js`, `src/senales/dibujo.js`, sus `panel.js`

---

## 1. Historia de Usuario

> **Como** estudiante con un diagrama grande (un parcial con 40 bloques o un contador de 8 bits),
> **quiero** que arrastrar, seleccionar o tipear en el panel siga fluido,
> **para** no sentir la herramienta trabada a medida que el diagrama crece.

---

## 2. Descripción del Problema

En las tres herramientas, `render()` vacía las capas del SVG (`textContent = ""`) y las vuelve a armar enteras. Además recalcula tamaños y rutas (y en el simulador vuelve a simular todo) y reconstruye el panel derecho con `innerHTML`. Eso pasa por **cualquier** cambio: mover un elemento un píxel, seleccionar algo o tipear una letra en el panel.

`SPEC-21` resuelve el caso más frecuente (pasar el mouse sin arrastrar). Este es el paso siguiente: que cada cambio redibuje sólo lo que tocó.

---

## 3. Especificación de la Solución

1. Partir `render()` en `dibujarAtras()`, `dibujarConexiones()`, `dibujarNodos()`, `dibujarSuperpuesto()` y `dibujarPanel()`, más un `render(qué)` que reciba qué capas están «sucias». Sin argumento sigue redibujando todo, así nada se rompe.
2. Usar los cambios más frecuentes como primer objetivo:
   - selección → nodos (marca) + superpuesto + panel;
   - arrastre de un nodo → ese nodo + sus conexiones + superpuesto (el panel recién al soltar);
   - tipeo en el panel → nodo editado + sus conexiones (el panel no se reconstruye: ya tiene el foco).
3. Medir antes y después con un diagrama de 40 elementos (`performance.now()` alrededor de `render()`).

---

### Lo que se hizo (2026-11-03)

- `render("lienzo")` (todo menos el panel) se usa al arrastrar, estirar y correr tramos, en bloques y en el simulador; el panel se rehace al soltar.
- En bloques, `dibujarReusando()` (`comun/lienzo.js`) reusa el `<g>` de cada elemento cuya firma no cambió: arrastrar uno no rearma los demás. En el simulador no se aplica todavía (cada compuerta depende de los valores de la simulación: habría que meterlos en la firma); en señales tampoco (no tiene hover ni panel pesado).

Prueba: en `lienzo.spec.js`, «bloques: pasar el mouse … y arrastrar uno no rearma los otros».

---

## 4. Plan de Pruebas

- La suite actual tiene que pasar igual: `lienzo.spec.js`, `comun.spec.js` y las de cada herramienta.
- Prueba nueva en `lienzo.spec.js`: al arrastrar un nodo, los `<g>` de los nodos que no se movieron son las mismas instancias DOM antes y después.

---

## 5. Criterios de Aceptación

- [x] Arrastrar un nodo en un diagrama de 40 elementos no reconstruye los demás ni el panel.
- [x] Ninguna prueba existente cambia.
