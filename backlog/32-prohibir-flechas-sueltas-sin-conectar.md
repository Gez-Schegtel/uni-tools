# Spec 32 — Prohibir Flechas Sueltas sin Conectar al Soltar en el Vacío (`diagrama-bloque`)

- **ID:** `SPEC-32`
- **Estado:** ✅ Completada
- **Referencia:** Nuevo requerimiento de reglas de conexión y UX del usuario
- **Prioridad:** Media-Alta (Bloque 2 / Dominio y UX en `diagrama-bloque`)
- **Esfuerzo estimado:** Bajo (~15 minutos)
- **Archivos afectados:**
  - `src/bloque/interaccion.js`
  - `src/bloque/pagina.html`
  - `diagrama-bloque.html` (generado con `node src/construir.js`)
  - `tests/specs/bloque.spec.js`

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de bloques (`diagrama-bloque`),  
> **quiero** que al sacar una flecha desde un elemento y soltarla en el fondo vacío de la hoja (o sobre un elemento no conectable como un texto o recuadro) el programa no cree ninguna conexión suelta y me avise mediante un mensaje emergente (`#toast`) por qué no se creó,  
> **para** evitar que queden flechas o puntos colgados sin destino en el diagrama y mantener la consistencia con el resto de las reglas de validación.

---

## 2. Control de Colisiones con el Backlog Existente

Se revisaron las 31 especificaciones del backlog y la suite de pruebas para asegurar que no haya contradicciones:

1. **Relación con [`SPEC-17`](./17-reglas-completas-de-conexion-en-diagrama-de-bloques.md) (*Reglas algebraicas de conexión en `diagrama-bloque`*):**
   - `SPEC-17` valida entradas únicas en bloques/bifurcaciones/rótulos y lados vacíos de sumadores, pero no abordaba el caso de soltar una flecha en el vacío (`!targetId`).
   - Esta `SPEC-32` complementa a `SPEC-17` eliminando la creación automática de bifurcaciones en el vacío (`src/bloque/interaccion.js:393-397`). Se añade una nota de coordinación en `SPEC-17`.
2. **Relación con [`SPEC-26`](./26-actualizacion-documentacion-tests-atajos-y-workflows.md) (*Actualización de modales de ayuda `#ov-help`*):**
   - En `src/bloque/pagina.html:163`, la tabla de ayuda decía: *"Crea una flecha hacia otro elemento; si la soltás sobre la hoja libre, ahí queda una bifurcación"*.
   - Se actualiza esa fila de `#ov-help` para reflejar la nueva regla (las bifurcaciones sólo se insertan sobre una flecha existente con la herramienta `Bifurcación (N)`).
3. **Relación con el test existente en [`tests/specs/bloque.spec.js:219-224`](../tests/specs/bloque.spec.js):**
   - El test `"tirar una segunda flecha hacia un bloque ocupado no la crea y avisa"` tenía al final (líneas 219-224) una aserción del comportamiento viejo (`// y soltar en el vacío sigue dejando una bifurcación con su flecha`).
   - Dicha aserción se actualiza para verificar el nuevo comportamiento: que soltar en el vacío **no** crea ni la flecha ni el nodo `node` y muestra el aviso en `#toast`.

---

## 3. Descripción Técnica del Problema Actual

En [`src/bloque/interaccion.js:390-406`](../src/bloque/interaccion.js), cuando el usuario arrastra una conexión (`drag.kind === "connect"`) y suelta el botón del mouse (`pointerup`):

```js
  if (drag.kind === "connect") {
    const dst = destinoBajoPuntero(ev, drag, w);
    let targetId = dst && dst.id, targetPort = dst && dst.port;
    if (!targetId) {
      // soltar en el vacío = crear bifurcación ahí y conectar
      const nn = makeNode("node", snapV(w.x), snapV(w.y));
      S.nodes.push(nn); targetId = nn.id; targetPort = "l";
    }
    if (targetId !== drag.fromId) {
      if (admiteEntrada(targetId)) {
        S.edges.push({ id: uid("e"), from: { id: drag.fromId, port: drag.fromPort },
          to: { id: targetId, port: targetPort }, variant: 0 });
        commit();
      } else {
        toast("Un bloque admite una sola entrada: para juntar dos señales usá un sumador");
      }
    }
  }
```

Además, en [`src/bloque/interaccion.js:226, 262`](../src/bloque/interaccion.js), `destinoBajoPuntero()` y el modo `connect` sólo excluyen `esMarco(getNode(nid))`, sin excluir a las etiquetas de texto libre (`n.type === "text"`), que tampoco tienen puertos (`src/bloque/dibujo.js:76`).

