# Spec 25 — Nuevos Tests para Huecos de Cobertura (Oscilación, Rotación/Pines y Rutas)

- **ID:** `SPEC-25`
- **Estado:** ✅ Completada
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
2. **Rotación de compuertas (`R` / `#rot-der` / `#rot-izq`) y reducción de entradas (`#n-pins`) en `simulador-logico` (`src/simulador/panel.js:156-164, 192-200`):**
   - Cuando una compuerta de 4 entradas pasa a 2 entradas desde `#n-pins`, la línea 160 de `src/simulador/panel.js` debe eliminar automáticamente los cables conectados a las patas `2` y `3` (`S.wires = S.wires.filter(w => !(w.to.id === n.id && w.to.pin >= k))`). Hoy no tiene ningún test.
   - Tampoco se prueba que presionar la tecla `r` con una compuerta seleccionada sume `90°` a `n.rot` y reinicie las rutas manuales de sus cables.
3. **Botones `#w-alt` ("Ruta alternativa") y `#w-reset` ("Ruta automática") en cables de `simulador-logico` (`src/simulador/panel.js:9-10, 167-168`):**
   - *(Nota de coordinación con [`SPEC-28`](./28-simplificacion-panel-sin-duplicar-ni-botones-flecha.md): en `diagrama-bloque` los botones de ruta del panel de flechas se eliminaron por pedido del usuario en `SPEC-28`, por lo que este test se enfoca en los cables de `simulador-logico` o en el cambio de puertos `#e-fp`/`#e-tp` en `diagrama-bloque`).*

---

## 3. Especificación de los Nuevos Tests

### 3.1. En [`tests/specs/simulador.spec.js`](../tests/specs/simulador.spec.js)
1. **Test `"un lazo inestable (NOT realimentada a sí misma) se detecta como oscilación sin colgar la página"`:**
   - Crear una compuerta `NOT` (`id: "g"`) y un cable de su salida `"o0"` a su propia entrada `0`.
   - Llamar a `correr(); render();`.
   - Verificar que `OSC` sea `true` y que `#st-warn .warn` muestre `"el circuito oscila: revisá la realimentación"`.
2. **Test `"bajar la cantidad de entradas de una compuerta borra los cables de las patas que ya no existen, y R la gira"`:**
   - Armar una `AND` de 4 entradas con 4 cables conectados a las patas `0, 1, 2, 3`.
   - Seleccionar la `AND` y cambiar `#n-pins` a `"2"`.
   - Verificar que `S.wires` conserve sólo los cables a las patas `0` y `1` (2 cables) y que un `Ctrl+Z` recupere las 4 entradas y los 4 cables.
   - Con la `AND` seleccionada, presionar `r` y verificar que `n.rot` pase de `0` a `90`.

### 3.2. En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js)
1. **Test `"cambiar el puerto de origen o destino desde el panel (#e-fp / #e-tp) recalcula la ruta automática de la flecha"`:**
   - Seleccionar una flecha con ruta manual (`Boolean(e.manual) === true`), cambiar `#e-fp` o `#e-tp` en el panel y verificar que `e.manual` se limpie (`undefined`) y la flecha se conecte al nuevo puerto.

---

## 4. Criterios de Aceptación

- [x] Los 3 nuevos tests en `simulador.spec.js` y `bloque.spec.js` están implementados y pasan en Chromium y Firefox.
- [x] Quedan cubiertos el detector de oscilación (`OSC`), la poda de cables al reducir `#n-pins`, la rotación con `R` y el recálculo de ruta al cambiar `#e-fp` / `#e-tp`.
