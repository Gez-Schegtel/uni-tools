# Spec 52 — Auditoría de la Suite de Pruebas: Significativas, sin Redundancias y Completas

- **ID:** `SPEC-52`
- **Estado:** ✅ Completada
- **Origen:** Pedido del dueño, 2026-11-03
- **Prioridad:** Media
- **Esfuerzo estimado:** Medio (~1 hora)
- **Archivos afectados:** `tests/specs/lgr.spec.js`, `tests/specs/senales.spec.js`, `tests/unidades/lgr.test.js`, `tests/unidades/ruteo.test.js` (nuevo), `tests/README.md`

---

## 1. Historia de Usuario

> **Como** dueño del proyecto,
> **quiero** que cada prueba controle algo que puede fallar, que no haya dos que controlen lo mismo y que no falte ninguna importante,
> **para** confiar en que «todo verde» quiere decir que anda.

---

## 2. Lo que se revisó

1. **Inventario:** 289 pruebas de Playwright por navegador (578 contando Chromium y Firefox) en 13 archivos, y 36 unitarias en 5. Las que se repiten por título son pruebas parametrizadas por herramienta: corren la misma comprobación en cada página.
2. **Pruebas débiles:** se buscaron pruebas sin aserciones o con una sola. Las que quedaron con una sola la tienen fuerte (comparan la estructura entera, o cada letra de una leyenda).
3. **¿Son significativas? Mutaciones:** se metieron errores a propósito en el código y se corrió la suite. Las 10 mutaciones las detectó alguna prueba:

| mutación | la detecta |
|---|---|
| Mason no cuenta pares de lazos disjuntos | `mason.test.js` |
| la simplificación de una función nula da 1 | `logica.test.js` |
| la regla del eje real del LGR, invertida | `lgr.test.js` |
| el LGR acepta cruces con K negativo | `lgr.test.js` |
| las ecuaciones sin topes de largo y anidamiento | `ecuaciones.test.js` |
| el ruteo de bloques ignora los obstáculos | `ruteo.test.js` (nueva) |
| el LGR sin tope de paréntesis | `lgr.test.js` |
| `esc()` no escapa nada | `archivos-danados.spec.js` |
| un bloque acepta dos entradas | `bloque.spec.js` (2 pruebas) |
| la CSP deja conectarse afuera | `humo.spec.js` (4 pruebas) |

## 3. Lo que se cambió

- **Redundancias quitadas:**
  - `lgr.spec.js`: «exporta un SVG válido» estaba contenida en «el SVG exportado trae la leyenda y el ejercicio…», que ahora también comprueba que el XML sea válido.
  - `lgr.test.js`: «caso de libro K/(s(s+1)(s+2))» era el caso α = 1 de la prueba de escalas, que ahora también comprueba los ángulos de las asíntotas.
- **Pruebas que faltaban:**
  - `tests/unidades/ruteo.test.js`: el ruteo de bloques compartido (puertos, ángulo recto, esquiva obstáculos, no lee `S`).
  - `lgr.spec.js`: atajos `F`, `+`, `−` y `D`, y que entrar y salir sin cambios no deje nada guardado. **Esta encontró un bug:** ver `SPEC-51`.
  - `senales.spec.js`: las tablas de lazos disjuntos de Mason se recortan («… y N más»).
  - `fuentes.spec.js` (en el commit de `SPEC-50`): `sitio.js` falla con un archivo faltante y no borra el repo.

---

## 4. Criterios de Aceptación

- [x] Todas las mutaciones probadas las detecta alguna prueba.
- [x] No quedan dos pruebas que controlen lo mismo en la misma herramienta.
- [x] Lo que se agregó en esta tanda (ruteo compartido, atajos del LGR, recorte de Mason, `sitio.js`) tiene prueba.
