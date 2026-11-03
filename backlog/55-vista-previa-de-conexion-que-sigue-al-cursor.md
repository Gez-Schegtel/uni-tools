# Spec 55 — Vista Previa de Conexión que Sigue al Cursor

- **ID:** `SPEC-55`
- **Estado:** ✅ Completada
- **Origen:** Pedido del dueño, 2026-11-03 («la línea de trazos que se dibuja como vista previa de la conexión no funciona muy bien: debería seguir mejor al cursor, que no parezca que se conecta desde atrás»)
- **Prioridad:** Media
- **Esfuerzo estimado:** Medio (~1 hora)
- **Archivos afectados:** `src/comun/ortogonal.js`, `src/bloque/dibujo.js`, `src/bloque/interaccion.js`, `src/simulador/dibujo.js`, `src/simulador/geometria.js`, `src/simulador/interaccion.js`, `src/senales/dibujo.js`, `src/senales/interaccion.js`, pruebas

---

## 1. Historia de Usuario

> **Como** estudiante que conecta elementos arrastrando,
> **quiero** que la línea de vista previa muestre por dónde va a ir la conexión,
> **para** saber antes de soltar cómo va a quedar y no ver líneas que salen «de atrás» del elemento.

---

## 2. Descripción del Problema

- **Bloques y simulador:** `ptsPrevia()` salía 20 px de frente y después iba derecho al cursor. Con el cursor detrás del puerto (por ejemplo, a la izquierda de un bloque, tirando desde su puerto derecho) la línea volvía **por encima del propio bloque**: parecía conectada desde atrás.
- Sobre el destino, la vista previa seguía siendo ese recorrido simple, que no tenía nada que ver con la ruta que tomaba la flecha al soltar (que esquiva lo que está en el medio).
- **Señales:** la línea salía del **centro** del nodo y terminaba en el cursor aunque estuviera sobre otro nodo.

---

## 3. Lo que se hizo

1. **`ptsPrevia(A, dA, B, R)`** (común) recibe la caja del elemento de origen. Si el cursor quedó **detrás** del puerto y a la altura (o al ancho) del elemento, la línea sale de frente y lo **rodea por el lado más cercano al cursor**. En los demás casos el recorrido es exactamente el de antes.
2. **Sobre un destino que vale**, la vista previa es **la ruta real**:
   - bloques: `rutearFlechas()` con la flecha nueva sola y las demás como ya puestas (la misma que queda al soltar, porque la nueva va última);
   - simulador: `rutaDeCable()`, que se separó de `routeAll()` sin cambiarlo, con los demás cables como ya puestos (también al revés, de una entrada a una salida).
   Se calcula **una vez por destino** (`drag.previa`), no en cada movimiento.
3. El destino se toma de lo mismo que usa soltar (`destinoBajoPuntero` en bloques; `destinoDelCable`, nuevo, en el simulador, que reemplaza el código repetido de soltar), así que la previa nunca muestra un destino distinto del que se conecta.
4. **Señales:** la línea sale del borde del nodo hacia el cursor y, sobre otro nodo, termina en su borde.

---

## 4. Plan de Pruebas

- `ruteo.test.js`: «vista previa: con el cursor detrás del puerto rodea el elemento de origen por el lado más cercano» (falla con el `ptsPrevia` de antes) y «vista previa: hacia adelante, o detrás pero fuera de la altura del elemento, el recorrido es el de siempre» (que no cambie lo que andaba).
- `bloque.spec.js` y `simulador.spec.js`: con el cursor detrás, la previa no entra en el origen; sobre un destino, la previa es idéntica a la ruta final y esquiva el elemento del medio.
- `senales.spec.js`: la previa sale a 6 px (el radio) del centro del nodo y termina a 6 px del destino.
- La suite entera pasa igual (la de soltar en el simulador, con el código de destino unificado, incluida).

---

## 5. Criterios de Aceptación

- [x] Con el cursor detrás del puerto, la vista previa no pasa por encima del elemento de origen.
- [x] Sobre un destino, la vista previa coincide con la conexión que se crea al soltar.
- [x] En señales, la vista previa no sale del centro del nodo y se engancha al destino.
- [x] Nada cambia en las conexiones que se crean ni en el ruteo de las existentes.
