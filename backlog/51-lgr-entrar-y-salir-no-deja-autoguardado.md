# Spec 51 — LGR: Entrar y Salir sin Cambios no Deja Autoguardado

- **ID:** `SPEC-51`
- **Estado:** ✅ Completada
- **Origen:** Auditoría de la suite de pruebas del 2026-11-03 (una prueba nueva lo encontró)
- **Prioridad:** Baja
- **Esfuerzo estimado:** Muy bajo (~10 minutos)
- **Archivos afectados:** `src/lgr/documento.js`, `src/lgr/arranque.js`, `tests/specs/lgr.spec.js`

---

## 1. Historia de Usuario

> **Como** estudiante que sólo entró a mirar el LGR,
> **quiero** que la portada no me diga que tengo un ejercicio guardado,
> **para** que el aviso signifique algo.

---

## 2. Descripción del Problema

SPEC-35 dejó dicho que el LGR guarda recién cuando el usuario cambia algo, pero el `pagehide` (y el botón Inicio) llamaban a `autoguardar()` igual: entrar y salir sin tocar nada dejaba el ejemplo inicial en `uni-tools-autoguardado-lgr`, y la portada mostraba «Tenés un ejercicio guardado».

---

## 3. Lo que se hizo

`autoguardar()` no guarda si todavía no hay nada guardado y el ejercicio es el mismo con el que arrancó la página (`docAlArrancar`, que anota `arranque.js`). Si ya había algo guardado, o el usuario cambió algo, guarda como siempre.

---

## 4. Plan de Pruebas

- `lgr.spec.js`, «entrar y salir del LGR sin tocar nada no deja nada guardado»: después de `pagehide` no hay clave; después de escribir en un campo, sí.

---

## 5. Criterios de Aceptación

- [x] Entrar y salir sin cambios no deja nada en el navegador.
- [x] Un cambio se sigue guardando.
