# Spec 42 — El Equivalente en Bloques Usa el Ruteo y el Dibujo de `diagrama-bloque`

- **ID:** `SPEC-42`
- **Estado:** ✅ Completada (el ruteo; el dibujo queda propio, ver 3.1)
- **Origen:** Revisión de estructura del 2026-11-03 (informe, sección `4.4`)
- **Prioridad:** Baja (42 / 46)
- **Esfuerzo estimado:** Medio / Alto (~1 hora)
- **Relacionada con:** `SPEC-22` (que cubre `DIRP`/`puntoPuerto` y los `fit()`)
- **Archivos afectados:** `src/senales/equivalente.js`, `src/bloque/ruteo.js`, `src/bloque/dibujo.js`, `src/comun/`

---

## 1. Historia de Usuario

> **Como** mantenedor,
> **quiero** que la vista previa del diagrama de bloques equivalente (en `diagrama-señales`) use el mismo ruteo y el mismo dibujo que `diagrama-bloque`,
> **para** que un arreglo en el ruteo o en cómo se dibuja un sumador llegue a los dos lados.

---

## 2. Descripción del Problema

`src/senales/equivalente.js` (289 líneas) arma el diagrama de bloques equivalente y, para mostrarlo dentro de la ventana de Mason, **reimplementa** cosas de `diagrama-bloque`:

- su propio ruteador ortogonal (`caminoOrto`), en vez de `routeAll()` de `src/bloque/ruteo.js`;
- su propio dibujo de bloques, sumadores, bifurcaciones y puntas de flecha;
- `DIRP` y `puntoPuerto`, copias de `DIRS` y `portPoint` (esto lo cubre `SPEC-22`).

Por eso la vista previa no se ve igual que el mismo JSON abierto en `diagrama-bloque` (las flechas pueden tomar otro camino), y cada arreglo de dibujo hay que hacerlo dos veces.

---

## 3. Especificación de la Solución

1. Mover a `src/comun/` (p. ej. `comun/bloques-dibujo.js` y `comun/bloques-ruteo.js`) lo que necesitan los dos lados: geometría de puertos, ruteo ortogonal de flechas y dibujo de bloque, sumador, bifurcación y rótulo. Las funciones tienen que recibir el diagrama por parámetro y no leer `S` directamente: en `diagrama-señales`, `S` es el grafo de señales.
2. Incluir esos módulos en `bloque/pagina.html` y `senales/pagina.html`, y borrar las copias de `equivalente.js`.
3. Cuidar el orden de inclusión y los nombres (ver `SPEC-40`).

---

### 3.1. Lo que se hizo (2026-11-03)

- `comun/ortogonal.js` se partió: lo que lee `S` (`bboxNodos`, `bboxAll`, `alinear`) pasó a `comun/cajas.js` y en `ortogonal.js` quedó el ruteo, que no depende de la herramienta.
- `bloque/ruteo.js` pasó a `comun/ruteo-bloques.js`, con `rutearFlechas(nodes, edges)` (no lee `S`); `routeAll()` es esa función con `S.nodes` y `S.edges`.
- `diagrama-señales` incluye `ortogonal.js` y `ruteo-bloques.js`, y `svgDeBloques()` rutea con `rutearFlechas()`. Se borró `caminoOrto()`.
- **El dibujo no se compartió:** el `renderNode()` del editor dibuja con clases CSS de su página, capas (`gNodes`, `gAtras`), colores de tema y ecuaciones con medición del texto; la vista previa es un SVG suelto con estilos en línea para el PNG. Llevar eso a `comun/` costaba más que mantener las ~30 líneas del dibujo de la vista previa.

Prueba: `senales.spec.js`, «la vista previa del equivalente usa el ruteo del editor de bloques: ninguna flecha atraviesa un bloque».

---

## 4. Plan de Pruebas

- `tests/specs/senales.spec.js`: las pruebas del equivalente (cantidad de bloques, sumadores y bifurcaciones; transferencia igual a la del grafo) siguen pasando.
- Prueba nueva: el SVG de la vista previa y el de `diagrama-bloque` abriendo el JSON generado tienen los mismos puntos en cada flecha.

---

## 5. Criterios de Aceptación

- [x] `equivalente.js` ya no rutea por su cuenta (usa `rutearFlechas()`); el dibujo de bloques y sumadores de la vista previa sigue siendo propio (ver 3.1).
- [x] Las flechas de la vista previa salen del mismo ruteo que en `diagrama-bloque` (con los tamaños que estima la vista previa: el editor vuelve a medir las ecuaciones al abrir el JSON).
