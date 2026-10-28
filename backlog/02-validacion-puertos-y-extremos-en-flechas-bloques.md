# Spec 02 — Validación de Puertos y Extremos en `depurarFlechas()` (`diagrama-bloque`)

- **ID:** `SPEC-02`
- **Referencia en el informe:** `BUG-02` y Sección `5.4.B.1`
- **Prioridad:** Crítica (2 / 27)
- **Esfuerzo estimado:** Bajo (~15 minutos)
- **Herramientas afectadas:** Diagramas de bloques (`src/bloque/modelo.js`, `diagrama-bloque.html`)

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de bloques,  
> **quiero** que al abrir un archivo `.json` o `.svg` con flechas cuyos puertos (`from.port` o `to.port`) estén ausentes, tengan nombres inválidos o apunten a un recuadro decorativo (`"marco"`), dichas flechas defectuosas se descarten limpiamente sin romper la aplicación,  
> **para** que el resto del diagrama válido se pueda visualizar y seguir editando sin errores fatales.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/bloque/modelo.js:58-76`](../src/bloque/modelo.js), la función `depurarFlechas(es)` filtra las flechas cargadas desde un archivo comprobando únicamente que los IDs de origen y destino existan en `S.nodes`:

```js
function depurarFlechas(es) {
  const ids = new Set(S.nodes.map(n => n.id));
  const candidatas = es.filter(e => e && idValido(e.id) && e.from && e.to && ids.has(e.from.id) && ids.has(e.to.id));
```

A diferencia de [`src/simulador/modelo.js:74-86`](../src/simulador/modelo.js) (donde `depurarCables()` valida que los pines existan y que los nodos no sean `"marco"`), `depurarFlechas()`:
1. **No comprueba** que `e.from.port` y `e.to.port` pertenezcan a `["l", "r", "t", "b"]`.
2. **No comprueba** que los nodos `e.from.id` y `e.to.id` no sean recuadros (`type === "marco"`), los cuales no tienen puertos de conexión.

Cuando `render()` invoca `routeAll()` ([`src/bloque/ruteo.js:126`](../src/bloque/ruteo.js)):
```js
const da = dirOf(e.from.port), db = dirOf(e.to.port);
```
Si `port` es `undefined` o `"zzz"`, `dirOf()` devuelve `undefined`. Acto seguido, `candidates(a, da, b, db, ...)` ([`src/bloque/ruteo.js:27`](../src/bloque/ruteo.js)) ejecuta:
```js
const a1 = { x: a.x + da.x * STUB, y: a.y + da.y * STUB };
```
y lanza `TypeError: Cannot read properties of undefined (reading 'x')`, abortando `render()` por completo.

---

## 3. Especificación de la Solución

En [`src/bloque/modelo.js:58-62`](../src/bloque/modelo.js), definir los puertos válidos (`const PUERTOS_VALIDOS = ["l", "r", "t", "b"];`) y excluir como extremos a los nodos de tipo `"marco"`:

```js
function depurarFlechas(es) {
  const ids = new Set(S.nodes.filter(n => n.type !== "marco").map(n => n.id));
  const puertoOk = (p) => p === "l" || p === "r" || p === "t" || p === "b";
  const candidatas = es.filter(e => e && idValido(e.id)
    && e.from && e.to
    && ids.has(e.from.id) && ids.has(e.to.id)
    && puertoOk(e.from.port) && puertoOk(e.to.port));
```

*(Nota: Al impedir que las flechas salgan de un `"marco"`, recordar actualizar en [`tests/specs/archivos-danados.spec.js:72`](../tests/specs/archivos-danados.spec.js) el extremo `from: { id: "m", port: "r" }` para que use un bloque válido `id: "b"` en la prueba de XSS, como se detalla también en la Spec 23).*

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/archivos-danados.spec.js`](../tests/specs/archivos-danados.spec.js):
1. En el test `"diagrama-bloque: descarta flechas colgadas y conserva lo válido"` (líneas 38-48), agregar al documento de prueba:
   - Una flecha con puerto inexistente: `{ id: "e3", from: { id: "a", port: "zzz" }, to: { id: "b", port: "l" } }`.
   - Una flecha sin propiedad `port`: `{ id: "e4", from: { id: "a" }, to: { id: "b", port: "l" } }`.
   - Una flecha conectada a un `"marco"`: `{ id: "e5", from: { id: "m", port: "r" }, to: { id: "b", port: "l" } }`.
2. Verificar que no se produzca ningún `pageerror`, que `S.edges.map(e => e.id)` sea únicamente `["e1"]` y que el lienzo se siga dibujando normalmente.

---

## 5. Criterios de Aceptación

- [ ] `depurarFlechas()` descarta cualquier flecha cuyo `from.port` o `to.port` no sea `"l"`, `"r"`, `"t"` o `"b"`.
- [ ] `depurarFlechas()` descarta cualquier flecha cuyo origen o destino sea un nodo con `type === "marco"`.
- [ ] Abrir un JSON con puertos inválidos o ausentes no lanza `TypeError` en `routeAll()` ni deja el lienzo en blanco.
- [ ] `node src/construir.js` actualiza `diagrama-bloque.html` y las pruebas de `archivos-danados.spec.js` pasan.
