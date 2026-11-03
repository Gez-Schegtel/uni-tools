# Spec 49 — Endurecer los Workflows de GitHub Actions

- **ID:** `SPEC-49`
- **Estado:** 🟡 Parcial (lo que falta necesita al dueño, ver 3.2)
- **Origen:** Auditoría de seguridad del 2026-11-03 (segunda parte)
- **Prioridad:** Media / Baja
- **Esfuerzo estimado:** Bajo (~20 minutos)
- **Archivos afectados:** `.github/workflows/static.yml`, `.github/workflows/tests.yml`, `tests/specs/fuentes.spec.js`

---

## 1. Historia de Usuario

> **Como** dueño del repositorio,
> **quiero** que los workflows tengan los permisos justos y no dejen credenciales a mano,
> **para** que una acción comprometida o un paso nuevo descuidado no pueda tocar el repo ni el sitio.

---

## 2. Descripción del Problema

Lo que ya estaba bien: los dos workflows declaran `permissions` (pruebas: sólo `contents: read`; Pages: `pages: write` e `id-token: write`, lo justo para desplegar), corren con `pull_request` (no `pull_request_target`, que ejecutaría código de forks con permisos) e instalan las dependencias de prueba con `npm ci` desde el `package-lock.json`.

Lo que faltaba:

1. `actions/checkout` deja por defecto el token de GitHub guardado en `.git/config` para el resto del trabajo. Ningún paso empuja nada, así que no hace falta.
2. El despliegue no tenía `timeout-minutes` (el de pruebas sí).
3. Las acciones se usan por etiqueta (`actions/checkout@v6`), que su dueño puede mover. Lo más seguro es fijarlas por el SHA del commit.

---

## 3. Lo que se hizo

### 3.1. Hecho

- `persist-credentials: false` en los dos `checkout`.
- `timeout-minutes: 10` en el despliegue.
- `tests/specs/fuentes.spec.js` comprueba en cada workflow: `permissions` declarado, `timeout-minutes`, nada de `pull_request_target` y `persist-credentials: false` en cada `checkout`.

### 3.2. Pendiente (necesita al dueño)

Fijar las acciones por SHA: para cada `uses: actions/<nombre>@vN`, buscar en GitHub el commit de esa etiqueta y escribir `uses: actions/<nombre>@<sha de 40 caracteres>  # vN`. Desde esta sesión no se pudo consultar los repositorios `actions/*`. Si se hace, conviene sumar Dependabot para `github-actions` (`.github/dependabot.yml`) para que avise cuando haya versiones nuevas; también eso lo decide el dueño, porque abre pull requests solo.

---

## 4. Plan de Pruebas

- `fuentes.spec.js`, «los workflows declaran permisos, tienen tope de tiempo y no dejan el token en el checkout».
- La próxima corrida de `tests.yml` en el PR confirma que el checkout sin credenciales no rompe nada.

---

## 5. Criterios de Aceptación

- [x] Ningún workflow deja el token en el checkout.
- [x] Los dos tienen tope de tiempo y permisos declarados.
- [ ] Las acciones están fijadas por SHA (pendiente, 3.2).
