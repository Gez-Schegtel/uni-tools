# Spec 53 — Rendimiento con Muchos Bloques

- **ID:** `SPEC-53`
- **Estado:** ✅ Completada
- **Origen:** Pedido del dueño, 2026-11-03 («si hay muchos diagramas de bloques, el rendimiento baja bastante»)
- **Prioridad:** Alta
- **Esfuerzo estimado:** Medio (~1 hora)
- **Archivos afectados:** `src/comun/ruteo-bloques.js`, `src/bloque/dibujo.js`, `src/bloque/interaccion.js`, pruebas

---

## 1. Historia de Usuario

> **Como** estudiante con un diagrama de bloques grande,
> **quiero** que seleccionar y arrastrar sigan fluidos,
> **para** no pelearme con la herramienta a medida que el diagrama crece.

---

## 2. Descripción del Problema (medido)

Con un diagrama de N bloques en cadena, con lazos:

| | 40 | 80 | 160 |
|---|---|---|---|
| `render()` | 14 ms | 32 ms | 101 ms |
| de eso, `routeAll()` | 12 ms | 26 ms | 98 ms |
| un paso de arrastre | 13 ms | 24 ms | 80 ms |

Casi todo el tiempo era el ruteo de **todas** las flechas, y se rehacía en cada `render()`: al seleccionar, al escribir en el panel, en cada movimiento del mouse al arrastrar. Además, cada flecha comparaba sus ~60 candidatos contra todos los bloques del diagrama.

---

## 3. Lo que se hizo (sin cambiar ninguna ruta final)

1. **Caché del ruteo:** `routeAll()` no hace nada si no cambió `firmaDeRuteo()` (posición, tamaño y tipo de cada elemento; puertos, variante y ruta a mano de cada flecha) y todas las flechas tienen sus puntos.
2. **Ruteo parcial al arrastrar:** `render("arrastre")` rutea con `rutearAfectadas()` sólo las flechas de lo que se mueve y las que pasan cerca de donde estaba o de donde está; las demás quedan como estaban. Al soltar, el `render()` completo rutea todo como siempre.
3. **Obstáculos de la zona:** cada flecha descarta los bloques que no tocan la caja de todos sus candidatos. Como `segRect()` es una prueba de cajas, un bloque fuera de esa caja no puede cambiar ningún puntaje.

**Resultado** (160 bloques): seleccionar, 101 → 4 ms; un paso de arrastre, 80 → 5 ms; soltar, 78 ms una sola vez.

**Comprobación de que no cambia nada:** antes de tocar el código se guardaron las rutas finales de 13 diagramas (el ejemplo y 12 al azar, con variantes y un arrastre); después del cambio son idénticas.

**Alcance:** el simulador lógico rutea sus cables con su propio código (`simulador/geometria.js`) y no se tocó.

---

## 4. Plan de Pruebas

- `bloque.spec.js`, «con 160 bloques: seleccionar no rerutea, arrastrar es rápido y al soltar las rutas son las de un ruteo completo».
- `ruteo.test.js`, «rutear sólo algunas flechas deja las demás como estaban y las usa como ya puestas».
- La suite entera pasa igual.

---

## 5. Criterios de Aceptación

- [x] Seleccionar no vuelve a rutear.
- [x] Arrastrar en un diagrama de 160 bloques tarda menos de 40 ms por paso (medido: 5 ms).
- [x] Las rutas finales son idénticas a las de antes.
