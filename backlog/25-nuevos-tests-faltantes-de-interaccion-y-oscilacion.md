# Spec 25 — Nuevos Tests para Huecos de Cobertura (Oscilación, Rotación/Pines y Rutas)

- **ID:** `SPEC-25`
- **Referencia en el informe:** Secciones `5.4.B.4`, `5.4.C.3` y `5.4.C.6`
- **Prioridad:** Media (25 / 27)
- **Esfuerzo estimado:** Medio (~40 minutos)
- **Archivos afectados:** `tests/specs/simulador.spec.js`, `tests/specs/bloque.spec.js`

---

## 1. Historia de Usuario

> **Como** desarrollador de `uni-tools`,  
> **quiero** contar con pruebas automatizadas para las funciones existentes que hoy no tienen ningún test (detección de oscilación/lazos inestables en el simulador, rotación de compuertas y reducción de pines con limpieza de cables colgados, y botones de variante de ruta / ruta automática en diagramas de bloques),  
> **para** asegurar que futuras modificaciones no rompan silenciosamente estas características de las herramientas.

---

## 2. Descripción de los Huecos de Cobertura

1. **Detección de oscilación (`OSC === true`) en `simulador-logico` (`src/simulador/logica.js:37, 67` y `src/simulador/dibujo.js:138`):**
   - En `simulador.spec.js:58` se comprueba que los 6 ejemplos predefinidos tengan `OSC === false`, pero **ningún test en toda la suite** construye un circuito que oscile para verificar que el bucle de convergencia de 40 iteraciones corte a tiempo, marque `OSC = true` y muestre `"Oscilación / lazo inestable"` con clase `.warn` en `#st-sim`.
2. **Rotación de compuertas (`R` / `#n-rot`) y reducción de entradas (`#n-pins`) en `simulador-logico` (`src/simulador/panel.js:138-140` y `src/simulador/barra.js:51`):**
   - Cuando una compuerta de 4 entradas pasa a 2 entradas desde `#n-pins`, la línea 139 de `src/simulador/panel.js` debe eliminar automáticamente los cables conectados a las patas `2` y `3` (`S.wires = S.wires.filter(w => !(w.to.id === n.id && w.to.pin >= n.pins))`). Hoy no tiene ningún test.
   - Tampoco se prueba que presionar la tecla `r` con una compuerta seleccionada sume `90°` a `n.rot` y reinicie las rutas manuales de sus cables.
3. **Botones `#e-reroute` ("Otra ruta") y `#e-auto` ("Volver a ruta automática") en `diagrama-bloque` (`src/bloque/panel.js:161-162`):**
   - Ningún test verifica que cambiar la variante de ruta (`e.variant`) desde el inspector cambie el recorrido ortogonal ni que `#e-auto` limpie `e.manual` (`e.manual === null`).

---

## 3. Especificación de los Nuevos Tests

### 3.1. En [`tests/specs/simulador.spec.js`](../tests/specs/simulador.spec.js)
1. **Test `"un lazo inestable (NOT realimentada a sí misma) se detecta como oscilación sin colgar la página"`:**
   - Crear una compuerta `NOT` (`id: "g"`) y un cable de su salida `"o0"` a su propia entrada `0`.
   - Llamar a `correr(); render();`.
   - Verificar que `OSC` sea `true` y que `#st-sim` tenga el texto `"Oscilación / lazo inestable"` y la clase `"warn"`.
2. **Test `"bajar la cantidad de entradas de una compuerta borra los cables de las patas que ya no existen, y R la gira"`:**
   - Armar una `AND` de 4 entradas con 4 cables conectados a las patas `0, 1, 2, 3`.
   - Seleccionar la `AND` y cambiar `#n-pins` a `"2"`.
   - Verificar que `S.wires` conserve sólo los cables a las patas `0` y `1` (2 cables) y que un `Ctrl+Z` recupere las 4 entradas y los 4 cables.
   - Con la `AND` seleccionada, presionar `r` y verificar que `n.rot` pase de `0` a `90`.

### 3.2. En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js)
1. **Test `"los botones Otra ruta y Volver a ruta automática del panel cambian y restauran el recorrido de la flecha"`:**
   - En el bloque `test.describe("flechas")` (línea 93), tras mover a mano un tramo de `"e1"` (`Boolean(e.manual) === true`), hacer clic en `#e-auto` y verificar que `e.manual` pase a `null` y la ruta vuelva al trazado automático.
   - Luego hacer clic en `#e-reroute` y verificar que `e.variant` se incremente y cambie el recorrido `e.pts`.

---

## 4. Criterios de Aceptación

- [ ] Los 3 nuevos tests en `simulador.spec.js` y `bloque.spec.js` están implementados y pasan en Chromium y Firefox.
- [ ] Quedan cubiertos el detector de oscilación (`OSC`), la poda de cables al reducir `#n-pins`, la rotación con `R` y los botones `#e-reroute` / `#e-auto`.
