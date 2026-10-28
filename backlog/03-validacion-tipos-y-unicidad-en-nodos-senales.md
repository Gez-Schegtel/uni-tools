# Spec 03 — Validación de `n.tipo` y Unicidad de Entrada/Salida en `depurarNodos()` (`diagrama-señales`)

- **ID:** `SPEC-03`
- **Referencia en el informe:** `BUG-10` y Sección `5.4.D.3`
- **Prioridad:** Alta (3 / 27)
- **Esfuerzo estimado:** Bajo (~15 minutos)
- **Herramientas afectadas:** Diagramas de flujo de señales (`src/senales/modelo.js`, `diagrama-señales.html`)

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de flujo de señales,  
> **quiero** que al cargar un archivo `.json` o `.svg` todos los nodos tengan un `tipo` válido (`"entrada"`, `"normal"` o `"salida"`) y que exista como máximo un nodo de entrada y uno de salida,  
> **para** que ningún nodo sin tipo aparezca falsamente rotulado como `"SALIDA"` en la hoja ni haya ambigüedad al calcular la transferencia con la regla de Mason.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/senales/modelo.js:66-72`](../src/senales/modelo.js), la función `depurarNodos(lista)` copia cada objeto de `lista` y sanea `x`, `y` y `nombre`, pero **no valida ni asigna valor por defecto a `n.tipo`**:

```js
function depurarNodos(lista) {
  return (Array.isArray(lista) ? lista : []).filter(esObj).map(n => Object.assign({}, n, {
    x: num(n.x, 0),
    y: num(n.y, 0),
    nombre: texto(n.nombre, "")
  }));
}
```

Por su parte, en [`src/senales/dibujo.js:20-26`](../src/senales/dibujo.js), `renderNodo(n)` decide si dibuja el anillo `.n-io` y la leyenda inferior usando `if (n.tipo !== "normal")` y un operador ternario:

```js
if (n.tipo !== "normal") {
  el("circle", { r: 15, class: "n-io" }, g);
  const t = el("text", { x: 0, y: 27, class: "n-tag" }, g);
  t.textContent = n.tipo === "entrada" ? "ENTRADA" : "SALIDA";
}
```

### Consecuencias
1. Si un nodo cargado desde un JSON no tiene la propiedad `tipo` (`undefined`) o tiene un valor inválido (p. ej. `"interno"`), `n.tipo !== "normal"` da `true` y el ternario elige **`"SALIDA"`**. El usuario ve el nodo marcado como `"SALIDA"` en el lienzo, pero cuando abre la ventana de Mason (`analizar()` en [`src/senales/mason.js:232`](../src/senales/mason.js) busca `n.tipo === "salida"`), el sistema le dice `"Falta marcar el nodo de salida"`.
2. Si un JSON manual trae dos nodos con `tipo: "entrada"` o dos con `tipo: "salida"`, ambos quedan marcados como tales en el lienzo aunque `analizar()` sólo toma el primero con `.find()`, contradiciendo la regla de unicidad que sí impone el inspector en [`src/senales/panel.js:76-82`](../src/senales/panel.js).

---

## 3. Especificación de la Solución

En [`src/senales/modelo.js:66-72`](../src/senales/modelo.js), normalizar `n.tipo` dentro de `depurarNodos(lista)` devolviendo el arreglo mapeado (tal como espera `cargarDoc()` en la línea 83: `S.nodos = depurarNodos(d.nodos)`), garantizando que `tipo` sólo valga `"entrada"`, `"normal"` o `"salida"` y que a lo sumo el primer nodo con `"entrada"` y el primer nodo con `"salida"` conserven ese rol:

```js
function depurarNodos(lista) {
  let hayEntrada = false, haySalida = false;
  return (Array.isArray(lista) ? lista : []).filter(esObj).map(n => {
    let tipo = "normal";
    if (n.tipo === "entrada" && !hayEntrada) { tipo = "entrada"; hayEntrada = true; }
    else if (n.tipo === "salida" && !haySalida) { tipo = "salida"; haySalida = true; }
    return Object.assign({}, n, {
      x: num(n.x, 0),
      y: num(n.y, 0),
      nombre: texto(n.nombre, ""),
      tipo
    });
  });
}
```

### Garantías de No Regresión
- **Respeta el contrato de retorno de `depurarNodos(lista)` y `sanearIds()`:** Al devolver el nuevo arreglo de objetos sin filtrar por `idValido` antes de tiempo, `sanearIds(S.nodos, S.ramas, "n", ...)` en `cargarDoc()` ([`src/senales/modelo.js:85`](../src/senales/modelo.js)) sigue renumerando o asignando IDs faltantes exactamente igual que antes, por lo que no se rompe ningún caso de `tests/specs/archivos-danados.spec.js`.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/archivos-danados.spec.js`](../tests/specs/archivos-danados.spec.js) (o en [`tests/specs/senales.spec.js`](../tests/specs/senales.spec.js)):
1. Agregar un test `"diagrama-señales: normaliza tipos de nodo ausentes, inválidos o duplicados al abrir"`:
   - Cargar un JSON con 5 nodos: uno sin `tipo`, uno con `tipo: "cualquiera"`, dos con `tipo: "entrada"` y dos con `tipo: "salida"`.
   - Verificar que tras `abrirTexto()`:
     - Todos los nodos tengan `n.tipo` en `["entrada", "normal", "salida"]`.
     - Haya exactamente 1 nodo con `tipo === "entrada"` y 1 con `tipo === "salida"`.
     - La cantidad de etiquetas `.n-tag` en el SVG coincida exactamente con la suma de nodos de entrada y salida (2).

---

## 5. Criterios de Aceptación

- [ ] Un nodo sin `tipo` o con `tipo` desconocido queda con `n.tipo === "normal"` al cargarse y no muestra el cartel `"SALIDA"`.
- [ ] Si un archivo contiene múltiples nodos `"entrada"` o `"salida"`, sólo el primero de cada clase conserva ese rol y los demás pasan a `"normal"`.
- [ ] `node src/construir.js` actualiza `diagrama-señales.html` y el nuevo test pasa en Chromium y Firefox.
