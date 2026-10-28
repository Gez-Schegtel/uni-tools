# Spec 07 — Caché Topológica y Cotas de Seguridad en la Regla de Mason (`diagrama-señales`)

- **ID:** `SPEC-07`
- **Referencia en el informe:** `BUG-03` y Sección `5.4.D.4`
- **Prioridad:** Alta (7 / 27)
- **Esfuerzo estimado:** Medio (~40 minutos)
- **Herramientas afectadas:** Diagramas de flujo de señales (`src/senales/mason.js`, `src/senales/panel.js`, `diagrama-señales.html`)

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de flujo de señales,  
> **quiero** que arrastrar nodos o curvar ramas en el lienzo sea fluido sin recalcular toda la regla de Mason en cada movimiento del mouse, y que si armo un grafo extremadamente denso la aplicación no se cuelgue por explosión combinatoria,  
> **para** trabajar con fluidez en tiempo real y recibir un aviso claro si el grafo excede el límite razonable de caminos/lazos simbólicos.

---

## 2. Descripción Técnica del Problema (Causa Raíz)

1. **Cálculo completo en cada fotograma (`src/senales/panel.js:64-65`):**
   - Cada vez que se ejecuta `render()` (incluyendo cada evento `pointermove` al curvar una rama nueva con `curve-new` o cuando no hay selección), `renderInspector()` llama a `resumenMason()`, la cual invoca `analizar()` ([`src/senales/mason.js:230-246`](../src/senales/mason.js)).
   - `analizar()` ejecuta `trayectorias()`, `lazos()`, `combinacionesDisjuntas()` para $\Delta$ y otra vez `combinacionesDisjuntas()` para cada cofactor $\Delta_k$.
   - Sin embargo, **las coordenadas `x, y` de los nodos y la `curva` de las ramas no influyen en absoluto en la regla de Mason** (que sólo depende de la topología y las ganancias `g`). Recalcular todos los caminos y ciclos 60 veces por segundo durante un arrastre geométrico es trabajo 100 % redundante.

2. **Explosión combinatoria sin cota (`src/senales/mason.js:11-58`):**
   - En un grafo denso (p. ej. 10 nodos con múltiples ramas cruzadas o 15 autolazos disjuntos), la cantidad de caminos simples, ciclos elementales y subconjuntos de lazos disjuntos ($2^L$) crece exponencialmente, congelando el hilo principal del navegador.

---

## 3. Especificación de la Solución

### 3.1. Caché por firma topológica/algebraica en `src/senales/mason.js`
En `analizar()`, construir una clave liviana basada únicamente en los datos que afectan a Mason (`n.id`, `n.nombre`, `n.tipo` de `S.nodos` y `r.id`, `r.de`, `r.a`, `r.g` de `S.ramas`):

```js
let _cacheMason = { clave: "", valor: null };

function firmaMason() {
  let s = "";
  for (const n of S.nodos) s += n.id + ":" + n.nombre + ":" + n.tipo + ";";
  s += "|";
  for (const r of S.ramas) s += r.id + ":" + r.de + ">" + r.a + "=" + r.g + ";";
  return s;
}
```
Si `firmaMason() === _cacheMason.clave`, devolver `_cacheMason.valor` (o un clon superficial si algún consumidor como `conValores()` le agrega `.valor`, o mejor aún calcular `conValores(P)` y `conValores(L)` dentro del mismo `analizar()` para que el objeto cacheado ya esté completo e inmutable).

### 3.2. Cotas de seguridad en `trayectorias()`, `lazos()` y `combinacionesDisjuntas()`
Definir constantes de límite razonables para uso académico:
```js
const MAX_CAMINOS = 200;
const MAX_LAZOS = 200;
const MAX_COMB = 2000;
```
- En `trayectorias()`, detener la recursión si `out.length >= MAX_CAMINOS` y marcar `truncado = true`.
- En `lazos()`, detener la recursión si `out.length >= MAX_LAZOS` y marcar `truncado = true`.
- En `combinacionesDisjuntas(lazos)`, detener la búsqueda cuando el total de combinaciones generadas alcance `MAX_COMB` y marcar `truncado = true`.
- Si `A.truncado === true`, mostrar una nota de advertencia en `resumenMason()` y en `mostrarMason()` indicando que el grafo supera el límite de términos simbólicos mostrados.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

1. **En [`tests/unidades/mason.test.js`](../tests/unidades/mason.test.js):**
   - Agregar un test `"un grafo muy denso o con muchos lazos disjuntos termina en pocos milisegundos gracias a las cotas de seguridad"`:
     - Construir un grafo con 16 nodos en cadena cada uno con su propio autolazo ($2^{16} = 65536$ combinaciones disjuntas sin cota) o un grafo completo $K_8$.
     - Verificar que `analizar()` termine en `< 100 ms` y devuelva `truncado: true` sin colgar el proceso.
2. **En [`tests/specs/senales.spec.js`](../tests/specs/senales.spec.js):**
   - Agregar un test que verifique que cambiar `n.x`, `n.y` o `r.curva` y llamar a `render()` reutilice el análisis cacheado sin volver a correr `trayectorias()` ni `lazos()`.

---

## 5. Criterios de Aceptación

- [ ] Mover nodos o curvar ramas en `diagrama-señales` no vuelve a ejecutar `trayectorias()`, `lazos()` ni `combinacionesDisjuntas()`.
- [ ] Un grafo con 16 lazos disjuntos o un grafo completo de 8 nodos no congela la pestaña y responde en menos de 100 ms informando que se alcanzó el tope simbólico.
- [ ] Todos los tests existentes en `tests/unidades/mason.test.js`, `tests/specs/senales.spec.js` y `tests/specs/correccion.spec.js` siguen pasando.
