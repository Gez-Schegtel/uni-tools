# Spec 54 — Flechas que Esquivan cuando el Menú Fijo de Rutas Choca

- **ID:** `SPEC-54`
- **Estado:** ✅ Completada
- **Origen:** Pedido del dueño, 2026-11-03 («las flechas tienen que ser inteligentes y esquivar a los objetos»)
- **Prioridad:** Alta
- **Esfuerzo estimado:** Medio (~1,5 horas)
- **Archivos afectados:** `src/comun/ruteo-bloques.js` (bloques y la vista previa en bloques de señales), pruebas

---

## 1. Historia de Usuario

> **Como** estudiante que arma un diagrama de bloques,
> **quiero** que las flechas den la vuelta a los bloques en vez de pasarles por encima,
> **para** que el diagrama se lea sin ambigüedad y no tenga que acomodar cada flecha a mano.

---

## 2. Descripción del Problema (medido)

`rutearFlechas()` elige cada ruta de un **menú fijo** de candidatos (`candidates()`: rectas, en L, en Z y en U con unas pocas distancias) y se queda con la de menor puntaje (`scorePath()`). Cuando **todos** los candidatos atraviesan algún bloque —un bloque ajeno en el camino, o una salida que obliga a volver por encima del propio— el ganador es «el menos malo» y la flecha queda pasando por encima.

En 25 diagramas armados en grilla (entre 6 y 25 elementos, 754 flechas), **22 flechas (2,9 %)** atravesaban un bloque o su propio origen/destino.

---

## 3. Lo que se hizo

Si el mejor candidato **choca** (algún tramo atraviesa un obstáculo o entra en el bloque de origen o destino), se busca un **rodeo** (`rodeo()` en `comun/ruteo-bloques.js`):

- **A\*** sobre una grilla ralita: las `x` e `y` de las puntas, ±20 de ellas, los bordes de los obstáculos (con su margen) y un contorno a ±30. Sólo se miran los obstáculos de una zona de 160 alrededor de las puntas.
- El **costo** está en las mismas unidades que `scorePath()`: largo × 0,012, 16 por quiebre y lo mismo por superponerse a otra flecha no hermana (140 + 0,6 × superposición). El estado es celda + dirección, y la llegada exige entrar al puerto de frente.
- Montículo binario, caché de «¿está libre este tramo?» y **tope de 30 000 pasos** (con una grilla de más de 40 000 celdas ni se intenta): si no encuentra nada, queda lo de antes.
- La ruta encontrada se usa **sólo si no choca**, y se agrega como primera opción; las variantes (`variant`) siguen siendo las del menú fijo.
- Las flechas con ruta a mano (`manual`) y las que no chocan no cambian: el rodeo no corre.

**Resultado:**

| | antes | ahora |
|---|---|---|
| 25 diagramas en grilla: flechas que atraviesan un bloque | 22 de 754 | **0** |
| 13 diagramas al azar (bloques amontonados, se pueden superponer): choques | 22 / 24 / 6 / 7 / 11 / 16 / 8 | 16 / 15 / 3 / 6 / 5 / 10 / 6 |
| ruteo completo de esos diagramas | — | 15 ms en promedio, 83 ms el peor |

**Intercambio conocido:** en tres de los diagramas al azar hay algunas superposiciones más entre flechas (41 → 45, 17 → 21, 19 → 20), porque un rodeo a veces comparte un tramo con otra flecha en vez de cruzar un bloque. Se aceptó: pasar por encima de un bloque es peor que correr pegada a otra flecha. Los choques que quedan en esos diagramas son de bloques encimados o tan juntos que no hay lugar por dónde pasar.

---

## 4. Plan de Pruebas

- `ruteo.test.js`, «cuando todos los candidatos fijos chocan, el rodeo esquiva: sale por la izquierda sin volver por encima del bloque» (falla sin el rodeo).
- `bloque.spec.js`, «en 25 diagramas armados en grilla, ninguna flecha atraviesa un bloque ni pasa por encima del suyo» (sin el rodeo: 15 flechas mal).
- La prueba de rendimiento de SPEC-53 sigue pasando (el rodeo no se nota al arrastrar) y la suite entera pasa igual.

---

## 5. Criterios de Aceptación

- [x] En diagramas ordenados en grilla ninguna flecha atraviesa un bloque ni su propio origen/destino.
- [x] Las flechas que ya andaban bien no cambian (el rodeo sólo corre si el mejor candidato choca).
- [x] Las rutas a mano y las variantes siguen funcionando.
- [x] El arrastre con 160 bloques sigue por debajo de 40 ms por paso.
