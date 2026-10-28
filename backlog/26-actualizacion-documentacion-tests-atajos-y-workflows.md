# Spec 26 — Actualización de Documentación (`tests/README.md`, `CLAUDE.md`, Atajos de Ayuda y Workflows)

- **ID:** `SPEC-26`
- **Referencia en el informe:** Sección `6.1`
- **Prioridad:** Baja (26 / 27)
- **Esfuerzo estimado:** Bajo (~30 minutos)
- **Archivos afectados:** `CLAUDE.md`, `README.md`, `tests/README.md`, `.claude/skills/uni-tools/SKILL.md`, `.github/workflows/tests.yml`, `src/bloque/pagina.html`, `src/simulador/pagina.html`, `src/senales/pagina.html`

---

## 1. Historia de Usuario

> **Como** usuario o colaborador de `uni-tools`,  
> **quiero** que las ventanas de ayuda (`?`) dentro de las tres herramientas listen todos los atajos de teclado que realmente existen en el código, que `tests/README.md` describa los archivos de prueba reales y las pruebas unitarias, que no haya enlaces rotos a `CLAUDE.md` y que el workflow de CI apunte a las ramas correctas,  
> **para** que la documentación interna y externa sea 100 % fiel al comportamiento real del proyecto.

---

## 2. Detalle de las Correcciones Documentales

### 2.1. Restaurar `CLAUDE.md` (o actualizar enlaces en `README.md` y `SKILL.md`)
- En el árbol de trabajo actual, `CLAUDE.md` figura borrado (`git status` → `D CLAUDE.md`), pero [`README.md:61, 79`](../README.md) y [`.claude/skills/uni-tools/SKILL.md:16, 312`](../.claude/skills/uni-tools/SKILL.md) lo siguen enlazando.
- Restaurar `CLAUDE.md` con `git checkout -- CLAUDE.md` y corregir su línea 50 (referencia a la rama `features`).

### 2.2. Actualizar [`tests/README.md`](../tests/README.md)
- Reemplazar el árbol de archivos obsoleto (líneas 17-29, que menciona `ayuda.js`, `portal.spec.js`, `diagrama-bloque.spec.js`, `simulador-logico.spec.js`, `diagrama-senales.spec.js`, ninguno de los cuales existe) por la estructura real:
  - Carpeta `unidades/`: `cargar.js`, `ecuaciones.test.js`, `logica.test.js`, `mason.test.js` y cómo correrlas con `npm --prefix tests run test:unidades` (o `node --test "tests/unidades/*.test.js"`).
  - Carpeta `specs/`: los 13 archivos reales (`ayudas.js`, `archivos-danados.spec.js`, `bloque.spec.js`, `comun.spec.js`, `correccion.spec.js`, `cortar.spec.js`, `fuentes.spec.js`, `humo.spec.js`, `inicio.spec.js`, `lienzo.spec.js`, `senales.spec.js`, `simulador.spec.js`, `ventanas.spec.js`).

### 2.3. Completar atajos faltantes en las ventanas de ayuda (`?`) de las 3 herramientas
1. **En [`src/simulador/pagina.html:149-165`](../src/simulador/pagina.html):**
   - Agregar `<kbd>B</kbd>` (Buffer, implementado en [`src/simulador/barra.js:48`](../src/simulador/barra.js)).
   - Agregar `<kbd>M</kbd>` (Recuadro, implementado en [`src/simulador/barra.js:50`](../src/simulador/barra.js)).
   - Agregar `<kbd>Ctrl+A</kbd>` (Seleccionar todo, implementado en [`src/comun/teclado.js:23`](../src/comun/teclado.js)).
   - En la fila de borrar, indicar `<kbd>Supr</kbd> / <kbd>Retroceso</kbd>`.
2. **En [`src/senales/pagina.html:135-146`](../src/senales/pagina.html):**
   - Agregar `<kbd>X</kbd>` (Modo selección múltiple, implementado en [`src/senales/barra.js:35`](../src/senales/barra.js)).
   - Agregar `<kbd>F</kbd>` (Encuadrar todo, implementado en [`src/senales/barra.js:37`](../src/senales/barra.js)).
   - Agregar `<kbd>Ctrl+A</kbd>` (Seleccionar todo, implementado en [`src/comun/teclado.js:23`](../src/comun/teclado.js)).
   - En la fila de borrar, indicar `<kbd>Supr</kbd> / <kbd>Retroceso</kbd>`.
3. **En [`src/bloque/pagina.html:125`](../src/bloque/pagina.html):**
   - En la fila de borrar, indicar `<kbd>Supr</kbd> / <kbd>Retroceso</kbd>`.

### 2.4. Actualizar [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) y [`.claude/skills/uni-tools/SKILL.md`](../.claude/skills/uni-tools/SKILL.md)
- En `.github/workflows/tests.yml`:
  - Línea 1: actualizar el comentario `# Corre las pruebas unitarias (Node) y E2E (Playwright en Chromium y Firefox)`.
  - Líneas 8 y 10: cambiar `branches: [main, features]` por `branches: [main, 'features/**']`.
- En `.claude/skills/uni-tools/SKILL.md`:
  - Línea 293: aclarar en la tabla comparativa que `simulador-logico.html` sí tiene selección múltiple por banda, `Shift+clic` y `Ctrl+A` (sólo carece del botón de modo en la barra).

---

## 3. Plan de Pruebas

- Regenerar las páginas con `node src/construir.js`.
- Ejecutar `tests/specs/fuentes.spec.js` y `tests/specs/comun.spec.js` (que prueba la apertura y cierre de `#ov-help`).

---

## 4. Criterios de Aceptación

- [ ] `CLAUDE.md` está presente y sin referencias a ramas inexistentes.
- [ ] `tests/README.md` refleja exactamente los archivos de `tests/unidades/` y `tests/specs/`.
- [ ] Todos los atajos implementados en `teclado.js` y `barra.js` figuran en las ventanas `#ov-help` de las tres herramientas.
- [ ] `node src/construir.js --comprobar` da `"al día"` y pasan las pruebas.
