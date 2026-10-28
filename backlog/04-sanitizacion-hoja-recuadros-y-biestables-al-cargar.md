# Spec 04 — Sanitización de Hoja de Impresión, Recuadros (`marco`) y Biestables al Cargar

- **ID:** `SPEC-04`
- **Referencia en el informe:** `BUG-20` y Sección `5.4.A.5`
- **Prioridad:** Media / Alta (4 / 27)
- **Esfuerzo estimado:** Bajo (~25 minutos)
- **Herramientas afectadas:** Las tres (`src/comun/hoja.js`, `src/comun/recuadros.js`, `src/bloque/modelo.js`, `src/simulador/modelo.js`)

---

## 1. Historia de Usuario

> **Como** usuario de `uni-tools`,  
> **quiero** que al abrir un archivo `.json` o `.svg` se validen las dimensiones y el formato de la hoja de impresión, las propiedades de los recuadros (`marco`) y la configuración interna de los biestables (`ff:*`),  
> **para** que valores corruptos o incompletos no produzcan errores al dibujar en el lienzo ni al exportar a SVG/PNG.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

Existen tres huecos de validación al cargar documentos en `abrirTexto()`:

1. **Hoja de impresión inválida (`src/comun/hoja.js:17`):**
   ```js
   const hojaValida = (h) => esObj(h) && ["x", "y", "w", "h"].every(k => num(h[k], null) !== null) ? h : null;
   ```
   - Acepta dimensiones negativas o cero (`w <= 0` o `h <= 0`), lo que rompe el `<rect>` de la hoja en el SVG y produce un `canvas` de tamaño inválido al exportar a PNG.
   - No valida que `h.preset` exista en `HOJAS` (`"a4h"`, `"a4v"`, `"a3h"`, `"16:9"`, `"4:3"`, `"libre"`), dejando el selector `#h-preset` desincronizado con `hojaActiva()`.

2. **Recuadros (`marco`) sin normalizar al cargar (`src/bloque/modelo.js:52` y `src/simulador/modelo.js:64-67`):**
   - `completarMarco(n)` ([`src/comun/recuadros.js:8-14`](../src/comun/recuadros.js)) se llama al crear un recuadro con `makeNode("marco", ...)`, pero **no se llama dentro de `depurarNodos()`** al abrir un archivo.
   - Si un `"marco"` en un JSON no trae `trazo` o `relleno`, `guiones(n)` lo dibuja con línea continua en vez de `"dashed"`, `n.atras` no se normaliza a booleano y `n.w` / `n.h` pueden ser menores que el mínimo (`40×30`).

3. **Biestables (`type: "ff"`) con propiedades corruptas en el simulador (`src/simulador/modelo.js:58-70`):**
   - Si un nodo `type: "ff"` en un JSON trae `pins: [null, 99]` (un arreglo cuyos elementos no son objetos `{ n: string, clk?: boolean }`), [`src/simulador/dibujo.js:83,87`](../src/simulador/dibujo.js) intenta evaluar `n.pins[i].clk` y lanza `TypeError: Cannot read properties of null (reading 'clk')`.
   - Si no trae `n.salida` o `n.salidaNeg` (o trae valores no string), en [`src/simulador/dibujo.js:88-89`](../src/simulador/dibujo.js) se concatena `n.salida + suf` dando **`"undefinedA"`** sobre el dibujo del flip-flop.
   - `n.rot` no se restringe a `[0, 90, 180, 270]`.

---

## 3. Especificación de la Solución

