# Spec 19 — Mejoras Topológicas en `equivalenteEnBloques()` (`diagrama-señales`)

- **ID:** `SPEC-19`
- **Referencia en el informe:** `BUG-13`
- **Prioridad:** Media (19)
- **Esfuerzo estimado:** Medio (~35 minutos)
- **Herramientas afectadas:** Diagramas de flujo de señales (`src/senales/equivalente.js`, `diagrama-señales.html`)

---

## 1. Historia de Usuario

> **Como** estudiante que convierte un Diagrama de flujo de señales a su Equivalente en bloques,  
> **quiero** que si desde el nodo de salida parten ramas de realimentación hacia otros nodos (`sal.length > 0`), dichas ramas salgan de un punto de bifurcación (`bif()`) previo al rótulo de salida `io` (tal como ya ocurre cuando la salida tiene un autolazo),  
> **para** que el rótulo de salida `io` sea siempre un elemento terminal receptor de la señal de salida y nunca un nodo intermedio atravesado por lazos de realimentación.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

En [`src/senales/equivalente.js:90-121`](../src/senales/equivalente.js) (en el commit `22051e0`), al armar la cadena interna de elementos para cada nodo `n` del grafo de señales:

```js
    if (n.tipo === "entrada") {
      cadena = [io()];
    } else if (n.tipo === "salida" && !autolazo) {
      cadena = [...sumadores, io()];
    } else {
      const necesitaBif = sal.length >= 2 || (n.tipo === "salida" && autolazo) || sumadores.length === 0;
      cadena = [...sumadores, ...(necesitaBif ? [bif()] : [])];
    }
```

Y luego, en las líneas 110-121:
```js
    if (n.tipo === "salida" && cadena[cadena.length - 1].type !== "io") {
      const fin = io();
      ...
      conectar(cadena[cadena.length - 1], "r", fin, "l", "");
    }
```

### Qué ocurre cuando de la salida parte una rama hacia otro nodo (`sal.length > 0` pero `!autolazo`)
- Si el nodo de salida tiene una rama de realimentación que vuelve hacia un nodo anterior (por ejemplo, la rama `3 → 2` con ganancia `0.3` en [`tests/specs/senales.spec.js:116`](../tests/specs/senales.spec.js)), `autolazo` es `false` (porque no es `3 → 3`), pero `sal.length` es `1`.
- Como `!autolazo` da `true`, entra en `else if (n.tipo === "salida" && !autolazo)` y arma `cadena = [...sumadores, io()]`.
- En la línea 108, `saleDe.set(n.id, cadena[cadena.length - 1])` asigna como origen de las ramas salientes al propio rótulo **`io()`**.
- Así, el sumador entra al rótulo `io()` por la izquierda y la rama de realimentación `3 → 2` **sale desde el rótulo `io()`**, en lugar de tomar la señal en una bifurcación `bif()` entre el sumador y el rótulo `io()` (como sí hace el código de las líneas 110-121 cuando hay un autolazo).

---

## 3. Especificación de la Solución

En [`src/senales/equivalente.js:88-116`](../src/senales/equivalente.js), cuando `n.tipo === "salida"` y de la salida parten ramas (`sal.length > 0`), el rótulo `io()` debe ser el elemento terminal de la cadena (recibiendo la señal por la izquierda), pero las ramas salientes de `n` deben partir de un punto de bifurcación (`node`) situado inmediatamente **antes** del rótulo `io()`:

```js
    let origenSal = null;
    if (n.tipo === "entrada" || !ent.length) {     // la entrada, o un nodo sin nada que le entre
      cadena = [io()];
    } else if (n.tipo === "salida" && ent.length === 1 && sal.length === 0) {
      cadena = [io()];                             // la salida con una sola rama y sin salidas: el rótulo y listo
    } else if (n.tipo === "salida" && ent.length === 1 && sal.length > 0) {
      const b = agregar(Object.assign(base(), { type: "node", w: 10, h: 10 }));
      const fin = io();
      unir(b, "r", fin, "l");
      cadena = [b, fin];
      origenSal = b;
    } else if (ent.length >= 2 || n.tipo === "salida") {
      const resto = ent.slice();
      cadena = [];
      while (resto.length) {
        const s = sumador(resto.splice(0, cadena.length ? 2 : 3), cadena.length > 0);
        if (cadena.length) unir(cadena[cadena.length - 1], "r", s, "l");
        cadena.push(s);
      }
      if (n.tipo === "salida") {
        if (sal.length > 0) {
          const b = agregar(Object.assign(base(), { type: "node", w: 10, h: 10 }));
          unir(cadena[cadena.length - 1], "r", b, "l");
          cadena.push(b);
          origenSal = b;
        }
        const fin = io();
        unir(cadena[cadena.length - 1], "r", fin, "l");
        cadena.push(fin);
      } else if (sal.length >= 2) {
        cadena.push(agregar(Object.assign(base(), { type: "node", w: 10, h: 10 })));
        unir(cadena[cadena.length - 2], "r", cadena[cadena.length - 1], "l");
      }
    } else {                                       // una sola entrada: un punto sobre la línea
      cadena = [agregar(Object.assign(base(), { type: "node", w: 10, h: 10 }))];
    }
    cadenaDe.set(n.id, cadena);
    entraEn.set(n.id, cadena[0]); saleDe.set(n.id, origenSal || cadena[cadena.length - 1]);
```

