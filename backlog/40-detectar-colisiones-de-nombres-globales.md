# Spec 40 — Detectar Colisiones de Nombres Globales al Armar las Páginas

- **ID:** `SPEC-40`
- **Estado:** ✅ Completada
- **Origen:** Revisión de estructura del 2026-11-03 (informe, sección `2.2.A`)
- **Prioridad:** Media (40 / 46)
- **Esfuerzo estimado:** Bajo (~30 minutos)
- **Archivos afectados:** `src/construir.js`, `tests/specs/fuentes.spec.js`, `CLAUDE.md`

---

## 1. Historia de Usuario

> **Como** quien agrega un módulo a `src/comun/` o a una herramienta,
> **quiero** que el armado me avise si una función o variable global se llama igual que otra de la misma página,
> **para** que una función no pise en silencio a otra con el mismo nombre.

---

## 2. Descripción del Problema

Todo el JavaScript de una página termina en un único `<script>` clásico, así que los módulos comparten el ámbito global. Hoy cada página tiene muchos nombres globales: bloques 222, simulador 235, señales 175 y LGR 68. No hay ningún repetido.

Pero si mañana dos módulos declaran `function fit()`, el segundo pisa al primero **sin ningún error**. Con `const`/`let` repetidos el navegador sí falla al cargar, pero recién en ejecución.

Sacar el ámbito global no se va a hacer (ver «Decisiones» en el índice): es consecuencia de la regla del HTML autocontenido sin bundler. Lo que sí se puede hacer es **detectar** las colisiones.

---

## 3. Especificación de la Solución

1. En `src/construir.js`, al armar cada página, juntar las declaraciones de nivel superior de cada módulo JS incluido (`function`, `const`, `let`, `var`, `class` al principio de línea) y fallar con un mensaje claro si un nombre aparece en dos módulos: «`fit` está en `comun/vista.js` y en `senales/interaccion.js`».
2. Permitir excepciones explícitas, si alguna vez se necesita pisar algo a propósito, con un comentario `/* @pisa nombre */` en el módulo que pisa.
3. Documentar la comprobación en `CLAUDE.md`, junto a la nota sobre el orden de inclusión.

---

## 4. Plan de Pruebas

- `tests/specs/fuentes.spec.js`: armar en memoria una plantilla de prueba con dos módulos que declaran la misma función y esperar el error.
- `node src/construir.js --comprobar` sigue pasando con las cuatro páginas actuales.

---

## 5. Criterios de Aceptación

- [x] Un nombre global repetido entre módulos de una página hace fallar el armado y la CI.
- [x] El mensaje dice el nombre y los dos archivos.