### 3.1. En `src/comun/hoja.js` (línea 17)
Mantener el contrato de retorno de `hojaValida(h)` (devuelve el objeto `h` saneado o `null`, como esperan [`src/bloque/modelo.js:90`](../src/bloque/modelo.js), [`src/simulador/modelo.js:93`](../src/simulador/modelo.js) y [`src/senales/modelo.js:86`](../src/senales/modelo.js)), validando que `w >= 50` y `h >= 50` y que `preset` (si viene) sea una clave válida de `HOJAS` (o `"a4h"` por defecto):
```js
function hojaValida(h) {
  if (!esObj(h)) return null;
  const x = num(h.x, null), y = num(h.y, null), w = num(h.w, null), alto = num(h.h, null);
  if (x === null || y === null || w === null || alto === null || w < 50 || alto < 50) return null;
  const preset = Object.prototype.hasOwnProperty.call(HOJAS, h.preset) && h.preset !== "sin" ? h.preset : "libre";
  return { preset, x, y, w, h: alto };
}
```

### 3.2. En `src/comun/recuadros.js` (`completarMarco`) y `depurarNodos()` de `bloque` y `simulador`
Hacer que `completarMarco(n)` valide que `n.trazo` pertenezca a `TRAZOS` y `n.relleno` pertenezca a `RELLENOS`, e invocar `if (esMarco(c)) completarMarco(c);` dentro de `depurarNodos()` tanto en [`src/bloque/modelo.js:52`](../src/bloque/modelo.js) como en [`src/simulador/modelo.js:64`](../src/simulador/modelo.js).

### 3.3. En `src/simulador/modelo.js` (`depurarNodos`, líneas 58-70)
Para todo nodo `c` en `depurarNodos(lista)`:
- Normalizar `c.rot = [0, 90, 180, 270].includes(c.rot) ? c.rot : 0;`.
- Si `c.type === "ff"`:
  - Validar `c.conClk = c.conClk !== false;`.
  - Verificar que `Array.isArray(c.pins)` tenga elementos objeto `{ n: string, clk?: boolean }` válidos; de lo contrario, regenerarlos con `pinsDe(c.kind, c.conClk)`.
  - Asegurar `c.salida = texto(c.salida, "Q");` y `c.salidaNeg = texto(c.salidaNeg, "Q");`.
  - Invocar `tablaDe(c)` y sanitizar las celdas de `c.tabla`.

### 3.4. Garantías de No Regresión
- `hojaValida(h)` sigue devolviendo el objeto `h` cuando es válido y `null` cuando es inválido (y permite hojas sin `preset` asignándoles `"libre"`), por lo que no rompe ningún archivo `.json`existente ni los tests de `tests/specs/comun.spec.js:42-69`.
- `c.pins` en `type === "ff"` mantiene exactamente la estructura de objetos `[{ n: "J" }, { n: "CLK", clk: true }, { n: "K" }]` que esperan `dibujo.js`, `logica.js` y `panel.js`.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/archivos-danados.spec.js`](../tests/specs/archivos-danados.spec.js):
1. Agregar un test `"hoja con dimensiones negativas o cero se descarta al abrir"` verificando que `hojaActiva()` sea `false` tras cargar `{ nodes: [{ id: "a", type: "in", x: 100, y: 100 }], hoja: { preset: "a4h", x: 0, y: 0, w: -200, h: 0 } }`.
2. Agregar un test `"simulador: un biestable con pines o etiquetas corruptas se sanea al abrir"` cargando `{ nodes: [{ id: "f1", type: "ff", kind: "jk", x: 100, y: 100, pins: [null, 5], rot: 33 }] }` y comprobando que `getNode("f1").pins` tenga objetos `{ n }` válidos, `rot` sea `0` y el texto renderizado no contenga `"undefined"` ni lance `TypeError`.

---

## 5. Criterios de Aceptación

- [ ] `hojaValida()` rechaza hojas con `w < 50`, `h < 50` o `preset` inexistente en `HOJAS`.
- [ ] Los nodos `"marco"` cargados desde JSON pasan por `completarMarco(n)` en `diagrama-bloque` y `simulador-logico`.
- [ ] Los nodos `ff:*` cargados desde JSON tienen siempre `pins`, `salida`, `salidaNeg`, `tabla` y `rot` válidos.
- [ ] `node src/construir.js` regenera las tres páginas y los nuevos tests en `archivos-danados.spec.js` pasan.