### 3.1. Garantías de No Regresión
- **100 % compatible con `tests/specs/senales.spec.js` y `tests/specs/correccion.spec.js`:**
  - En el ejemplo por defecto (`loadExample()`), el nodo de salida `x5` tiene `sal.length === 0`, por lo que sigue entrando en `cadena = [...sumadores, io()]` y el test `"en el ejemplo hay 4 bloques (uno por rama con ganancia ≠ 1), 2 sumadores y 3 bifurcaciones"` ([`tests/specs/senales.spec.js:103-112`](../tests/specs/senales.spec.js)) sigue dando exactamente `4` bloques, `2` sumadores y `3` bifurcaciones.
  - En el test `"cuando a la salida le llegan varias ramas, va un sumador antes del rótulo"` ([`tests/specs/senales.spec.js:114-120`](../tests/specs/senales.spec.js)), la cadena sigue teniendo el sumador antes del rótulo `io("y")` (`sum.x < sal.x`), y además ahora el rótulo `io("y")` queda limpio al final con `0` flechas salientes.
  - Para los nodos `"normal"` con 1 entrada y 1 salida (`sumadores.length === 0`), se conserva `sumadores.length === 0` en `necesitaBif` para que `cadena` nunca quede vacía y `entraA`/`saleDe` tengan siempre un nodo válido donde conectar los bloques en serie.

---

### 3.2. Lo que se hizo (2026-11-03)

El fragmento de arriba es de una versión anterior de `equivalente.js`; se aplicó la idea sobre la estructura actual (`cadena` y `sumador()`):
- La salida con ramas que parten de ella (`sal.length > 0`) lleva un punto de bifurcación antes del rótulo, tanto con una rama entrando como con sumadores, y `saleDe` apunta a ese punto.
- Un nodo interno con una entrada y una salida (o ninguna) ya no lleva un punto: lleva un rótulo `io` con el nombre de la variable. El punto queda sólo donde hay de verdad una bifurcación (`sal.length >= 2`).

Prueba: `tests/specs/senales.spec.js`, «en el equivalente, lo que vuelve desde la salida sale de un punto antes del rótulo y un nodo 1→1 se rotula sin punto» (además de las de transferencia, que siguen pasando).

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/senales.spec.js`](../tests/specs/senales.spec.js):
1. En el test `"cuando a la salida le llegan varias ramas, va un sumador antes del rótulo"` (líneas 114-120, que tiene el grafo `[[0, 1, "1"], [1, 2, "0.5"], [2, 3, "2"], [1, 3, "-0.25"], [3, 2, "0.3"]]` donde al nodo 3 de salida llegan 2 ramas y sale 1 hacia el nodo 2):
   - Verificar además que en `d = equivalenteEnBloques()`, el nodo `io` de salida (`label === "y"`) tenga **0 flechas salientes** (`d.edges.filter(e => e.from.id === sal.id).length === 0`) y **1 sola flecha entrante**.

---

## 5. Criterios de Aceptación

- [x] En `equivalenteEnBloques()`, el nodo `io` de salida nunca tiene flechas salientes (`e.from.id === ioSalida.id`), incluso cuando a la salida llegan varias ramas y parten lazos de realimentación desde ella.
- [x] Todo diagrama generado por `equivalenteEnBloques()` se abre en `diagrama-bloque.html` sin perder ninguna flecha y con la misma función de transferencia que calcula Mason.
- [x] `node src/construir.js` actualiza `diagrama-señales.html` y pasan `senales.spec.js` y `correccion.spec.js`.