Esto provoca que:
1. Soltar una flecha en cualquier lugar vacío del lienzo cree un punto `node` y una flecha sin punta terminada en la nada, dejando una conexión suelta en el diagrama.
2. Soltar una flecha sobre un elemento `"text"` la conecte a un texto decorativo sin puertos.

---

## 4. Especificación de la Solución

### 4.1. Excluir elementos no conectables (`marco` y `text`) en [`src/bloque/interaccion.js`](../src/bloque/interaccion.js)
Definir un helper claro para saber si un nodo admite conexiones:
```js
const esConectable = (n) => !!n && !esMarco(n) && n.type !== "text";
```
Y usarlo tanto al iniciar un arrastre en modo `connect` (línea 226) como en `destinoBajoPuntero(ev, drag, w)` (línea 262):
```js
function destinoBajoPuntero(ev, drag, w) {
  const t = document.elementFromPoint(ev.clientX, ev.clientY);
  if (t && t.classList && t.classList.contains("port"))
    return { id: t.getAttribute("data-pid"), port: t.getAttribute("data-port") };
  const nid = t ? hitNode(t) : null;
  if (nid && esConectable(getNode(nid)))
    return { id: nid, port: nearestPort(getNode(nid), w, getNode(drag.fromId)) };
  return null;
}
```

### 4.2. Rechazar flechas sueltas al soltar en el vacío y avisar con `toast()` ([`src/bloque/interaccion.js:390-406`](../src/bloque/interaccion.js))
Reemplazar la creación de la bifurcación en el vacío por el rechazo con aviso:

```js
  if (drag.kind === "connect") {
    const dst = destinoBajoPuntero(ev, drag, w);
    const targetId = dst && dst.id, targetPort = dst && dst.port;
    if (!targetId) {
      toast("La flecha debe conectarse a un elemento: no puede quedar suelta");
    } else if (targetId !== drag.fromId) {
      if (admiteEntrada(targetId)) {
        S.edges.push({ id: uid("e"), from: { id: drag.fromId, port: drag.fromPort },
          to: { id: targetId, port: targetPort }, variant: 0 });
        commit();
      } else {
        toast("Un bloque admite una sola entrada: para juntar dos señales usá un sumador");
      }
    }
  }
```
*(Nota: Si el usuario simplemente hace clic sobre un puerto o suelta sobre el mismo elemento de origen, `targetId === drag.fromId`, por lo que se cancela en silencio sin ensuciar el diagrama ni mostrar un aviso innecesario; si en cambio estira la flecha hacia el vacío donde `!targetId`, no se crea nada y aparece el `toast` explicando la regla).*

### 4.3. Actualizar el texto de ayuda en [`src/bloque/pagina.html:163`](../src/bloque/pagina.html)
Cambiar:
```html
<tr><td>Arrastrar desde un punto azul</td><td>Crea una flecha hacia otro elemento; si la soltás sobre la hoja libre, ahí queda una bifurcación</td></tr>
```
por:
```html
<tr><td>Arrastrar desde un punto azul</td><td>Crea una flecha hacia otro elemento (no se permiten flechas sueltas sin destino)</td></tr>
```

---

## 5. Plan de Pruebas

1. En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):
   - Actualizar el bloque final del test `"tirar una segunda flecha hacia un bloque ocupado no la crea y avisa"` (líneas 219-225) o agregar un test dedicado `"soltar una flecha en el vacío no deja una conexión suelta y avisa el motivo"` que:
     1. Arrastre una conexión desde un puerto hacia una zona libre del lienzo y suelte el botón del mouse.
     2. Verifique que `S.edges.length` y `S.nodes.length` no aumenten (no se crea flecha ni bifurcación suelta).
     3. Verifique que `#toast` muestre `"La flecha debe conectarse a un elemento: no puede quedar suelta"`.
2. Regenerar `diagrama-bloque.html` con `node src/construir.js` y ejecutar las pruebas en Chromium y Firefox.

---

## 6. Criterios de Aceptación

- [x] Arrastrar una flecha y soltarla en el fondo vacío no crea ninguna flecha ni nodo de bifurcación.
- [x] Al soltar una flecha sin conectar en el vacío, `#toast` informa `"La flecha debe conectarse a un elemento: no puede quedar suelta"`.
- [x] Las etiquetas de texto (`type === "text"`) y los recuadros (`type === "marco"`) tampoco aceptan flechas.
- [x] `node src/construir.js` actualiza `diagrama-bloque.html` y todas las pruebas pasan en Chromium y Firefox.
