# Spec 44 — LGR: Organización y Estilo del Código como en las Otras Herramientas

- **ID:** `SPEC-44`
- **Estado:** ⏳ Pendiente
- **Origen:** Revisión de estructura del 2026-11-03
- **Prioridad:** Media / Baja (44 / 46)
- **Esfuerzo estimado:** Medio (~1 hora)
- **Conviene hacerla junto con:** `SPEC-35` (paridad con `src/comun/`)
- **Archivos afectados:** `src/lgr/interfaz.js`, `src/lgr/calculo.js`, `src/lgr/pagina.html`

---

## 1. Historia de Usuario

> **Como** mantenedor,
> **quiero** que el código del LGR esté partido y nombrado como el de las otras herramientas,
> **para** encontrar las cosas donde las busco y poder llevarle lo común sin reescribirlo.

---

## 2. Descripción del Problema

El LGR llegó del proyecto original como un único archivo. Al integrarlo sólo se separó en `calculo.js` (584 líneas) e `interfaz.js` (548 líneas), sin cambiar el contenido:

1. **`interfaz.js` hace todo:** estado, vista, dibujo del gráfico, interacción con el puntero, panel de detalles (unas 170 líneas de HTML armado con cadenas), barra, ejemplos y exportación.
2. **Nombres globales cortos o poco claros:** `S` (estado), `V` (vista), `Rg` (resultado del análisis), `t` (un temporizador global, con un nombre de una sola letra), `C` (complejo), `fr`, `nice`. Además, `aviso` se asigna pero nunca se lee.
3. **HTML armado con cadenas:** 14 asignaciones de `innerHTML`. Hoy no hay agujeros (los textos del usuario pasan por `esc()`), pero cualquier dato nuevo que se agregue sin escapar sería uno. Las otras herramientas usan el mismo patrón, pero con helpers comunes (`esc`, `conSub`).
4. **Comillas simples**, cuando el resto del proyecto usa dobles.

---

## 3. Especificación de la Solución

1. Partir `interfaz.js` como las otras herramientas: `estado.js`, `vista.js` (encuadre, zoom, puntero), `dibujo.js` (gráfico), `detalles.js` (pasos), `barra.js` (botones y ejemplos) y `exportar.js`. Lo mismo con `calculo.js`: `polinomios.js` (aritmética y raíces), `entrada.js` (parsers) y `analisis.js` (pasos y trazado).
2. Renombrar `V` → `vista`, `Rg` → `resultado`, `t` → `temporizadorCalculo`, y borrar `aviso`. `S` puede quedar, por coherencia con las otras herramientas.
3. Unificar comillas y escape con el estilo del resto (y, cuando se haga `SPEC-35`, usar `esc` de `comun/`).
4. Respetar `SPEC-40`: ningún nombre nuevo puede chocar con `comun/` cuando se incluya.

---

## 4. Plan de Pruebas

- `tests/unidades/lgr.test.js` y `tests/specs/lgr.spec.js` pasan sin cambios, salvo las rutas que carga `cargar()`.
- La página armada se ve y calcula igual en los 27 ejemplos (comparar el SVG exportado de cada uno antes y después).

---

## 5. Criterios de Aceptación

- [ ] Ningún módulo del LGR pasa de ~250 líneas.
- [ ] No quedan globales de una o dos letras salvo `S`.
- [ ] Los SVG exportados de los 27 ejemplos son idénticos antes y después.
