# Spec 35 — LGR: Paridad con las Otras Herramientas (Comunes, Autoguardado, Ayuda, Exportación)

- **ID:** `SPEC-35`
- **Estado:** ✅ Completada
- **Origen:** Auditoría del 2026-11-03 al integrar `simulador-lgr.html` del proyecto original
- **Prioridad:** Media / Baja (35 / 46)
- **Esfuerzo estimado:** Alto (~2 horas, conviene partirla)
- **Archivos afectados:** `src/lgr/*`, `src/comun/*`, `index.html`, `tests/specs/lgr.spec.js`

---

## 1. Historia de Usuario

> **Como** usuario que ya conoce las otras tres herramientas,
> **quiero** que el LGR se maneje igual (botón Inicio, ayuda con `?`, avisos, guardar y abrir, aviso de lo guardado en la portada),
> **para** no tener que aprender otra interfaz y poder retomar un ejercicio.

---

## 2. Descripción del Problema

`simulador-lgr.html` llegó del proyecto original como un archivo suelto. Ya se arma desde `src/lgr/`, pero todavía no usa nada de `src/comun/`:

1. **Barra y ayuda:** no tiene el botón **Inicio** común (usa el logo como enlace), ni la ventana de ayuda **?** ni atajos de teclado (`F` encuadrar, `+`/`−`, `?`).
2. **Autoguardado:** guarda en `localStorage["uni-tools-lgr"]`, no en `uni-tools-autoguardado-lgr` como las demás, así que la portada no muestra «Tenés un diagrama guardado».
3. **Guardar y abrir:** no se puede guardar el ejercicio en JSON ni volver a abrirlo. El SVG exportado no lleva los datos adentro (`<metadata id="uni-tools-datos">`) ni la **leyenda**, y los nombres de archivo son fijos (`lgr.svg`, `lgr.png`).
4. **PNG:** sale al doble de tamaño; las otras herramientas lo exportan al triple.
5. **Avisos:** usa su propio `#msj`; las demás usan `toast()` con cierre.

---

## 3. Especificación de la Solución

Partirla en tres pasos, cada uno con su commit y sus pruebas:

1. **Barra común e Inicio + ayuda `?`**: incluir `comun/inicio.html`, `comun/base.css` (si no rompe el diseño propio) y una ventana de ayuda con los atajos.
2. **Autoguardado común**: migrar la clave vieja a `uni-tools-autoguardado-lgr` (leer la vieja una vez) y agregar `data-auto="lgr"` al botón de la portada, adaptando el script de `index.html` (que hoy busca `nodes`/`nodos`).
3. **Documento**: `docDatos()` con `{ version, herramienta: "lgr", modo, N, D, Z, P, ver }`, Abrir JSON/SVG con `comun/documento.js`, SVG con metadata y leyenda, nombres de archivo con `limpiarNombre()` y PNG 3×.

---

### 3.1. Lo que se hizo (2026-11-03)

- De `src/comun/`: `lienzo.js` (`$`, `svg`, `el`, `esc`, `toast`), `inicio.html` y `avisos.css` (se separó de `base.css` lo de avisos, ventanas y teclas; las otras páginas lo siguen incluyendo a través de `base.css`).
- `src/lgr/documento.js` (nuevo): `docDatos()` con `version` y `herramienta: "lgr"`, autoguardado en `uni-tools-autoguardado-lgr` como `{ guardado, doc }` (migra la clave vieja `uni-tools-lgr` una vez), Abrir JSON/SVG (rechaza documentos de otra herramienta), Guardar JSON, Inicio, ayuda `?` y atajos (`F`, `+`, `−`, `D`, `Ctrl+S`, `Ctrl+O`, `Esc`).
- SVG exportado con `<metadata id="uni-tools-datos">` y la leyenda; PNG al triple; archivos `lugar-de-raices.*`.
- La portada avisa «Tenés un ejercicio guardado» (`data-auto="lgr"`); el LGR guarda recién cuando el usuario cambia algo, así que entrar y salir no deja nada.

**Lo que no se tomó de `comun/`:** `autoguardado.js`, `documento.js`, `barra.js` y `teclado.js` suponen un diagrama con nodos, historial y `cargarDoc()`; adaptarlos al LGR costaba más que replicar estas pocas funciones con el mismo formato.

---

## 4. Plan de Pruebas

- `tests/specs/lgr.spec.js`: Inicio vuelve a la portada; `?` abre la ayuda y `Esc` la cierra; el SVG exportado se vuelve a abrir y deja los mismos campos; la portada avisa que hay un LGR guardado; un estado guardado con la clave vieja se migra.
- `tests/specs/humo.spec.js` y `fuentes.spec.js` siguen pasando.

---

## 5. Criterios de Aceptación

- [x] El LGR comparte con las demás el botón Inicio, los avisos, la ayuda con `?`, el formato del autoguardado y el de exportación (SVG con datos y leyenda, PNG 3×).
- [x] La matemática (los módulos sin DOM de `src/lgr/`) no cambia: `tests/unidades/lgr.test.js` pasa igual.
