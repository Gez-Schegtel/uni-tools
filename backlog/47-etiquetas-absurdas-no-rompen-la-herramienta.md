# Spec 47 — Una Etiqueta Absurda no Rompe la Herramienta

- **ID:** `SPEC-47`
- **Estado:** ✅ Completada
- **Origen:** Auditoría de seguridad del 2026-11-03 (segunda parte)
- **Prioridad:** Alta
- **Esfuerzo estimado:** Bajo (~30 minutos)
- **Archivos afectados:** `src/bloque/ecuaciones.js`, `src/lgr/entrada.js`, pruebas

---

## 1. Historia de Usuario

> **Como** estudiante que abre un archivo que le pasaron (o que se corrompió),
> **quiero** que la herramienta siga funcionando aunque una etiqueta traiga algo absurdo,
> **para** no quedarme con la herramienta en blanco y sin saber por qué.

---

## 2. Descripción del Problema

El analizador de ecuaciones de los bloques (`analizar()` en `src/bloque/ecuaciones.js`) es recursivo y no tenía topes:

1. **Anidamiento:** con unos 3 000 paréntesis (o `\frac{` anidados) desborda la pila (`RangeError`). Como el dibujo se rehace en cada cambio, la excepción salía en cada `render()`. Y como el documento ya había entrado al autoguardado, **al recargar la herramienta quedaba en blanco** hasta borrar el `localStorage` a mano. Basta un JSON armado a propósito para dejarla así.
2. **Largo:** el armado de la fila es cuadrático (`items.concat` en un bucle): 16 000 caracteres tardan 62 ms y un texto de 1 MB, varios minutos.
3. En el LGR, `parsearPoli()` también desbordaba con 20 000 paréntesis (ahí el error se atajaba y se mostraba «No se pudo calcular», sin romper la página).

---

## 3. Lo que se hizo

- `itemsDeEtiqueta()` (`ecuaciones.js`): si la etiqueta pasa de 2000 caracteres o de 60 niveles de anidamiento, o si el análisis falla por cualquier motivo, se muestra como texto plano recortado a 80 caracteres. `cajaEtiqueta()` tiene además un último resguardo.
- `parsearPoli()` (LGR): avisa «La expresión es demasiado larga» (más de 1000 caracteres) o «Hay demasiados paréntesis anidados» (más de 50).

---

## 4. Plan de Pruebas

- `tests/unidades/ecuaciones.test.js`: 5000 paréntesis y 1 MB se resuelven en menos de un segundo como texto plano; `K/(s+1)` sigue siendo una fracción.
- `tests/unidades/lgr.test.js`: los dos avisos nuevos, y 50 niveles todavía se aceptan.
- `tests/specs/archivos-danados.spec.js`: abrir el archivo trampa no tira errores, el bloque se dibuja y después de recargar la herramienta sigue funcionando.

---

## 5. Criterios de Aceptación

- [x] Ninguna etiqueta, por absurda que sea, tira una excepción en el dibujo.
- [x] Las ecuaciones normales se ven igual que antes (`correccion.spec.js` pasa).
