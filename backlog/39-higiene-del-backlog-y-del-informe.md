# Spec 39 — Higiene del Backlog y del Informe

- **ID:** `SPEC-39`
- **Estado:** ✅ Completada
- **Origen:** Auditoría del 2026-11-03
- **Prioridad:** Baja (39 / 46)
- **Esfuerzo estimado:** Muy bajo (~15 minutos)
- **Archivos afectados:** `backlog/00-INDICE-BACKLOG.pdf`, `INFORME_ANALISIS.md`, `backlog/0*-*.md` a `backlog/2*-*.md`

---

## 1. Historia de Usuario

> **Como** quien retoma el proyecto,
> **quiero** que el backlog y el informe digan lo que hay hoy en el código,
> **para** no perder tiempo siguiendo líneas, archivos o commits que ya no existen.

---

## 2. Descripción del Problema

1. **`backlog/00-INDICE-BACKLOG.pdf`** es una foto del índice del 2 de noviembre: ya no tiene SPEC-34 a SPEC-39 y va a quedar viejo con cada cambio de estado. Se versiona un binario que duplica el `.md`.
2. **`INFORME_ANALISIS.md`** describe el estado del 28 de octubre. Varias cosas ya no son ciertas (`CLAUDE.md` «eliminado», BUG-01 a BUG-07 «abiertos») y no lo aclara.
3. **Números de línea en las specs:** casi todas citan `archivo.js:NN` de una versión anterior. Las specs ya hechas son historia; en las pendientes (18 a 22) conviene citar funciones, no líneas.
4. **Prioridades «n / 27»** en SPEC-01 a SPEC-27, cuando el backlog ya tiene 46.

---

## 3. Especificación de la Solución

1. Borrar `backlog/00-INDICE-BACKLOG.pdf`. Si hace falta un PDF, generarlo cuando se necesite (no versionarlo).
2. Agregar al principio de `INFORME_ANALISIS.md`: «Foto del 28/10/2026 (commit `22051e0`). El estado de cada hallazgo está en `backlog/00-INDICE-BACKLOG.md`».
3. En SPEC-18 a SPEC-22, reemplazar `archivo:línea` por `archivo` + nombre de función.
4. Quitar el «/ 27» de las prioridades, o actualizarlo.

---

### 3.1. Lo que se hizo (2026-11-03)

- Se borró `backlog/00-INDICE-BACKLOG.pdf`; el índice es el `.md`.
- `INFORME_ANALISIS.md` arranca con una nota: es una foto del 28/10/2026 y el estado de cada hallazgo está en el índice.
- Las prioridades de SPEC-01 a SPEC-27 ya no dicen «/ 27».
- Los enlaces que apuntaban a archivos movidos (`src/bloque/ruteo.js` → `src/comun/ruteo-bloques.js`) se corrigieron, y `tests/specs/fuentes.spec.js` ahora comprueba que todo enlace relativo del backlog, el README, CLAUDE.md, `tests/README.md` y la skill apunte a un archivo que existe.
- **Números de línea:** las specs 18 a 22 ya están hechas, así que sus citas `archivo:línea` quedaron como historia (describen el código de cuando se escribieron). Las specs nuevas y las notas «Lo que se hizo» citan archivos y funciones, no líneas.

---

## 4. Plan de Pruebas

- Comprobar los enlaces: todo enlace relativo de `backlog/*.md` apunta a un archivo que existe (se puede sumar a `tests/specs/fuentes.spec.js`).

---

## 5. Criterios de Aceptación

- [x] No hay enlaces rotos en `backlog/`.
- [x] El informe aclara que es una foto con fecha.
