# Spec 01 — Rechazo de Documentos Cruzados entre Herramientas y Preservación del Estado

- **ID:** `SPEC-01`
- **Referencia en el informe:** `BUG-01` y Sección `5.2.1` (Falso positivo en `archivos-danados.spec.js`)
- **Prioridad:** Crítica (1 / 27)
- **Esfuerzo estimado:** Bajo (~15 minutos)
- **Herramientas afectadas:** Las tres (`src/comun/documento.js`, `diagrama-bloque.html`, `simulador-logico.html`, `diagrama-señales.html`)

---

## 1. Historia de Usuario

> **Como** usuario que trabaja en cualquiera de las tres herramientas de `uni-tools`,  
> **quiero** que si por error intento abrir un archivo `.json` o `.svg` perteneciente a otra herramienta del paquete, la aplicación lo rechace mostrando el aviso correspondiente y conserve intacto el diagrama que tengo en pantalla,  
> **para** no perder mi trabajo actual ni que se sobrescriba mi autoguardado con un lienzo vacío.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/comun/documento.js:43-49`](../src/comun/documento.js), la función `abrirTexto(txt, nombre)` valida si el objeto JSON `d` corresponde a la herramienta actual únicamente comprobando:

```js
const d = leerTexto(txt);
if (!d || !Array.isArray(d[HERRAMIENTA.nodos])) return toast(HERRAMIENTA.textos.noEsDoc);
cargarDoc(d, nombre ? limpiarNombre(nombre) : d.nombre);
commit(); fit();
toast(HERRAMIENTA.textos.cargado);
```

Tanto **Diagramas de bloques** ([`src/bloque/herramienta.js:8`](../src/bloque/herramienta.js)) como **Simulador de circuitos lógicos** ([`src/simulador/herramienta.js:8`](../src/simulador/herramienta.js)) definen `HERRAMIENTA.nodos = "nodes"`. Ninguno comprueba la clave de las conexiones (`"edges"` vs `"wires"`) al abrir un documento en `abrirTexto()`.

### Qué ocurre hoy paso a paso
1. El usuario tiene un diagrama en `diagrama-bloque.html` y abre por error un archivo de `simulador-logico.html` (que contiene `nodes: [{ type: "in", ... }, { type: "and", ... }]` y `wires: [...]`).
2. `Array.isArray(d.nodes)` da `true`.
3. `cargarDoc(d)` invoca `S.nodes = depurarNodos(d.nodes)` ([`src/bloque/modelo.js:89`](../src/bloque/modelo.js)), que filtra todos los nodos porque sus `type` (`"in"`, `"and"`, `"out"`) no son válidos en bloques (`["block", "sum", "node", "io", "marco"]`).
4. `S.nodes` y `S.edges` quedan vacíos (`[]`), se invoca `commit()` (pisando el `localStorage` del autoguardado) y aparece el aviso `"Diagrama cargado"`.
5. Lo mismo ocurre a la inversa al abrir un archivo de `diagrama-bloque` en `simulador-logico`.
6. Además, en [`tests/specs/archivos-danados.spec.js:22-35`](../tests/specs/archivos-danados.spec.js), el test pasa en verde ante ese caso porque sólo verifica `expect(errores).toEqual([])` y `Array.isArray(S[k])`, sin comprobar que el diagrama original no haya sido destruido.

---

## 3. Especificación de la Solución

### 3.1. En `src/bloque/modelo.js:31`, `src/simulador/modelo.js:45`, `src/senales/modelo.js:50` y `src/comun/documento.js:43-49`
1. En `docDatos()` de las tres herramientas ([`src/bloque/modelo.js:31`](../src/bloque/modelo.js), [`src/simulador/modelo.js:45`](../src/simulador/modelo.js) y [`src/senales/modelo.js:50`](../src/senales/modelo.js)), incluir `herramienta: HERRAMIENTA.clave` junto a `version: VERSION_DOC` (y `"bloque"` en [`src/senales/equivalente.js:184`](../src/senales/equivalente.js)).
2. En `abrirTexto(txt, nombre)` ([`src/comun/documento.js:43-49`](../src/comun/documento.js)), rechazar el documento **antes** de tocar `S` si:
   - `d.herramienta` está presente y es distinto de `HERRAMIENTA.clave`, **o**
   - Para archivos anteriores sin `d.herramienta`: si trae la colección de conexiones de otra herramienta (`(HERRAMIENTA.conexiones === "edges" && Array.isArray(d.wires) && !Array.isArray(d.edges)) || (HERRAMIENTA.conexiones === "wires" && Array.isArray(d.edges) && !Array.isArray(d.wires))`), **o**
   - Si el archivo tenía elementos en `d[HERRAMIENTA.nodos]` (`d[HERRAMIENTA.nodos].length > 0`) pero tras `cargarDoc(d)` todos los nodos fueron descartados por inválidos (`S[HERRAMIENTA.nodos].length === 0`), restaurar el estado previo sin hacer `commit()` y mostrar `toast(HERRAMIENTA.textos.noEsDoc)`:
   ```js
   function abrirTexto(txt, nombre) {
     const d = leerTexto(txt);
     const ajeno = d && ((d.herramienta && d.herramienta !== HERRAMIENTA.clave)
       || (HERRAMIENTA.conexiones === "edges" && Array.isArray(d.wires) && !Array.isArray(d.edges))
       || (HERRAMIENTA.conexiones === "wires" && Array.isArray(d.edges) && !Array.isArray(d.wires)));
     if (!d || ajeno || !Array.isArray(d[HERRAMIENTA.nodos])) return toast(HERRAMIENTA.textos.noEsDoc);
     const previo = snapshot();
     cargarDoc(d, nombre ? limpiarNombre(nombre) : d.nombre);
     if (d[HERRAMIENTA.nodos].length > 0 && S[HERRAMIENTA.nodos].length === 0) {
       restore(previo);
       render();
       return toast(HERRAMIENTA.textos.noEsDoc);
     }
     commit(); fit();
     toast(HERRAMIENTA.textos.cargado);
   }
   ```

### 3.2. Garantías de No Regresión
- **Compatibilidad total con archivos viejos válidos:** Los `.json` y `.svg` guardados antes de este cambio no tienen `d.herramienta`, por lo que `d.herramienta && d.herramienta !== HERRAMIENTA.clave` da `false` y se abren sin ningún problema.
- **Compatibilidad con lienzos vacíos intencionales (`nodes: []`):** Como la condición comprueba `d[HERRAMIENTA.nodos].length > 0 && S[HERRAMIENTA.nodos].length === 0`, un archivo válido guardado con el lienzo vacío (`nodes: []`) se sigue pudiendo abrir normalmente.
- **No afecta a `intentarCargarAutoguardado()`:** La restauración en el arranque ([`src/comun/documento.js:24-31`](../src/comun/documento.js)) llama directamente a `cargarDoc(d)` (no a `abrirTexto()`), por lo que el test [`tests/specs/inicio.spec.js:74-86`](../tests/specs/inicio.spec.js) (`"un autoguardado corrupto no rompe el arranque"`) sigue funcionando exactamente igual.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

1. **En [`tests/specs/archivos-danados.spec.js`](../tests/specs/archivos-danados.spec.js):**
   - En el bucle `for (const txt of MALOS)` (líneas 24-34), capturar la cantidad de nodos antes de llamar a `abrirTexto(page, txt)` (`const nAntes = await page.evaluate((k) => S[k].length, clave);`) y exigir que tras intentar abrir cualquiera de los textos de `MALOS` (que son todos inválidos o de otra herramienta), el diagrama inicial **no se haya vaciado**:
     ```js
     expect(await page.evaluate((k) => S[k].length, clave)).toBe(nAntes);
     ```
   - Agregar un test explícito `"abrir un JSON o SVG exportado de otra herramienta avisa que no sirve y no toca el diagrama actual"` que exporte con `docDatos()` y `buildExportSVG()` desde cada herramienta e intente abrirlo en las otras dos, comprobando que `#toast` muestre `HERRAMIENTA.textos.noEsDoc` y que `S[clave]` y `undoStack.length` no cambien.

---

## 5. Criterios de Aceptación

- [ ] `docDatos()` incluye `herramienta: HERRAMIENTA.clave` (`"bloque"`, `"simulador"` o `"senales"`).
- [ ] Abrir un JSON o SVG de `simulador-logico` en `diagrama-bloque` (y viceversa) muestra `HERRAMIENTA.textos.noEsDoc` y no altera `S.nodes`, `S.edges`/`S.wires`, `undoStack` ni `localStorage`.
- [ ] Abrir un JSON con `nodes: [{ id: "a", type: "inventado", x: 1, y: 1 }]` donde ningún nodo es válido no borra el diagrama existente en pantalla.
- [ ] `node src/construir.js` regenera las tres páginas sin diferencias pendientes.
- [ ] Todos los tests de `tests/specs/archivos-danados.spec.js` y `tests/specs/comun.spec.js` pasan en Chromium y Firefox.
