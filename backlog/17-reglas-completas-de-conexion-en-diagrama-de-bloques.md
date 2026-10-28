# Spec 17 — Reglas Algebraicas Completas de Conexión e Inversión de Sentido en `diagrama-bloque`

- **ID:** `SPEC-17`
- **Referencia en el informe:** `BUG-07` y Sección `5.4.B.2`
- **Prioridad:** Media (17 / 27)
- **Esfuerzo estimado:** Medio (~45 minutos)
- **Herramientas afectadas:** Diagramas de bloques (`src/bloque/modelo.js`, `src/bloque/interaccion.js`, `src/bloque/panel.js`, `diagrama-bloque.html`)

---

## 1. Historia de Usuario

> **Como** estudiante o docente de Control que dibuja diagramas de bloques,  
> **quiero** que la herramienta haga cumplir todas las reglas algebraicas de conexión (tanto al arrastrar flechas como al pulsar `"Invertir sentido"` en el panel o al abrir archivos) y me explique por qué una conexión no es válida cuando la rechaza,  
> **para** no armar diagramas físicamente ambiguos (como dos señales que se juntan sin un sumador, dos flechas saliendo de un bloque sin una bifurcación, una flecha entrando a una pata de sumador sin signo o un lazo cerrado sin sumador).

---

## 2. Descripción Técnica del Problema y Alerta Crítica de No Regresión

En el commit actual de la rama (`22051e0`), [`src/bloque/modelo.js:23-26`](../src/bloque/modelo.js) define:

```js
function admiteEntrada(id, ignorandoFlecha) {
  const n = getNode(id);
  return !n || n.type !== "block" || !S.edges.some(e => e.id !== ignorandoFlecha && e.to.id === id);
}
```

Al comparar con las reglas estrictas que se habían ensayado en el commit `520e9a1`, es **fundamental separar qué es un bug real en `22051e0` de qué es una decisión de diseño que, si se aplica sin cuidado, rompe funcionalidad existente**:

### ⚠️ Alerta de No Regresión: Por qué NO se debe prohibir sacar varias flechas de un mismo nodo ni filtrar flechas en `depurarFlechas()` sin antes decidir el modelo
En `22051e0`, **compartir tronco con puntos de unión automáticos (`junctionDots()` en [`src/bloque/ruteo.js:138-159`](../src/bloque/ruteo.js)) es una funcionalidad activa y testeada**:
1. Cuando dos flechas salen del mismo nodo (`a.from.id === b.from.id`), `junctionDots()` dibuja automáticamente el punto de bifurcación (`<circle class="jdot">`) donde ambas rutas se separan.
2. El test existente [`tests/specs/bloque.spec.js:132-155`](../tests/specs/bloque.spec.js) (`"permite varias salidas desde una entrada y entradas a un sumador"`) saca **tres flechas distintas desde el mismo nodo `r` (`type: "io"`)** (`r → g1`, `r → g2` y `r → b`) y exige que las 3 se creen (`expect(n).toBe(3)`).
3. Además, [`src/senales/equivalente.js:90`](../src/senales/equivalente.js) genera para el nodo de entrada un único `io()` del cual salen directamente todas las ramas de `sal` (`sal.length >= 2`).
4. Por lo tanto, **si se prohíbe que un `"io"` o `"block"` tenga más de una salida (como hacía `520e9a1`), se rompen `bloque.spec.js:132-155`, `junctionDots()` y `equivalenteEnBloques()`**.

---

## 3. Especificación de la Solución (En Dos Niveles: Seguro vs. Opcional)

