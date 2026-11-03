# Spec 37 — Publicar en GitHub Pages Sólo lo Necesario y con las Pruebas en Verde

- **ID:** `SPEC-37`
- **Estado:** ⏳ Pendiente
- **Origen:** Auditoría del 2026-11-03
- **Prioridad:** Media (37 / 39)
- **Esfuerzo estimado:** Bajo (~25 minutos)
- **Archivos afectados:** `.github/workflows/static.yml`, `.github/workflows/tests.yml`

---

## 1. Historia de Usuario

> **Como** dueño del repositorio,
> **quiero** que GitHub Pages publique sólo las páginas y sus imágenes, y únicamente si las páginas armadas coinciden con `src/` y las pruebas pasan,
> **para** que un merge apurado a `main` no deje online una versión rota o desfasada.

---

## 2. Descripción del Problema

`static.yml` corre en cada push a `main` y sube **todo el repositorio** (`path: '.'`) sin esperar a `tests.yml`:

1. Se publican también `src/`, `tests/`, `backlog/`, `INFORME_ANALISIS.md`, `CLAUDE.md` y `.claude/`, que no hacen falta para usar las herramientas.
2. Si alguien edita `src/` y se olvida de correr `node src/construir.js`, Pages publica las páginas viejas. `tests.yml` lo detecta, pero no frena el despliegue.

---

## 3. Especificación de la Solución

1. En `static.yml`, antes de subir, correr `node src/construir.js --comprobar`. Otra opción: disparar el despliegue con `workflow_run` cuando `Pruebas` termina bien en `main`.
2. Armar una carpeta `_sitio/` con `index.html`, las cuatro herramientas y las dos imágenes que usan (`uni-tools-logo.png` y `uni-tools-marca.png`) y subir sólo esa (`path: _sitio`).

---

## 4. Plan de Pruebas

- Probar el workflow en una rama con `workflow_dispatch`: el artefacto tiene sólo los archivos de la lista, y un cambio en `src/` sin armar hace fallar el paso de comprobación.
- `tests/specs/humo.spec.js` ya verifica que cada página abre sin pedidos fallidos (si faltara una imagen en la lista, se vería ahí sirviendo `_sitio/`).

---

## 5. Criterios de Aceptación

- [ ] Pages publica sólo las páginas y sus imágenes.
- [ ] No se despliega si las páginas no coinciden con `src/` (o si fallan las pruebas, según la opción elegida).
