# Spec 30 — Trayectoria Ortogonal Dinámica en la Línea de Vista Previa al Conectar (`.ghostline`)

- **ID:** `SPEC-30`
- **Estado:** ⏳ Pendiente
- **Origen:** Pedido directo del usuario (Punto 4)
- **Prioridad:** Media / UX (Integrada al Bloque 2)
- **Esfuerzo estimado:** Bajo (~25 minutos)
- **Herramientas afectadas:** Diagramas de bloques (`src/bloque/dibujo.js`) y Simulador lógico (`src/simulador/dibujo.js`)

---

## 1. Historia de Usuario

> **Como** usuario que tira una flecha o cable desde un elemento hacia otro en el lienzo,  
> **quiero** que la línea punteada de vista previa (`.ghostline`) salga respetando la dirección del puerto de origen y se doble ortogonalmente acompañando el movimiento del mouse,  
> **para** ver una trayectoria natural y coherente antes de soltar el botón del mouse.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

Tanto en [`src/bloque/dibujo.js:157-160`](../src/bloque/dibujo.js) como en [`src/simulador/dibujo.js:193-194`](../src/simulador/dibujo.js), la línea de vista previa durante `drag.kind === "connect"` está codificada como una L rígida que siempre sale en horizontal y luego baja/sube en vertical:

```js
// En src/bloque/dibujo.js:157-160:
if (drag && drag.kind === "connect" && drag.cur) {
  const a = drag.start;
  el("path", { class: "ghostline" + (drag.invalido ? " invalido" : ""),
    d: `M ${a.x} ${a.y} L ${drag.cur.x} ${a.y} L ${drag.cur.x} ${drag.cur.y}` }, gOv);
}
```

### Por qué esa trayectoria es incorrecta
1. **Ignora la dirección del puerto de salida (`t`, `b`, `l`, `r`):** Si el usuario saca una flecha desde el puerto superior (`t`) o inferior (`b`) de un sumador o bloque, la línea sale horizontalmente cortando el propio elemento en lugar de salir verticalmente hacia arriba o hacia abajo.
2. **Atraviesa el propio bloque cuando el mouse va hacia atrás:** Si el usuario saca una flecha desde el puerto derecho (`r`) y mueve el mouse hacia la izquierda para hacer una realimentación, la línea va directo hacia la izquierda atravesando el bloque de origen en lugar de salir hacia la derecha (`STUB`) y doblar.
3. **No hace el quiebre en Z al conectar dos elementos a distinta altura:** En lugar de doblarse en el punto medio entre el origen y el cursor (como hacen las flechas reales), estira un único tramo horizontal hasta la `x` del cursor y cae en picada.

---

## 3. Especificación de la Solución

Crear una función auxiliar `ptsPreviaConexion(A, dA, B)` (o compartirla en `src/comun/ortogonal.js`) que calcule los puntos ortogonales de la vista previa respetando la dirección de salida `dA` (`{ x, y }`) y doblándose limpiamente hacia la posición actual del puntero `B = drag.cur` (usando `pathD(pts, 6)` para que tenga las mismas esquinas suaves que las flechas/cables definitivos):

```js
function ptsPrevia(A, dA, B) {
  const stub = 20;
  const h = dA.x !== 0;
  const avanza = h ? (B.x - A.x) * dA.x >= stub : (B.y - A.y) * dA.y >= stub;
  if (avanza) {
    if (h) {
      const mx = Math.round((A.x + B.x) / 2);
      return cleanPts([A, { x: mx, y: A.y }, { x: mx, y: B.y }, B]);
    }
    const my = Math.round((A.y + B.y) / 2);
    return cleanPts([A, { x: A.x, y: my }, { x: B.x, y: my }, B]);
  }
  const a1 = { x: A.x + dA.x * stub, y: A.y + dA.y * stub };
  return h
    ? cleanPts([A, a1, { x: a1.x, y: B.y }, B])
    : cleanPts([A, a1, { x: B.x, y: a1.y }, B]);
}
```
- En [`src/bloque/dibujo.js:157-160`](../src/bloque/dibujo.js): usar `d: pathD(ptsPrevia(drag.start, dirOf(drag.fromPort), drag.cur), 6)`.
- En [`src/simulador/dibujo.js:193-194`](../src/simulador/dibujo.js): usar `d: pathD(ptsPrevia(drag.start, pinDir(getNode(drag.fromId), drag.fromPin), drag.cur), 5)`.

---

## 4. Plan de Pruebas (Tests a agregar)

En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):
- Agregar un test `"al arrastrar una conexión nueva, la línea de vista previa sale en la dirección del puerto y se dobla siguiendo al mouse"`:
  - Iniciar el arrastre desde el puerto `"r"` de un bloque hacia un punto desplazado en `x` e `y` (y también hacia atrás en `-x`), y desde el puerto `"b"` de un sumador.
  - Verificar que `.ghostline` tenga los quiebres ortogonales intermedios (`ptsPrevia`) y su primer segmento salga en la dirección del puerto (`+x` para `"r"`, `+y` para `"b"`).

---

## 5. Criterios de Aceptación

- [ ] Al arrastrar desde un puerto horizontal (`l`, `r`) o vertical (`t`, `b`), `.ghostline` sale siempre en el sentido del puerto y se dobla en Z o en U acompañando al mouse sin atravesar hacia atrás el punto de salida.
- [ ] Funciona tanto en `diagrama-bloque` como en `simulador-logico`.
- [ ] `node src/construir.js` actualiza las páginas y los tests pasan en Chromium y Firefox.