### 3.1. Nivel A (100 % Seguro — No rompe ningún test ni flujo actual de `22051e0`)
Corregir los bugs reales de validación respetando las reglas de `22051e0` y lo definido en las nuevas `SPEC-28` y `SPEC-31`:
1. *(Nota de coordinación con [`SPEC-28`](./28-simplificacion-panel-sin-duplicar-ni-botones-flecha.md): el botón `#e-flip` "Invertir sentido" se elimina por completo del panel de flechas en `SPEC-28`, por lo que ya no existe esa vía para dejar a un bloque con 2 entradas).*
2. **Extender `admiteEntrada(id, ignorandoFlecha)` a bifurcaciones (`node`) y rótulos (`io`) ([`src/bloque/modelo.js:23-26`](../src/bloque/modelo.js)):**
   - Una bifurcación (`type === "node"`) o un rótulo de salida (`type === "io"`) tampoco pueden recibir 2 flechas entrantes (dos señales no pueden sumarse sin un sumador `type === "sum"`):
     ```js
     function admiteEntrada(id, ignorandoFlecha) {
       const n = getNode(id);
       if (!n || n.type === "marco") return false;
       if (n.type === "block" || n.type === "node" || n.type === "io")
         return !S.edges.some(e => e.id !== ignorandoFlecha && e.to.id === id);
       return true;
     }
     ```
   - Este cambio conserva intacta la capacidad de sacar múltiples salidas desde un `io`, `block` o `node` (tronco compartido con `junctionDots()`), por lo que **`bloque.spec.js:132-155` y `equivalenteEnBloques()` siguen pasando al 100 %**.

3. **Impedir conectar una flecha entrante a una pata de sumador que tenga signo `"vacío"` (`""`) (coordinado con [`SPEC-31`](./31-sumador-sin-contenido-texto-vacio-y-maximo-tres-signos.md)):**
   - Como establece la `SPEC-31`, un sumador tiene hasta 3 signos y al menos 1 lado `"vacío"` (`""`, reservado para la salida). Si el usuario intenta meter una flecha entrante por el lado `"vacío"` (`n.type === "sum"` y `!n.signs[port]`), rechazar la entrada en ese puerto mostrando `toast("Ese lado del sumador está vacío: elegí una pata con signo + o −")` (y validar lo mismo si cambia el selector `#e-tp` de destino en el panel).

### 3.2. Nivel B (Opcional — Reglas estrictas de `520e9a1`, sólo si se desea cambiar el modelo de uso)
Si en el futuro se quisiera obligar a usar nodos `bifurcación` explícitos prohibiendo que salgan 2 flechas de un bloque o de una entrada `io`:
- **Requisito previo obligatorio:** Aplicar antes la **Spec 19** (para que `equivalenteEnBloques()` inserte `bif()` tras la entrada y antes de la salida) y actualizar el test [`tests/specs/bloque.spec.js:132-155`](../tests/specs/bloque.spec.js).
- **Nunca filtrar por reglas algebraicas dentro de `depurarFlechas()` al abrir archivos**, o al menos avisar al usuario, para no borrar silenciosamente flechas de diagramas viejos guardados con tronco compartido.

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):
1. Conservar intacto el test existente `"permite varias salidas desde una entrada y entradas a un sumador"` (líneas 132-155).
2. Agregar un test `"una bifurcación admite una sola entrada y un sumador no admite entradas por su lado vacío"`:
   - Armar dos bloques e intentar conectar ambos como entrada a la misma bifurcación (`node`) o al lado vacío (`""`) de un sumador.
   - Verificar que la segunda entrada a la bifurcación y la entrada al lado vacío del sumador sean rechazadas con su aviso en `#toast`.

---

## 5. Criterios de Aceptación

- [ ] Ninguna acción de interfaz (arrastrar puerto, reconectar extremo, `#e-flip` o editar signos del sumador) ni carga de archivo permite violar las reglas algebraicas del diagrama de bloques.
- [ ] Cada rechazo muestra en `#toast` la causa específica (entrada única, salida única, pata sin signo o lazo sin sumador).
- [ ] `node src/construir.js` actualiza `diagrama-bloque.html` y todas las pruebas de `bloque.spec.js` y `senales.spec.js` (equivalente en bloques) pasan.
