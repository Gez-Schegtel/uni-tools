# Spec 27 — Limpieza de Archivos Huérfanos y Reducción de Peso del Repositorio

- **ID:** `SPEC-27`
- **Estado:** ✅ Completada
- **Referencia en el informe:** Sección `6.2`
- **Prioridad:** Baja (27 / 27)
- **Esfuerzo estimado:** Muy bajo (~10 minutos)
- **Archivos afectados:** `uni-tools-logo.jpg` (versionado en Git), `/node_modules/` y `/test-results/` (locales en la raíz)

---

## 1. Historia de Usuario

> **Como** mantenedor del repositorio `uni-tools`,  
> **quiero** eliminar del control de versiones los archivos binarios pesados que no se usan en ninguna página ni documento y limpiar del directorio raíz las carpetas locales huérfanas de otras ramas,  
> **para** mantener el repositorio liviano, rápido de clonar y fiel a la regla de que en la raíz no hay `node_modules`.

---

## 2. Descripción del Problema

1. **`uni-tools-logo.jpg` (2.03 MB, 1696×2528 px) versionado en Git sin ningún uso:**
   - Ningún archivo del proyecto (`index.html`, `src/**`, `README.md`, `tests/**`) referencia a `uni-tools-logo.jpg` (la portada `index.html` utiliza `logo.png`, de 469 KB).
   - Ese único archivo `.jpg` sin usar representa más del **70 % del tamaño de los archivos actuales del repositorio**.
2. **Carpetas locales huérfanas en la raíz del proyecto:**
   - En el disco local existen `/node_modules/` (51 paquetes remanentes de cuando se probó la rama `features/migracion`) y `/test-results/` en la raíz, mientras que la suite de pruebas de esta arquitectura instala todo exclusivamente dentro de `tests/node_modules/`.

---

## 3. Especificación de la Solución

1. Eliminar `uni-tools-logo.jpg` del seguimiento de Git:
   ```bash
   git rm uni-tools-logo.jpg
   ```
2. Eliminar las carpetas locales huérfanas de la raíz (respetando `tests/node_modules/`):
   ```bash
   rm -rf node_modules test-results
   ```

---

## 4. Plan de Pruebas

- Ejecutar `npx --prefix tests playwright test specs/humo.spec.js` para verificar que `index.html` y las tres herramientas cargan todos sus recursos locales (`logo.png`, etc.) sin ningún pedido fallido (`requestfailed`).

---

## 5. Criterios de Aceptación

- [x] `uni-tools-logo.jpg` ya no figura en `git ls-files`.
- [x] En la raíz del proyecto no existen `node_modules/` ni `test-results/`.
- [x] `tests/specs/humo.spec.js` pasa sin errores ni recursos faltantes en Chromium y Firefox.
