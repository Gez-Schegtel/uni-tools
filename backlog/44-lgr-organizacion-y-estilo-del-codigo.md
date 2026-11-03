# Spec 44 — LGR: Organización y Estilo del Código como en las Otras Herramientas

- **ID:** `SPEC-44`
- **Estado:** ✅ Completada
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

### 3.1. Lo que se hizo (2026-11-03)

- `calculo.js` se partió en `polinomios.js`, `entrada.js`, `formato.js`, `analisis.js`, `trazado.js` y `modelo.js` (sin DOM), e `interfaz.js` en `estado.js`, `dibujo.js`, `puntero.js`, `detalles.js`, `barra.js` y `arranque.js`, sin cambiar el contenido.
- Renombres: `V` → `vista`, `Rg` → `resultado`, `t` → `temporizadorCalculo`, `C` → `complejo`, `fr` → `fraccion`; se borró `aviso`.
- **Comillas: se dejaron simples, a propósito.** El LGR arma su HTML con cadenas que llevan atributos entre comillas dobles (`'<td class="si">'`); pasarlas a dobles obligaría a escapar cada atributo y no gana nada. Cuando se pase a armar el DOM con `el()` (o similar), se unifican.
- Los `innerHTML` siguen: lo escrito por el usuario pasa siempre por `esc()`.

Comprobación: el gráfico y el panel de los 27 ejemplos se compararon contra la versión anterior y son idénticos.

---

## 4. Plan de Pruebas

- `tests/unidades/lgr.test.js` y `tests/specs/lgr.spec.js` pasan sin cambios, salvo las rutas que carga `cargar()`.
- La página armada se ve y calcula igual en los 27 ejemplos (comparar el SVG exportado de cada uno antes y después).

---

## 5. Criterios de Aceptación

- [x] Ningún módulo del LGR pasa de ~250 líneas (el más largo, `analisis.js`, tiene 232).
- [x] No quedan globales de una o dos letras salvo `S` y `$` (que es el mismo de las otras herramientas).
- [x] El gráfico y el panel de pasos de los 27 ejemplos son idénticos antes y después.
