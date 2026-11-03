# Spec 43 — Vocabulario del Modelo: Accesos Comunes sin Tocar el Formato de los Archivos

- **ID:** `SPEC-43`
- **Estado:** ✅ Completada
- **Origen:** Revisión de estructura del 2026-11-03 (informe, sección `2.2.C`)
- **Prioridad:** Baja (43 / 46)
- **Esfuerzo estimado:** Bajo / Medio (~40 minutos)
- **Archivos afectados:** `src/*/herramienta.js`, `src/comun/`, `tests/specs/ayudas.js`, `tests/specs/*.spec.js`

---

## 1. Historia de Usuario

> **Como** quien escribe código o pruebas que valen para las tres herramientas,
> **quiero** pedir «los nodos», «las conexiones» o «la etiqueta de un nodo» sin saber cómo se llama cada cosa en cada herramienta,
> **para** no repetir condicionales y no equivocarme de nombre.

---

## 2. Descripción del Problema

Cada herramienta nombra distinto lo mismo:

| concepto | bloques | simulador | señales |
|---|---|---|---|
| nodos | `nodes` | `nodes` | `nodos` |
| conexiones | `edges` | `wires` | `ramas` |
| conexiones seleccionadas | `selEdges` | `selW` | `selR` |
| etiqueta | `label` | `label` | `nombre` |
| tipo | `type` | `type` | `tipo` |

`HERRAMIENTA.nodos`, `HERRAMIENTA.conexiones` y `HERRAMIENTA.selConexion` ya resuelven parte en `src/comun/`. Pero las pruebas comunes repiten condicionales como `S.edges || S.wires || S.ramas` o `n.label !== undefined ? n.label : n.nombre` (`inicio.spec.js`, `lienzo.spec.js`, `archivos-danados.spec.js`).

**Lo que no se cambia:** el formato de los JSON, de los SVG exportados y del autoguardado. Renombrar las claves obligaría a migrar los archivos que ya tienen los estudiantes (ver «Decisiones» en el índice).

---

## 3. Especificación de la Solución

1. En `src/comun/` (por ejemplo, junto a `ids.js`), definir accesos que usen `HERRAMIENTA`: `nodosDe()`, `conexionesDe()`, `seleccionDeConexiones()`, `etiquetaDe(n)` y `tipoDe(n)`.
2. En cada `herramienta.js`, declarar las claves que faltan (`etiqueta: "label"` / `"nombre"`, `tipo: "type"` / `"tipo"`).
3. Reemplazar los condicionales de `src/comun/` y de las pruebas comunes por esos accesos. En las pruebas, por medio de `tests/specs/ayudas.js`.

---

### 3.1. Lo que se hizo (2026-11-03)

Los accesos quedaron en `src/comun/ids.js` (que incluyen las tres herramientas de diagramas) y cada `herramienta.js` declara `etiqueta` y `tipo`. En `src/comun/` ya no había condicionales por herramienta (todo usaba `HERRAMIENTA`); los que quedaban estaban en `inicio.spec.js`, `lienzo.spec.js` y `archivos-danados.spec.js`, y ahora usan los accesos. `docDatos()` no cambió: los archivos son idénticos.

---

## 4. Plan de Pruebas

- La suite entera pasa igual; `grep` de `S.edges || S.wires` y `label !== undefined` en `src/comun/` y `tests/` no encuentra nada.

---

## 5. Criterios de Aceptación

- [x] El código común y las pruebas comunes no preguntan qué herramienta es para leer el modelo.
- [x] Los archivos guardados antes y después del cambio son idénticos.
