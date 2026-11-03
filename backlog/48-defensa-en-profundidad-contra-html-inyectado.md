# Spec 48 — Defensa en Profundidad contra HTML Inyectado

- **ID:** `SPEC-48`
- **Estado:** ✅ Completada
- **Origen:** Auditoría de seguridad del 2026-11-03 (segunda parte)
- **Prioridad:** Media
- **Esfuerzo estimado:** Medio (~45 minutos)
- **Archivos afectados:** `src/comun/seguridad.html` (nuevo), `src/*/pagina.html`, `index.html`, `src/bloque/panel.js`, `src/simulador/panel.js`, `src/comun/hoja.js`, `src/comun/barra.js`, `src/lgr/documento.js`

---

## 1. Historia de Usuario

> **Como** estudiante que abre archivos que le pasan otros,
> **quiero** que un archivo malicioso no pueda ejecutar nada ni sacar mis datos,
> **para** poder abrir lo que me manden sin miedo.

---

## 2. Descripción del Problema (lo que encontró la auditoría)

Se atacaron las cinco páginas con archivos y autoguardados trampa (`"><img onerror=…>` y `<svg onload=…>` en **todos** los campos: etiquetas, nombres, colores, signos, tamaños, ids, hoja, ganancias, polinomios), abriendo después cada panel, la tabla de verdad, la ventana de Mason y la exportación, y también claves `__proto__`/`constructor`: **no se ejecutó nada y no se contaminó ningún prototipo.** Abrir un SVG con `<script>` tampoco ejecuta nada (se lee con `DOMParser`).

Pero la defensa era de una sola capa:

1. En los paneles se interpolaban números en `innerHTML` sin escapar (`value="${n.w}"`, `${n.font}`, `${H.w}`, `${e.width}`): eran seguros sólo porque `depurarNodos()` y compañía los dejan como números al cargar. Un camino nuevo de entrada que se olvidara de sanear abría un agujero.
2. Los botones «Cerrar» tenían `onclick="…"` escrito en el HTML.
3. No había política de seguridad del contenido: si algo se colaba, podía traer código de afuera o mandar datos.

---

## 3. Lo que se hizo

- Todo lo interpolado en esos `innerHTML` pasa por `esc()` (18 lugares).
- Los `onclick` de las plantillas se cambiaron por `data-cerrar="id"`, que atiende `comun/barra.js` (y `lgr/documento.js`).
- `src/comun/seguridad.html`, incluido por las cuatro herramientas y copiado en `index.html`:
  `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' file: data: blob:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`.
  `'unsafe-inline'` hace falta porque cada herramienta es un único `<script>` en línea (la regla del proyecto); lo que la CSP corta es todo lo de afuera.

---

## 4. Plan de Pruebas

- `tests/specs/humo.spec.js`: cada página tiene la CSP; abrirla y exportar PNG no la violan, y una imagen de afuera queda bloqueada; con `file://` (doble clic) el logo se ve; no queda ningún `[onclick]` y los «Cerrar» andan.
- La suite entera pasa igual (incluidas las de HTML inyectado de `archivos-danados.spec.js`).

---

## 5. Criterios de Aceptación

- [x] Ninguna interpolación en `innerHTML` depende de que el dato haya llegado saneado.
- [x] Ninguna página puede cargar ni mandar nada afuera.
- [x] La herramienta funciona igual con doble clic (`file://`) y servida por HTTP.
