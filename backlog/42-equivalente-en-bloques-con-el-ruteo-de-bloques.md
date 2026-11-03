# Spec 42 — El Equivalente en Bloques Usa el Ruteo y el Dibujo de `diagrama-bloque`

- **ID:** `SPEC-42`
- **Estado:** ⏳ Pendiente
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

## 4. Plan de Pruebas

- `tests/specs/senales.spec.js`: las pruebas del equivalente (cantidad de bloques, sumadores y bifurcaciones; transferencia igual a la del grafo) siguen pasando.
- Prueba nueva: el SVG de la vista previa y el de `diagrama-bloque` abriendo el JSON generado tienen los mismos puntos en cada flecha.

---

## 5. Criterios de Aceptación

- [ ] `equivalente.js` sólo arma el modelo: no rutea ni dibuja por su cuenta.
- [ ] La vista previa y `diagrama-bloque` dibujan igual el mismo diagrama.
