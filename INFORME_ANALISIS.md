# Informe de Análisis Técnico Exhaustivo — `uni-tools`

**Fecha del análisis:** 28 de octubre de 2026  
**Rama analizada:** `features/análisis` (commit base `22051e0`)  
**Alcance:** Revisión íntegra del 100 % de los archivos del repositorio (56 módulos fuente en `src/`, 4 páginas HTML en la raíz, 20 archivos de pruebas en `tests/`, 2 flujos de CI en `.github/workflows/` y toda la documentación y configuración del proyecto).

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Evaluación de la Estructura y Arquitectura del Proyecto](#2-evaluación-de-la-estructura-y-arquitectura-del-proyecto)
3. [Catálogo Detallado de Bugs Detectados](#3-catálogo-detallado-de-bugs-detectados)
   - [3.1. Severidad Crítica / Alta](#31-severidad-crítica--alta)
   - [3.2. Severidad Media](#32-severidad-media)
   - [3.3. Severidad Baja / Casos Borde y Visuales](#33-severidad-baja--casos-borde-y-visuales)
4. [Malas Prácticas, Code Smells y Problemas de Rendimiento](#4-malas-prácticas-code-smells-y-problemas-de-rendimiento)
5. [Auditoría Exhaustiva de la Suite de Pruebas (`tests/`)](#5-auditoría-exhaustiva-de-la-suite-de-pruebas-tests)
   - [5.1. Aspectos Destacados](#51-aspectos-destacados-lo-que-está-muy-bien-hecho)
   - [5.2. Problemas de Correctitud y Falsos Positivos en los Tests Existentes](#52-problemas-de-correctitud-y-falsos-positivos-en-los-tests-existentes)
   - [5.3. Tests Innecesarios, Redundantes o Mal Ubicados](#53-tests-innecesarios-redundantes-o-mal-ubicados)
   - [5.4. Tests Faltantes (Huecos de Cobertura)](#54-tests-faltantes-huecos-de-cobertura)
6. [Auditoría de Documentación e Higiene del Repositorio](#6-auditoría-de-documentación-e-higiene-del-repositorio)
7. [Plan de Mejoras Propuestas (Hoja de Ruta)](#7-plan-de-mejoras-propuestas-hoja-de-ruta)

---

## 1. Resumen Ejecutivo

`uni-tools` es una colección de tres herramientas académicas interactivas para materias de ingeniería (Control y Sistemas Digitales):
1. **Diagramas de bloques** (`diagrama-bloque.html`, armado desde `src/bloque/` y `src/comun/`).
2. **Simulador de circuitos lógicos** (`simulador-logico.html`, armado desde `src/simulador/` y `src/comun/`).
3. **Diagramas de flujo de señales** (`diagrama-señales.html`, armado desde `src/senales/` y `src/comun/`).

### Veredicto General

El proyecto destaca por una **premisa arquitectónica excelente para su propósito**: cada herramienta se distribuye como un único archivo `.html` 100 % autocontenido, sin dependencias externas, sin CDN y capaz de funcionar offline o abrirse con doble clic (`file://`), mientras el código fuente se mantiene modularizado en `src/` y se ensambla mediante un script propio de 89 líneas (`src/construir.js`) sin requerir `npm` para construir. Además, los algoritmos centrales (Quine–McCluskey con ramificación y poda, tipógrafo matemático en SVG y enumeración simbólica/numérica de la regla de Mason) están acompañados por una suite de pruebas de exactitud muy rigurosa (`tests/specs/correccion.spec.js`).

Sin embargo, el análisis minucioso del código y la documentación reveló **22 bugs concretos** (incluyendo pérdida silenciosa de datos al cruzar archivos entre herramientas, caídas por `TypeError` ante puertos corruptos, bloqueo de la interfaz por explosión combinatoria en cada fotograma y pérdida de foco cada 400 ms con el reloj automático), además de **problemas estructurales en el ciclo `commit() → render()`**, **código duplicado** y **documentación desactualizada** (especialmente `tests/README.md`, las tablas de atajos de ayuda y referencias a archivos/ramas inexistentes).

| Categoría | Estado | Hallazgos principales |
| :--- | :--- | :--- |
| **Arquitectura y modularidad** | Buena con deuda técnica | Separación clara `src/comun/` vs herramientas, pero todo comparte un único ámbito global y `render()` muta el modelo `S`. |
| **Bugs funcionales y de robustez** | **22 detectados** | 5 Críticos/Altos, 8 Medios, 9 Bajos/Cosméticos. |
| **Rendimiento** | Mejorable | Redibujado destructivo total del DOM en cada movimiento del puntero; cálculo completo de Mason en cada `render()`. |
| **Suite de pruebas (`tests/`)** | Muy buena base | Pruebas de propiedad sobresalientes en `correccion.spec.js`, pero faltan pruebas de rechazo cruzado de archivos e interacciones en vivo con el reloj. |
| **Documentación e higiene** | Desactualizada | `CLAUDE.md` eliminado en el árbol de trabajo con enlaces rotos hacia él; `tests/README.md` describe archivos que ya no existen; `uni-tools-logo.jpg` (2.03 MB) sin uso. |

---

## 2. Evaluación de la Estructura y Arquitectura del Proyecto

### 2.1. Fortalezas Arquitectónicas

1. **Cero dependencias en tiempo de ejecución y portabilidad total:**
   - El ensamblador `src/construir.js` resuelve directivas `<!-- @incluir ... -->` y `/* @incluir ... */` con parámetros `{{clave}}`, generando páginas finales sin `<script src>` ni `<link rel="stylesheet">`.
   - Un test específico (`tests/specs/fuentes.spec.js`) verifica en CI que los `.html` de la raíz coincidan bit a bit con la salida de `node src/construir.js --comprobar`.
2. **Contrato declarativo `HERRAMIENTA` (`src/*/modelo.js`):**
   - Cada herramienta define el objeto `HERRAMIENTA` con las claves de sus colecciones (`nodos`, `conexiones`, `selConexion`), prefijos de ID, funciones de sanitización (`depurarNodos`, `depurarConexiones`), callbacks de ciclo de vida (`alCargar`, `prepararPegado`, `desplazarConexiones`) y textos de interfaz. Esto permite que `src/comun/` implemente de forma genérica el historial, autoguardado, abrir/guardar, copiar/pegar/cortar/duplicar y exportación SVG/PNG.
3. **Exportación SVG con estado embebido (`src/comun/exportar.js`):**
   - Los archivos `.svg` exportados incrustan el JSON del documento dentro de `<metadata id="uni-tools-datos">`, permitiendo que la misma imagen vectorial entregada en un informe pueda reabrirse y editarse en la herramienta.
4. **Separación de la infraestructura de pruebas (`tests/package.json`):**
   - Aislar `@playwright/test` dentro de `tests/` mantiene limpia la raíz del repositorio y permite correr las pruebas unitarias puras (`tests/unidades/*.test.js`) con el corredor nativo `node --test` en milisegundos usando `node:vm` (`tests/unidades/cargar.js`).

### 2.2. Debilidades Estructurales

#### A. Espacio de nombres global compartido y acoplamiento por orden de inclusión
Como `src/construir.js` concatena todos los archivos JS de una herramienta dentro de un único `<script>` clásico, todas las funciones, constantes y variables de estado (`S`, `drag`, `hoverNode`, `pendingAdd`/`pendiente`, `inspLock`, `uidc`, `undoStack`, `redoStack`) viven en el ámbito global (`window`).
- Cualquier colisión de nombres entre `src/comun/` y una herramienta sobrescribe símbolos silenciosamente.
- Existe una dependencia implícita del orden exacto de las directivas `/* @incluir */` en cada `pagina.html`. Por ejemplo, `src/comun/arranque.js` ejecuta código de inicialización inmediatamente al evaluarse y **debe** incluirse en último lugar.

#### B. Mutación del estado del modelo (`S`) dentro de `render()` e inversión temporal `commit() → render()`
En una arquitectura limpia Basada en Estado, `render()` debería ser una función pura de lectura que proyecta el estado `S` hacia el DOM. En `uni-tools`, **`render()` modifica `S` directamente** en las tres herramientas:
- En **Diagramas de bloques** (`src/bloque/dibujo.js:116-120`): `render()` llama a `actualizarTamaños()` (que muta `n.w` y `n.h` de cada bloque según su ecuación en `src/bloque/ecuaciones.js:259-270`) y a `routeAll()` (que muta `e.pts` de cada flecha en `src/bloque/ruteo.js:119-138`).
- En **Simulador lógico** (`src/simulador/dibujo.js:115-116`): `render()` llama a `correr()` (que muta `n.q`, `n.clkPrev` y `n.clkArranque` de los biestables en `src/simulador/logica.js:55-65`) y a `routeAll()` (que muta `w.pts`).
- En **Diagramas de señales** (`src/senales/dibujo.js:121`): `render()` llama a `acomodarRamas()` (que muta `r.curva` en `src/senales/geometria.js:75-103`).

**Consecuencia directa:** En todo el código, las acciones del usuario siguen el patrón:
```js
mutarModelo(S);
commit();   // <-- guarda snapshot(S) ANTES de que render() recalcule tamaños, rutas o curvas
render();   // <-- actualiza n.w, n.h, e.pts, r.curva
```
Debido a este orden (`commit()` antes de `render()`), cada entrada en `undoStack` y cada llamada a `autoguardar()` guarda las geometrías derivadas (`n.w`, `n.h`, `e.pts`, `r.curva`) **del fotograma anterior** (desactualizadas). Además, mientras `src/simulador/modelo.js:46` limpia explícitamente `pts` en `docDatos()`, tanto `src/bloque/modelo.js:35` como `src/senales/modelo.js:36` serializan `S.edges` (con `e.pts` obsoletos) y `S.ramas` (con `r.curva` obsoleta) directamente en el JSON y el historial.

#### C. Inconsistencia de vocabulario en el modelo entre herramientas
Las tres herramientas usan nombres de propiedades distintos para conceptos idénticos:
- Colección de nodos y aristas: `nodes` / `edges` (`bloque`), `nodes` / `wires` (`simulador`), `nodos` / `ramas` (`senales`).
- Selección de aristas: `selEdges` (`bloque`), `selW` (`simulador`), `selR` (`senales`).
- Modo activo: `S.mode` (`bloque`) vs `S.modo` (`senales`) vs inexistente en `simulador`.
- Herramienta pendiente: `pendingAdd` (`bloque`) vs `pendiente` (`simulador`).
- Etiqueta de un nodo: `n.label` (`bloque` y `simulador`) vs `n.nombre` (`senales`).
- Tipo de un nodo: `n.type` (`bloque` y `simulador`) vs `n.tipo` (`senales`).

Esta divergencia obliga a que `src/comun/` y los tests tengan condicionales constantes (`n.label !== undefined ? n.label : n.nombre`, `S.edges || S.wires || S.ramas`).

---

## 3. Catálogo Detallado de Bugs Detectados

### 3.1. Severidad Crítica / Alta

---

#### BUG-01: Pérdida de datos al abrir un documento de `simulador-logico` en `diagrama-bloque` (o viceversa)
- **Ubicación:** `src/comun/documento.js:43-58`, `src/bloque/modelo.js:29`, `src/simulador/modelo.js:40`.
- **Causa raíz:**  
  `abrirTexto(txt, nombre)` valida si un archivo pertenece a la herramienta únicamente comprobando:
  ```js
  if (!d || typeof d !== "object" || !Array.isArray(d[HERRAMIENTA.nodos])) {
    toast(HERRAMIENTA.textos.noEsDoc); return;
  }
  ```
  Tanto `diagrama-bloque` como `simulador-logico` definen `HERRAMIENTA.nodos = "nodes"`. Ninguno de los dos verifica un identificador de herramienta en el documento ni exige que exista la clave `HERRAMIENTA.conexiones` (`"edges"` vs `"wires"`).
- **Impacto y reproducción:**
  1. En `diagrama-bloque.html`, el usuario tiene un diagrama de bloques en el que estuvo trabajando.
  2. Por error elige abrir un archivo `.json` o `.svg` exportado desde `simulador-logico.html` (que tiene `nodes: [...]` con tipos `"in"`, `"and"`, `"out"` y `wires: [...]`).
  3. `Array.isArray(d.nodes)` da `true`. `depurarNodos(d.nodes)` descarta todas las compuertas porque sus `type` (`"in"`, `"and"`, etc.) no pertenecen a `["block", "sum", "node", "io", "marco"]` (conservando sólo eventuales `"marco"`).
  4. `S.nodes` queda vacío, `S.edges` queda vacío, se llama a `commit()` (lo cual **sobrescribe el autoguardado en `localStorage`**) y aparece el aviso `"Diagrama cargado"`.
  5. Exactamente lo mismo ocurre a la inversa si se abre un archivo de `diagrama-bloque` dentro de `simulador-logico`.
- **Solución propuesta:**  
  Incluir un campo `herramienta: HERRAMIENTA.clave` en `docDatosBase()` y, en `abrirTexto()`, rechazar el archivo si `d.herramienta && d.herramienta !== HERRAMIENTA.clave`, o bien (para retrocompatibilidad con archivos versión 1 sin `d.herramienta`) verificar que no traiga la clave de conexiones de otra herramienta (`("wires" in d && HERRAMIENTA.conexiones !== "wires") || ("edges" in d && HERRAMIENTA.conexiones !== "edges")`).

---

#### BUG-02: Caída total (`TypeError`) en `diagrama-bloque` al cargar una flecha con puerto inválido o ausente
- **Ubicación:** `src/bloque/modelo.js:58-76` y `src/bloque/ruteo.js:27, 126`.
- **Causa raíz:**  
  En `src/simulador/modelo.js:74-86`, `depurarCables()` verifica que los pines existan en el nodo origen y destino (`outs.includes(w.from.pin)`). En cambio, en `src/bloque/modelo.js:58-76`, `depurarFlechas()` sólo comprueba `ids.has(e.from.id) && ids.has(e.to.id)`, pero **nunca valida que `e.from.port` y `e.to.port` pertenezcan a `["l", "r", "t", "b"]`**, ni impide que una flecha se conecte a un nodo de tipo `"marco"`.
  Cuando luego corre `render() → routeAll()` (`src/bloque/ruteo.js:126`):
  ```js
  const da = dirOf(e.from.port), db = dirOf(e.to.port);
  ```
  `dirOf()` devuelve `undefined`, y en `candidates(a, da, b, db, ...)` (`src/bloque/ruteo.js:27`):
  ```js
  const a1 = { x: a.x + da.x * STUB, y: a.y + da.y * STUB };
  ```
  lanza `TypeError: Cannot read properties of undefined (reading 'x')`, abortando `render()` y dejando la aplicación inutilizable.
- **Solución propuesta:**  
  En `depurarFlechas()` (`src/bloque/modelo.js:61`), validar que los nodos extremos no sean `"marco"` y que `PUERTOS.includes(e.from.port) && PUERTOS.includes(e.to.port)`.

---

#### BUG-03: Explosión combinatoria sin cota en la Regla de Mason ejecutada en cada `render()`
- **Ubicación:** `src/senales/mason.js:11-58` y `src/senales/panel.js:64-65`.
- **Causa raíz:**  
  1. `trayectorias()`, `lazos()` y `combinacionesDisjuntas()` (`src/senales/mason.js:11-58`) realizan búsquedas en profundidad (DFS) de todos los caminos simples, todos los ciclos elementales y todos los subconjuntos de ciclos disjuntos sin ningún límite de cantidad ni de tiempo. En un grafo con $k$ lazos disjuntos, `combinacionesDisjuntas()` genera $2^k - 1$ combinaciones; en un grafo denso de 10–12 nodos, la cantidad de ciclos simples y sus combinaciones disjuntas crece exponencialmente.
  2. Peor aún, `render()` invoca siempre `renderInspector()` (`src/senales/dibujo.js:129`), y cuando no hay ningún elemento seleccionado (`S.sel.length === 0 && S.selR.length === 0`), `renderInspector()` ejecuta `resumenMason() → analizar()` (`src/senales/panel.js:64-65`) **en cada fotograma**.
  3. Cuando el usuario crea una rama nueva o arrastra la curvatura de una rama sin tenerla seleccionada (p. ej. durante `curve-new`), cada evento `pointermove` (60–120 veces por segundo) recalcula desde cero todos los caminos, ciclos y determinantes de Mason y reconstruye el DOM del panel derecho.
- **Solución propuesta:**  
  1. Cachear el resultado de `analizar()` invalidándolo únicamente cuando cambian `S.nodos` o `S.ramas` (las coordenadas `x, y` y la `curva` visual no alteran en absoluto la topología ni las ganancias de Mason).
  2. Imponer cotas de seguridad en `trayectorias()`, `lazos()` y `combinacionesDisjuntas()` (por ejemplo, máximo 500 ciclos o 2000 combinaciones disjuntas) mostrando un aviso claro si el grafo supera el límite simbólico.

---

#### BUG-04: El reloj automático (`400 ms`) en `simulador-logico` destruye el foco del panel derecho (`#insp`)
- **Ubicación:** `src/simulador/interaccion.js:169-175` y `src/simulador/panel.js:15-17`.
- **Causa raíz:**  
  El temporizador global del reloj (`setInterval(..., 400)` en `src/simulador/interaccion.js:169-175`) alterna `n.on = !n.on` en los relojes con `modo === "auto" && corriendo` y llama a `render()`.
  Dentro de `render() → renderInspector()` (`src/simulador/panel.js:15-17`), la guarda `if (inspLock) return;` sólo vale `true` durante el despacho sincrónico de un evento `input`. El resto del tiempo vale `false`, por lo que **cada 400 ms `box.innerHTML = h` reemplaza todo el DOM del panel derecho**.
- **Impacto y reproducción:**
  1. Cargar el ejemplo `"Contador de 2 bits"` o `"Registro D"` y poner el reloj en modo `"Solo (tren de pulsos)"` → `"Andando"`.
  2. Seleccionar cualquier elemento (o deseleccionar todo para ver los colores del circuito) e intentar escribir una etiqueta en `#n-lab` o abrir un `<select>` en el panel derecho.
  3. En menos de 400 ms el `<input>` o `<select>` es destruido y recreado por `box.innerHTML = h`, perdiendo el foco y la posición del cursor.
- **Solución propuesta:**  
  No reconstruir `#insp` durante los pulsos del reloj automático (o bien comprobar `if (inspLock || box.contains(document.activeElement))` antes de pisar `box.innerHTML`, actualizando únicamente los textos de estado como `Estado actual: 1 / 0` mediante selectores puntuales).

---

#### BUG-05: `truthTable()` contamina el estado secuencial entre filas cuando hay biestables sin reloj (latches) o entradas conectadas a `CLK`
- **Ubicación:** `src/simulador/logica.js:82-97`.
- **Causa raíz:**  
  En `truthTable()`:
  ```js
  const copia = S.nodes.map(n => Object.assign({}, n));
  for (let m = 0; m < total; m++) {
    ins.forEach((n, i) => {
      copia.find(x => x.id === n.id).on = !!((m >> (ins.length - 1 - i)) & 1);
    });
    const r = simulate(copia, S.wires);
    ...
  }
  ```
  El arreglo `copia` se clona **una sola vez fuera del bucle `for`**. En cada iteración `m`, `simulate(copia, S.wires)` muta in-place las propiedades `n.q`, `n.clkPrev` y `n.clkArranque` de los biestables dentro de `copia` (`src/simulador/logica.js:55-65`).
- **Impacto:**  
  - Si el circuito contiene un biestable sin reloj (`conClk === false`, como `ff:d-sin` o un latch RS/JK donde una combinación retiene el estado `q` o tiene estado prohibido) o si una entrada `"in"` está cableada a la pata `CLK` de un flip-flop, la salida calculada para la fila `m` depende de las transiciones ocurridas en las filas `0 .. m-1`.
- **Solución propuesta:**  
  Restaurar el estado inicial de cada nodo de `copia` (`n.q`, `n.clkPrev`, `n.clkArranque`) al comienzo de cada iteración `m` del bucle en `truthTable()`.

---

### 3.2. Severidad Media

---

#### BUG-06: `commit()` se ejecuta antes de `render()`, guardando geometrías obsoletas en el historial y en archivos exportados
- **Ubicación:** `src/comun/historial.js:11-24`, `src/bloque/modelo.js:35`, `src/senales/modelo.js:36`.
- **Causa raíz:**  
  Como se describió en la Sección 2.2.B, todas las operaciones llaman a `commit()` antes de `render()`.
  - En `diagrama-bloque`, si el usuario cambia la ecuación de un bloque de `"G"` a `"K/(s^2+2*\\zeta*\\omega_n*s+\\omega_n^2)"`, `commit()` guarda el `snapshot()` cuando el bloque todavía mide `72×42` y las flechas (`e.pts`) todavía apuntan al borde viejo. Recién en el `render()` siguiente `actualizarTamaños()` agranda el bloque y `routeAll()` recalcula `e.pts`.
  - Si el usuario exporta a JSON inmediatamente (`docDatos()`), `e.pts` sí está actualizado porque hubo un `render()`, pero el último paso de `undoStack` tiene el tamaño y las rutas previas.
  - Además, guardar `e.pts` (en rutas automáticas donde `!e.manual`) y `r.curva` (cuando no fue editada) dentro de `undoStack` e incluso en el JSON exportado infla innecesariamente el tamaño de los datos.
- **Solución propuesta:**  
  Separar el cálculo geométrico del modelo (`actualizarTamaños()`, `routeAll()`, `acomodarRamas()`) en una función `actualizarGeometria()` que se invoque antes de `snapshot()`, o bien no serializar `e.pts` cuando `!e.manual` (tal como ya hace `src/simulador/modelo.js:46` con `w.pts`).

---

#### BUG-07: Reglas de conexión de diagramas de bloques incompletas y puenteables (en commit `22051e0`)
- **Ubicación:** `src/bloque/modelo.js:23-26`, `src/bloque/panel.js:163`, `src/bloque/interaccion.js:366-383`.
- **Causa raíz:**  
  En el estado actual de la rama (`22051e0`), la función `admiteEntrada(n, ignorarId)` sólo verifica:
  ```js
  function admiteEntrada(n, ignorarId) {
    if (!n || n.type !== "block") return true;
    return !S.edges.some(e => e.id !== ignorarId && e.to.id === n.id);
  }
  ```
  Esto deja múltiples inconsistencias frente al álgebra de diagramas de bloques (varias de las cuales fueron abordadas luego en el commit `520e9a1` de `main`):
  1. **Puenteo mediante "Invertir sentido" (`#e-flip`):** En `src/bloque/panel.js:163`, el botón `#e-flip` invierte `e.from` y `e.to` (`[e.from, e.to] = [e.to, e.from]`) **sin consultar `admiteEntrada()`**. Así, un usuario puede sacar una flecha desde un bloque que ya tiene una entrada y pulsar "Invertir sentido", dejando al bloque con 2 flechas de entrada.
  2. **Múltiples entradas en bifurcaciones (`node`) y rótulos (`io`):** `admiteEntrada()` devuelve `true` para `node` e `io`, permitiendo que dos señales converjan en un punto de bifurcación (como si fuera un sumador sin signos) o en una entrada/salida.
  3. **Múltiples salidas desde bloques o sumadores sin bifurcación:** Un bloque puede sacar varias flechas directamente desde sus puertos sin pasar por un nodo de bifurcación (`type === "node"`).
  4. **Flechas hacia patas de sumador sin signo (`""`):** Si un puerto de un sumador tiene signo vacío (`n.signs[port] === ""`), igual se permite conectarle una flecha entrante, quedando una entrada cuya operación matemática (`+` o `−`) es ambigua.
  5. **Lazos de realimentación directos sobre un bloque sin sumador:** Se permite cerrar un lazo saliendo de un bloque (o de una bifurcación tras él) y entrando al mismo bloque sin pasar por ningún sumador.
- **Solución propuesta:**  
  Adoptar las validaciones completas de `admiteEntrada`, `admiteSalida`, `caminoSinSumador` y `avisoConexion` (como en `520e9a1`), y **además** validar el cambio dentro del manejador `#e-flip` (`src/bloque/panel.js:163`) antes de invertir `e.from` y `e.to`.

---

#### BUG-08: Creación de rama en dos pasos (`curve-new`) en `diagrama-señales` queda colgada sin `commit()` al cambiar de herramienta o pulsar `Esc`
- **Ubicación:** `src/senales/interaccion.js:61-63, 158-161` y `src/senales/barra.js:23-26`.
- **Causa raíz:**  
  Al arrastrar para unir dos nodos distintos en `diagrama-señales`, `pointerup` (`src/senales/interaccion.js:158-160`) agrega la nueva rama a `S.ramas` y pasa al estado `drag = { kind: "curve-new", rid: r.id }` para que el usuario elija la curvatura con el mouse y confirme con un segundo clic:
  ```js
  S.ramas.push(r);
  S.sel = []; S.selR = [r.id];
  drag = { kind: "curve-new", rid: r.id };
  toast("Mové el mouse para curvar la rama · clic para fijar");
  render(); return;
  ```
  Recién en el siguiente `pointerdown` sobre el lienzo (`src/senales/interaccion.js:61-63`) se ejecuta `drag = null; commit(); render();`.
- **Impacto y reproducción:**
  1. Si mientras está en `curve-new` el usuario pulsa `Esc`, `alEscape()` (`src/senales/barra.js:23-26`) cambia el modo a `"select"`, pero **no limpia `drag = null` ni llama a `commit()`**. La rama sigue doblándose al mover el mouse y el cambio no quedó registrado en el historial (`undoStack`).
  2. Si mientras está en `curve-new` el usuario hace clic en cualquier botón de la barra superior (`Guardar`, `Análisis`, `Nuevo nodo`, etc.), el evento no pasa por el `pointerdown` del `#canvas`: `commit()` nunca se llama para esa rama y `drag` permanece en `curve-new` cuando vuelve al lienzo.
- **Solución propuesta:**  
  Crear una función `finalizarCurvaNueva()` que, si `drag && drag.kind === "curve-new"`, haga `drag = null; commit(); render();` e invocarla en `alEscape()`, en `setModo()` y antes de abrir modales o guardar.

---

#### BUG-09: La selección por banda en `diagrama-señales` ignora el modo de selección múltiple (`Shift` / `modo === "multi"`)
- **Ubicación:** `src/senales/interaccion.js:98-100, 165-171`.
- **Causa raíz:**  
  En `src/bloque/interaccion.js:179, 344` y `src/simulador/interaccion.js:90, 146`, cuando el usuario inicia una selección por banda (`drag.kind === "band"`), se guarda `add: sumandoALaSeleccion(ev)` y al soltar el botón se **unen** los nodos encerrados a la selección previa (`S.sel = Array.from(new Set(S.sel.concat(picked)))`).
  En cambio, en `src/senales/interaccion.js:165-171`:
  ```js
  if (drag.kind === "band") {
    const x1 = Math.min(drag.x0, drag.x1), y1 = Math.min(drag.y0, drag.y1);
    const x2 = Math.max(drag.x0, drag.x1), y2 = Math.max(drag.y0, drag.y1);
    if (x2 - x1 > 4 || y2 - y1 > 4) {
      S.sel = S.nodos.filter(n => n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2).map(n => n.id);
      S.selR = [];
    }
  }
  ```
  Siempre **sobrescribe** `S.sel`, incluso si el usuario mantiene presionada la tecla `Shift` o activó el botón `Selección múltiple` (`S.modo === "multi"`).
- **Solución propuesta:**  
  Guardar `add: sumandoALaSeleccion(ev)` al crear `drag = { kind: "band", ... }` en `src/senales/interaccion.js:98` y concatenar sin duplicados cuando `drag.add` sea verdadero.

---

#### BUG-10: Falta de validación de `n.tipo` en `depurarNodos()` de `diagrama-señales`
- **Ubicación:** `src/senales/modelo.js:66-72` y `src/senales/dibujo.js:20-26`.
- **Causa raíz:**  
  `depurarNodos()` en `src/senales/modelo.js:66-72` no valida `n.tipo`:
  ```js
  function depurarNodos(ns) {
    S.nodos = ns.filter(n => n && idValido(n.id) && num(n.x, null) !== null && num(n.y, null) !== null);
    S.nodos.forEach(n => { n.x = num(n.x, 0); n.y = num(n.y, 0); n.nombre = texto(n.nombre, n.id); });
  }
  ```
  Mientras tanto, en `renderNodo()` (`src/senales/dibujo.js:20-26`):
  ```js
  if (n.tipo !== "normal") {
    g.appendChild(svg("circle", { r: R_NODO + 4, class: "n-io" }));
    const tag = svg("text", { x: 0, y: R_NODO + 15, class: "n-tag" });
    tag.textContent = n.tipo === "entrada" ? "ENTRADA" : "SALIDA";
    g.appendChild(tag);
  }
  ```
- **Impacto:**  
  1. Si se carga un JSON donde un nodo no tiene la propiedad `tipo` (`undefined`) o tiene un valor inválido, `n.tipo !== "normal"` es `true` y se dibuja en el lienzo con el cartel **`"SALIDA"`**, pero para `analizar()` (`n.tipo === "salida"`) ¡no es una salida! El usuario ve un nodo marcado como `"SALIDA"` en pantalla mientras la ventana de Mason dice `"Falta marcar el nodo de salida"`.
  2. Tampoco se impide que un JSON cargado traiga múltiples nodos con `tipo: "entrada"` o `tipo: "salida"`, violando el invariante de unicidad que sí aplica el panel (`src/senales/panel.js:76-82`).
- **Solución propuesta:**  
  En `depurarNodos()`, normalizar `if (!["entrada", "normal", "salida"].includes(n.tipo)) n.tipo = "normal";` y asegurar que a lo sumo un nodo quede como `"entrada"` y uno como `"salida"`.

---

#### BUG-11: Los recuadros (`marco`) en `simulador-logico` no tienen área de agarre, tiradores de tamaño ni creación por arrastre
- **Ubicación:** `src/simulador/dibujo.js:34`, `src/simulador/interaccion.js` y `src/comun/recuadros.js:26-44`.
- **Causa raíz:**  
  En `src/simulador/dibujo.js:34`, `renderNode()` llama a `dibujarMarco(g, n, false)` pasando `agarrable = false`.
  - Cuando `agarrable === false` (`src/comun/recuadros.js:30`), no se crea el rectángulo `.m-hit` de `stroke-width: 20` ni el asa `.m-grip`.
  - Como un recuadro recién creado tiene `relleno: "no"` (`fill: none`) y `stroke-width: 1.4`, el usuario sólo puede seleccionarlo si acierta con el puntero exactamente sobre la línea punteada de 1.4 px.
  - Además, a diferencia de `diagrama-bloque` (`src/bloque/dibujo.js:72-86` y `src/bloque/interaccion.js:68-107`), `simulador-logico` no dibuja tiradores de redimensionamiento (`renderHandles`) ni permite crear el recuadro arrastrando en diagonal sobre la hoja (sólo se puede cambiar su ancho y alto escribiendo números a ciegas en `#m-w` y `#m-h` del panel derecho).
- **Solución propuesta:**  
  Pasar `agarrable = true` en `src/simulador/dibujo.js:34` y compartir en `src/comun/recuadros.js` los tiradores de redimensionamiento y la creación por arrastre que hoy están sólo en `src/bloque/`.

---

#### BUG-12: `bboxAll()` en `diagrama-bloque` y `simulador-logico` ignora las flechas y los cables al recortar la exportación y al encuadrar (`fit()`)
- **Ubicación:** `src/comun/ortogonal.js:5-11`.
- **Causa raíz:**  
  En `src/senales/geometria.js:116-127`, `bboxAll()` incluye tanto los nodos como los puntos extremos de las curvas de las ramas (`S.ramas`). En cambio, en `src/comun/ortogonal.js:5-11` (usado por `diagrama-bloque` y `simulador-logico`):
  ```js
  function bboxAll() {
    if (!S.nodes.length) return { x: 0, y: 0, w: 600, h: 400 };
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of S.nodes) {
      const r = rectOf(n);
      ...
    }
    return { x: x1 - 40, y: y1 - 40, w: (x2 - x1) + 80, h: (y2 - y1) + 80 };
  }
  ```
  Ignora por completo los puntos `e.pts` de `S.edges` y `w.pts` de `S.wires` (así como sus etiquetas).
- **Impacto:**  
  Si un lazo de realimentación o un tramo arrastrado a mano (`e.manual = true`) se extiende más allá de los `40 px` de margen alrededor de los nodos, **queda cortado y fuera del `viewBox`** al exportar a SVG o PNG (cuando no se usa hoja fija) y al pulsar `Encuadrar` (`F`).
- **Solución propuesta:**  
  Incluir las coordenadas `p.x, p.y` de `S[HERRAMIENTA.conexiones]` dentro del cálculo de `x1, y1, x2, y2` en `bboxAll()`.

---

#### BUG-13: Anomalías topológicas en `equivalenteEnBloques()` de `diagrama-señales`
- **Ubicación:** `src/senales/equivalente.js:90-115`.
- **Causa raíz:**  
  Al construir la cadena interna de cada nodo del grafo de señales:
  1. **Salida con múltiples ramas entrantes y lazos salientes (`src/senales/equivalente.js:90-98`):** Cuando el nodo de salida (`n.tipo === "salida"`) tiene `ent.length >= 2`, `cadena` se construye como `[...sumadores, io(n.nombre)]`. Si además de la salida parten ramas hacia otros nodos (`sal.length >= 1`, p. ej. realimentación desde la salida), `salidaNodo.set(n.id, cadena[cadena.length - 1])` apunta al nodo `io` en lugar de insertar una bifurcación (`node`) entre el último sumador y el rótulo `io`. Como resultado, la flecha de realimentación sale del rótulo de texto `io` en vez de salir de un punto de toma (bifurcación) previo a la salida.
  2. **Bifurcación superflua en nodos internos con 1 entrada y 1 salida (`src/senales/equivalente.js:107-110`):** Cuando un nodo interno `"normal"` tiene exactamente 1 rama entrante y 1 rama saliente (`ent.length === 1 && sal.length === 1`), igual se crea un punto de bifurcación (`type: "node"`) entre ambos bloques, aunque no hay ramificación alguna.
- **Solución propuesta:**  
  En el caso `n.tipo === "salida"` con `ent.length >= 2 && sal.length >= 1`, insertar un nodo `bif()` antes del `io()` final y usarlo como `salidaNodo`; y en nodos internos con `ent.length === 1 && sal.length === 1` conectar directamente sin bifurcación si no se desea mostrar el punto intermedio (o rotularlo con el nombre de la variable interna).

---

### 3.3. Severidad Baja / Casos Borde y Visuales

---

#### BUG-14: Cruz (`×`) descentrada en el selector de signos del sumador en `diagrama-bloque`
- **Ubicación:** `src/bloque/estilos.css:17-20`.
- **Causa raíz:**  
  ```css
  .signbox .mid{grid-area:m;width:28px;height:28px;border:1.5px solid var(--ink);border-radius:50%;margin:auto;position:relative}
  .signbox .mid::before,.signbox .mid::after{content:"";position:absolute;inset:0;margin:auto;width:70%;height:1.2px;background:var(--ink)}
  .signbox .mid::before{transform:rotate(45deg)}
  .signbox .mid::after{transform:rotate(-45deg)}
  .signbox .mid::before,.signbox .mid::after{top:50%}
  ```
  La primera regla fija `inset: 0` (`top: 0; right: 0; bottom: 0; left: 0`) con `margin: auto`, lo que ya centra perfectamente los pseudo-elementos de `height: 1.2px` en el medio del círculo. Pero la línea 20 sobrescribe `top: 50%` dejando `bottom: 0`, por lo que `margin: auto` centra la barra entre el 50 % y el 100 % de la altura (al **75 %** de la altura del círculo). Al rotar ±45°, la cruz queda desplazada hacia abajo y sobresale del círculo.
- **Solución propuesta:**  
  Eliminar la línea 20 de `src/bloque/estilos.css` (`.signbox .mid::before,.signbox .mid::after{top:50%}`).

---

#### BUG-15: Etiqueta `</head>` duplicada en `src/bloque/pagina.html`
- **Ubicación:** `src/bloque/pagina.html:13-14` (y línea 358 de `diagrama-bloque.html`).
- **Causa raíz:**  
  ```html
  <!-- @incluir ../comun/estilos-fin.html -->
  </head>
  </head>
  <body>
  ```
  Hay dos etiquetas de cierre `</head>` seguidas, generando HTML inválido en `diagrama-bloque.html`.
- **Solución propuesta:**  
  Eliminar el segundo `</head>` en `src/bloque/pagina.html:14` y regenerar con `node src/construir.js`.

---

#### BUG-16: `splitEdge()` pierde el color personalizado de la flecha al partirla con una bifurcación
- **Ubicación:** `src/bloque/comandos.js:29-31`.
- **Causa raíz:**  
  Al soltar una flecha en el vacío desde otra flecha o insertar un nodo sobre ella, `splitEdge(eid, pt)` crea la segunda mitad copiando `label`, `dashed`, `arrow` y `width`:
  ```js
  S.edges.push({ id: uid("e"), from: { id: n.id, port: pOut }, to: oldTo,
    label: e.label || "", variant: 0, dashed: !!e.dashed, arrow: e.arrow || "end", width: e.width || 0 });
  ```
  pero omite copiar `color: e.color ? Object.assign({}, e.color) : undefined`.
- **Solución propuesta:**  
  Copiar también `color` en la nueva arista creada por `splitEdge()`.

---

#### BUG-17: Condición de carrera al hacer clics rápidos sobre un reloj en modo pulso (`simulador-logico`)
- **Ubicación:** `src/simulador/interaccion.js:163-166`.
- **Causa raíz:**  
  ```js
  function pulso(n) {
    n.on = true; commit(); render();
    setTimeout(() => { n.on = false; commit(); render(); }, 140);
  }
  ```
  Si el usuario hace dos clics en menos de 140 ms sobre el reloj, en el segundo clic `n.on` ya es `true`, por lo que `n.on = true` **no produce flanco ascendente** en los flip-flops (`!n.clkPrev && clk` es `false`), el primer `setTimeout` apaga el reloj prematuramente y se apilan dos pasos redundantes en `undoStack`.
- **Solución propuesta:**  
  Si hay un pulso activo en ese reloj (`_timersPulso.get(n.id)`), cancelarlo con `clearTimeout`, forzar `n.on = false; correr();` sincrónicamente antes de volver a encenderlo, y registrar un único `commit()` al finalizar el pulso.

---

#### BUG-18: El editor flotante de doble clic (`.editor-hoja`) se desfasa al desplazar la hoja con la rueda del mouse
- **Ubicación:** `src/comun/doble-clic.js:15-31` y `src/comun/vista.js:29-45`.
- **Causa raíz:**  
  `editarEnLaHoja()` posiciona el `<input class="editor-hoja">` con coordenadas fijas en píxeles de pantalla (`left: (S.pan.x + xMundo * S.zoom) + "px"`). Si con el editor abierto el usuario gira la rueda del mouse sobre el lienzo, `instalarRueda()` llama a `moverVista()`, que desplaza el `<g id="viewport">` sin cerrar ni reposicionar `.editor-hoja`.
- **Solución propuesta:**  
  En `moverVista()` (o en el listener `wheel`), actualizar las coordenadas `left`/`top` de `.editor-hoja` si existe, o bien hacer `ed.blur()` para confirmar y cerrar el editor al desplazar la hoja.

---

#### BUG-19: `undo()` y `redo()` no llaman a `autoguardar()`
- **Ubicación:** `src/comun/historial.js:15-24`.
- **Causa raíz:**  
  `commit()` invoca `autoguardar()`, pero `undo()` y `redo()` no lo hacen. Si el usuario deshace cambios con `Ctrl+Z` y no se llega a disparar `pagehide` (por ejemplo, cierre forzado del navegador/pestaña o apertura simultánea de `index.html` en otra pestaña), `localStorage` conserva el estado previo al `undo()`.
- **Solución propuesta:**  
  Llamar a `autoguardar()` al final de `undo()` y `redo()`.

---

#### BUG-20: Validación incompleta en `hojaValida()` y en `depurarNodos()` para recuadros y biestables
- **Ubicación:** `src/comun/hoja.js:16-17`, `src/bloque/modelo.js:52` y `src/simulador/modelo.js:58-72`.
- **Causa raíz:**  
  1. `hojaValida(h)` (`src/comun/hoja.js:16-17`) sólo comprueba `["x", "y", "w", "h"].every(k => num(h[k], null) !== null)`. Acepta `w <= 0` o `h <= 0` (lo cual rompe el `<rect>` del área de impresión y `buildExportSVG()`) y no comprueba que `h.preset in HOJAS`.
  2. `depurarNodos()` en `bloque` y `simulador` no invoca `completarMarco(n)` sobre los nodos de tipo `"marco"`, por lo que un recuadro cargado desde un JSON sin `trazo` o `relleno` se dibuja con borde continuo en vez de `"dashed"`, y `n.atras` no se normaliza a booleano.
  3. En `src/simulador/modelo.js:58-72`, `depurarNodos()` no sanitiza los elementos dentro del arreglo `n.pins` de un flip-flop (si `n.pins` contiene `null`, `dibujo.js:83` lanza `TypeError: Cannot read properties of null`), ni asigna valores por defecto a `n.salida` / `n.salidaNeg` cuando faltan (dibujando `"undefinedA"`), ni valida que `n.rot` sea `0, 90, 180` o `270`.
- **Solución propuesta:**  
  Exigir `h.w > 0 && h.h > 0 && h.preset in HOJAS` en `hojaValida()`, llamar a `completarMarco(n)` cuando `esMarco(n)` y sanitizar `n.pins`, `n.salida`, `n.salidaNeg` y `n.rot` en `src/simulador/modelo.js`.

---

#### BUG-21: `alinear("dh")` y `alinear("dv")` con sólo 2 elementos resetean rutas manuales y ensucian el historial sin mover nada
- **Ubicación:** `src/comun/ortogonal.js:13-35`.
- **Causa raíz:**  
  Para distribuir elementos uniformemente (`dh` / `dv`) se necesitan al menos **3** elementos (con 2 elementos, el primero queda en `min` y el segundo en `max`, es decir, en sus posiciones originales). Sin embargo, `alinear(kind)` sólo verifica `if (ns.length < 2) return;`, ejecuta `S[HERRAMIENTA.conexiones].forEach(rutaAuto)` (borrando las rutas manuales de todas las flechas/cables del diagrama) y llama a `commit()`. Además, las alineaciones `left`, `right`, `top` y `bottom` no redondean a la grilla con `snapV()`, a diferencia de `cx`, `cy`, `dh` y `dv`.
- **Solución propuesta:**  
  Si `(kind === "dh" || kind === "dv") && ns.length < 3`, mostrar `toast("Elegí al menos tres elementos para distribuir")` y retornar sin tocar las rutas ni el historial; y aplicar `snapV()` en todas las ramas de `alinear()`.

---

#### BUG-22: En `simulador-logico`, la herramienta por colocar (`pendiente`) no se limpia al interactuar con elementos existentes
- **Ubicación:** `src/simulador/interaccion.js:51-93`.
- **Causa raíz:**  
  Si el usuario elige una compuerta en la paleta (p. ej. tecla `1` → `pendiente = "and"`), pero en lugar de hacer clic en el fondo vacío hace clic sobre una compuerta existente para moverla o sobre un pin para cablear, las ramas `if (pinEl)` e `if (nodeEl)` se ejecutan sin limpiar `pendiente = null`. Cuando más tarde hace clic en el fondo vacío para deseleccionar, ¡se coloca sorpresivamente la compuerta que había quedado en `pendiente`!
- **Solución propuesta:**  
  En `diagrama-bloque` (`src/bloque/interaccion.js:68-107`), `pendingAdd` tiene prioridad o se cancela al cambiar de acción. En `simulador-logico`, o bien dar prioridad a `pendiente` al hacer clic, o bien llamar a `setPendiente(null)` cuando el usuario inicia otra interacción sobre un nodo o cable.

---

## 4. Malas Prácticas, Code Smells y Problemas de Rendimiento

1. **Redibujado destructivo total del DOM en cada `pointermove` sin arrastre (`!drag`):**
   - En `src/bloque/interaccion.js:206-214`, cuando el usuario simplemente mueve el mouse sobre el lienzo sin arrastrar nada (`!drag`), cada vez que el puntero entra o sale del radio de cercanía de un nodo (`near !== hoverNode`), se invoca `render()`.
   - `render()` vacía por completo `gAtras`, `gEdges`, `gNodes` y `gOv` (`textContent = ""`), vuelve a calcular los tamaños de todas las ecuaciones, vuelve a rutear todas las flechas, recrea cientos de nodos SVG y reconstruye el HTML del panel derecho (`#insp`).
   - En `src/simulador/interaccion.js:97-100` es aún más agresivo: en `pointermove` con `!drag`, si `hitSeg(w.x, w.y)` es `null`, en la línea 100 ejecuta `if (hoverSeg) { hoverSeg = null; render(); }`, y cuando `hitSeg` devuelve un objeto `{ w, seg }`, como `hitSeg` crea un **nuevo objeto literal en cada llamada** (`return { w, seg: i }`), la comparación `(!hoverSeg || hoverSeg.w !== h.w || hoverSeg.seg !== h.seg)` es eficiente sólo cuando no hay segmento, pero al recorrer un tramo o cambiar de tramo dispara `render()` completo (incluyendo `correr()`, que re-simula todo el circuito lógico).
2. **Cachés de ecuaciones sin límite de crecimiento (`src/bloque/ecuaciones.js:160, 245`):**
   - Los mapas `_mcache = new Map()` y `_bcache = new Map()` almacenan las métricas de texto y las cajas de ecuaciones indexadas por la cadena escrita.
   - Como el editor del panel actualiza `n.label` en cada evento `input` tecla por tecla, todas las cadenas intermedias quedan retenidas en memoria durante toda la sesión sin cota máxima (LRU).
3. **Uso de la función obsoleta `unescape()` (`src/comun/documento.js:69`):**
   - En `aBase64(s)` se utiliza `btoa(unescape(encodeURIComponent(s)))`. `unescape()` está deprecada en el estándar ECMAScript (Anexo B). Hoy es preferible usar `TextEncoder` o reemplazar los bytes UTF-8 con `encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode("0x" + p))`.
4. **Duplicación de código entre herramientas y `src/comun/`:**
   - **Zoom y rueda del mouse:** `src/senales/interaccion.js:3-43` reimplementa sus propias funciones `fit()` e `instalarRueda()`, duplicando casi línea por línea lo que ya existe en `src/comun/vista.js:5-45`.
   - **Geometría de bloques para la vista previa:** `src/senales/equivalente.js:184-268` vuelve a definir `portOf`, `DIRP` y un ruteador ortogonal propio (`ruta()`) junto con el dibujo de bloques, sumadores y marcadores de flecha, duplicando lógica de `src/bloque/modelo.js`, `src/bloque/ruteo.js` y `src/bloque/dibujo.js`.
   - **Sanitización de recuadros (`marco`):** Sólo se aplica al crear (`completarMarco`), pero no está integrada como paso estándar dentro de `abrirTexto()` en `src/comun/documento.js`.

---

## 5. Auditoría Exhaustiva de la Suite de Pruebas (`tests/`)

Se revisaron los **20 archivos** que componen la infraestructura de pruebas: la configuración (`tests/package.json`, `tests/playwright.config.js`, `tests/servidor.js`), las **3 suites unitarias** en `tests/unidades/` (`cargar.js`, `ecuaciones.test.js`, `logica.test.js`, `mason.test.js`) y los **13 archivos de especificaciones E2E** en `tests/specs/` (`ayudas.js`, `archivos-danados.spec.js`, `bloque.spec.js`, `comun.spec.js`, `correccion.spec.js`, `cortar.spec.js`, `fuentes.spec.js`, `humo.spec.js`, `inicio.spec.js`, `lienzo.spec.js`, `senales.spec.js`, `simulador.spec.js`, `ventanas.spec.js`).

### 5.1. Aspectos Destacados (Lo que está muy bien hecho)
La suite tiene una base técnica muy sólida en áreas críticas:
- **Verificación contra oráculos independientes (`tests/specs/correccion.spec.js`):** No prueba el código repitiendo la misma lógica de la aplicación, sino que implementa:
  1. Un resolvedor de sistemas lineales por eliminación gaussiana con pivoteo parcial para contrastar la regla de Mason y el diagrama en bloques equivalente en 120 grafos aleatorios.
  2. Un buscador exhaustivo de cubos primos para verificar optimalidad de Quine–McCluskey en cientos de funciones booleanas.
  3. Un simulador de referencia para contrastar tablas de verdad y expresiones de 80 circuitos combinacionales aleatorios, sumadores en cascada y biestables con reloj.
  4. Un evaluador algebraico recursivo para comprobar que las ecuaciones tipografiadas en SVG tengan exactamente el mismo valor numérico que la expresión escrita y que su `getBBox()` nunca se salga del rectángulo del bloque.
- **Cobertura multi-navegador (Chromium y Firefox):** Configurada en `tests/playwright.config.js:19-24` tras detectar problemas reales de selección/arrastre nativo en Firefox (`tests/specs/lienzo.spec.js`).
- **Aislamiento de atajos con modales abiertos (`tests/specs/ventanas.spec.js`):** Verifica que con una ventana abierta (`?`, Tabla de verdad, Mason) las teclas `Supr`, `Ctrl+V`, `Ctrl+Z`, `Ctrl+A`, etc. no modifiquen el diagrama de fondo y que `Ctrl+C` copie el texto seleccionado del modal.

---

### 5.2. Problemas de Correctitud y Falsos Positivos en los Tests Existentes

Varios tests actuales pasan en verde pero contienen errores en sus datos de entrada, aserciones incompletas o puntos ciegos que ocultaron bugs reales:

1. **Falso positivo crítico en `tests/specs/archivos-danados.spec.js:7-36` (no detecta que un archivo inválido destruye el diagrama actual):**
   - El arreglo `MALOS` incluye JSON de otras herramientas (como `'{"nodes":[{"id":"n1","type":"and","x":1,"y":1}],"wires":[...]}'`).
   - El comentario de cabecera (líneas 1-3) dice: *"Un archivo mal armado (a mano, truncado, de otra herramienta) puede avisar que no sirve, pero nunca dejar la herramienta rota"*.
   - Sin embargo, el test sólo verifica `expect(await abrirTexto(page, txt)).toBeNull()`, `expect(errores).toEqual([])` y `Array.isArray(S[k])`.
   - Como el helper `abrirTexto` en `tests/specs/ayudas.js:29-31` atrapa excepciones y devuelve `null` siempre que no haya un `throw`, cuando `diagrama-bloque.html` abre el JSON del simulador y **borra todo el diagrama en pantalla** (BUG-01), el test **pasa en verde** sin enterarse de que la herramienta aceptó un archivo ajeno y vació el lienzo.
2. **Agujero en el test de XSS de `tests/specs/archivos-danados.spec.js:66-105` (nunca selecciona conexiones ni prueba los colores en nodos con ID trampa):**
   - En `DOCS` (líneas 68-86), se arman documentos con `TRAMPA = '"><img src=x onerror="window.__ejecutado=true">'` dentro de:
     - `nodes[0]` con `id: TRAMPA` y `color: { relleno: TRAMPA }`.
     - `edges[0]` con `from: { id: "m", port: "r" }`, `width: TRAMPA` y `color: { flecha: TRAMPA }` (y análogamente `wires[0]` y `ramas[0]`).
   - Hay **dos fallas en ese test**:
     1. Como `nodes[0]` tiene `id: TRAMPA`, `depurarNodos()` descarta el nodo entero por `idValido(n.id)` antes de mirar su color. Por ende, `color: { relleno: TRAMPA }` en `nodes[0]` **jamás llega a probarse**.
     2. En las líneas 91-94, el bucle hace `for (const n of S[k]) { S.sel = [n.id]; render(); }`, pero **nunca selecciona las conexiones** (`S.selEdges = ["e"]`, `S.selW = ["w"]`, `S.selR = ["r"]`). El panel inspector de flechas, cables y ramas —donde se inyectan `e.width`, `e.color.flecha` y `w.color.cable`— **nunca se llega a renderizar durante el test**.
3. **Datos de prueba inválidos en `tests/unidades/logica.test.js:43-52` (pines `"o"` en lugar de `"o0"`):**
   - En el test `"tabla de verdad: una AND de dos entradas"`, los cables se crean con `pin: "o"` (`{ from: { id: "i1", pin: "o" }, to: { id: "g1", pin: 0 } }`).
   - En el modelo real (`src/simulador/tipos.js:32`), ninguna compuerta ni entrada tiene un pin llamado `"o"`; se llaman `"o0"` (y `"o1"`). El test pasa por casualidad porque `simulate()` (`src/simulador/logica.js:33`) evalúa `w.from.pin === "o1" ? 1 : 0`. Si ese circuito pasara por `depurarCables()`, todos sus cables serían eliminados por inválidos.
4. **Espera pasiva innecesaria de ~18 segundos en `tests/specs/comun.spec.js:32-54`:**
   - El test `"el aviso se queda el tiempo suficiente para leerlo y la cruz lo cierra"` espera en tiempo real (~3000 ms) a que se oculte el `#toast`. Al estar en `comun.spec.js`, corre 6 veces (3 herramientas × 2 navegadores), sumando ~18 segundos de espera muerta. Debería usar el reloj simulado de Playwright (`page.clock.install()`) para ejecutarse en milisegundos.
5. **Pausas fijas (`waitForTimeout(600)`) en `tests/specs/bloque.spec.js:228, 231`:**
   - Usa dos esperas fijas de 600 ms para probar que dos clics lentos no abren el editor de doble clic, lo cual también puede resolverse instantáneamente con `page.clock`.

---

### 5.3. Tests Innecesarios, Redundantes o Mal Ubicados

1. **Triple duplicación de las pruebas de Quine–McCluskey (`simplify`), ejecutando lógica pura dentro de navegadores:**
   - `simplify()` (`src/simulador/logica.js:99-192`) es una función **100 % pura** que no toca el DOM.
   - Sin embargo, se prueba en **tres archivos distintos**:
     1. `tests/unidades/logica.test.js:33-41` (en Node, tarda < 5 ms).
     2. `tests/specs/simulador.spec.js:186-240` (abre Chromium y Firefox para correr 376 casos y un benchmark de 10 variables dentro de `page.evaluate()`).
     3. `tests/specs/correccion.spec.js:216-311` (vuelve a abrir Chromium y Firefox para correr otros ~1000 casos dentro de `page.evaluate()`, repitiendo todas las funciones de 1 a 3 variables y muestras de 4 a 7 variables).
   - **Recomendación:** Consolidar todas las pruebas matemáticas de `simplify()` en `tests/unidades/logica.test.js` (donde corren en Node sin levantar navegadores) y dejar en Playwright únicamente la verificación de que la ventana `#ov-truth` muestre la expresión en el DOM.
2. **Duplicación de pruebas de `Ctrl + arrastrar` y `rueda del mouse` en 4 archivos E2E:**
   - El desplazamiento de la hoja con `Ctrl + arrastrar` y con la rueda ya se prueba para las 3 herramientas en `tests/specs/lienzo.spec.js:22-49` y en `tests/specs/comun.spec.js:85-103`.
   - A pesar de ello, está repetido en `tests/specs/bloque.spec.js:326-365`, `tests/specs/simulador.spec.js:173-184` y `tests/specs/senales.spec.js:249-260`. Eliminar las copias individuales reduce el tiempo de suite sin perder cobertura.
3. **Duplicación del test de `"área de impresión"` entre `bloque.spec.js:381-395` y `simulador.spec.js:242-256`:**
   - Ambos bloques de código son idénticos línea por línea y, paradójicamente, faltan en `senales.spec.js`. Deberían ser un único test dentro del bucle de las 3 herramientas en `tests/specs/comun.spec.js`.
4. **Duplicación entre `tests/specs/fuentes.spec.js:16-25` y `tests/specs/humo.spec.js:31-37`:**
   - Ambos verifican con expresiones regulares que los archivos `.html` de la raíz no contengan `<script src>` ni `<link rel="stylesheet">`. En `fuentes.spec.js` se lee directo del disco con `fs.readFileSync`; repetirlo por HTTP en `humo.spec.js` en Chromium y Firefox es redundante.
5. **Prueba de `limpiarNombre()` en `tests/specs/comun.spec.js:105-111`:**
   - Levanta 6 páginas de navegador (3 herramientas × 2 motores) sólo para llamar `page.evaluate(() => limpiarNombre(...))`. Es una función pura de `src/comun/util.js:19-25` ideal para `tests/unidades/`.

---

### 5.4. Tests Faltantes (Huecos de Cobertura)

A continuación se detallan las funcionalidades e interacciones del proyecto que **hoy no tienen ningún test**:

#### A. En Módulos Compartidos (`src/comun/`)
1. **Rechazo de documentos cruzados entre herramientas (BUG-01):**
   - Falta probar que al intentar abrir un JSON/SVG de `simulador-logico` o `diagrama-señales` dentro de `diagrama-bloque` (y todas las combinaciones cruzadas), se muestre el aviso de error y **se preserve intacto el diagrama que estaba en pantalla** y el `undoStack`.
2. **Alineación y distribución de elementos (`src/comun/ortogonal.js:13-35`, BUG-21):**
   - No existe ningún test para `alinear("left" | "right" | "top" | "bottom" | "cx" | "cy" | "dh" | "dv")` ni para los botones `[data-align]` del panel derecho cuando hay múltiples nodos seleccionados.
3. **Recorte de exportación (`bboxAll`) con conexiones que sobresalen de los nodos (BUG-12):**
   - Falta un test donde una flecha o cable tenga un tramo exterior a la caja de los nodos y verifique que el `viewBox` de `buildExportSVG()` no corte el trazo.
4. **Persistencia del autoguardado tras `undo()` / `redo()` sin recargar (BUG-19):**
   - En `inicio.spec.js:66-76`, el test llama a `page.reload()`, lo que dispara el evento `pagehide` (`guardarAhora()`). Falta verificar que `undo()` y `redo()` actualicen `localStorage` a través del temporizador de `autoguardar()` sin depender de `pagehide`.
5. **Validación de `hojaValida()` ante dimensiones negativas/nulas o `preset` inválido (BUG-20).**

#### B. En Diagramas de Bloques (`src/bloque/`)
1. **Archivos con puertos de flecha corruptos o conectados a un `marco` (BUG-02):**
   - Falta un caso en `archivos-danados.spec.js` donde los nodos `from.id` y `to.id` sean válidos pero `port` sea `"zzz"` o `undefined`, o donde una flecha apunte a un nodo de tipo `"marco"`.
2. **Inversión de sentido (`#e-flip`) e invariantes de conexión (BUG-07):**
   - Falta probar el botón `#e-flip` del panel cuando invertir la flecha violaría la regla de entrada única de un bloque, así como las restricciones de entradas en bifurcaciones (`node`), entradas en rótulos (`io`) y flechas hacia patas de sumador sin signo (`""`).
3. **División de flechas al insertar una bifurcación (`splitEdge` en `src/bloque/comandos.js:12-34`, BUG-16):**
   - No hay ningún test que suelte un nodo o una flecha sobre la mitad de otra flecha existente para verificar que `splitEdge()` la parta en dos conservando sus propiedades (estilo punteado, grosor y color).
4. **Cambio de variante de ruta (`#e-reroute`) y restablecimiento de ruta automática (`#e-auto`) desde el panel.**

#### C. En el Simulador de Circuitos Lógicos (`src/simulador/`)
1. **Reloj automático (`modo: "auto"`) corriendo en tiempo real e interacción simultánea con el panel (BUG-04):**
   - Todos los tests actuales avanzan los relojes manualmente por código (`C.on = true; render()`). Falta un test que active el reloj automático (`actualizarReloj()`) y verifique que el circuito evolucione solo **sin destruir el foco de un `<input>` activo en `#insp`**.
2. **Reloj en modo pulso (`pulso()` en `src/simulador/interaccion.js:163-166`, BUG-17):**
   - Falta probar el clic sobre un reloj en modo `"pulso"` (incluyendo dos clics rápidos consecutivos).
3. **Detección de oscilación / lazo inestable (`OSC === true` en `src/simulador/logica.js:67`):**
   - Se prueba que los ejemplos de fábrica tengan `OSC === false`, pero **no hay ningún test** que conecte un lazo inestable (p. ej. una compuerta `NOT` cuya salida vuelve a su propia entrada) y verifique que `OSC` sea `true` y que `#st-sim` avise `"Oscilación / lazo inestable"`.
4. **Tabla de verdad (`truthTable()`) en circuitos con latches (`ff:d-sin`, RS/JK sin reloj) o entradas conectadas a `CLK` (BUG-05).**
5. **Interacción con recuadros (`marco`) en el simulador (BUG-11):**
   - En `bloque.spec.js:49-91` hay 4 tests para seleccionar, mover y redimensionar un `marco`, pero en `simulador.spec.js` no hay ninguno (lo que ocultó que en el simulador los recuadros se dibujan con `agarrable = false` y sin tiradores).
6. **Rotación de compuertas (`R` / `#n-rot`) y cambio de número de entradas (`#n-pins`) con limpieza de cables en patas eliminadas (`src/simulador/panel.js:138-140`).**

#### D. En Diagramas de Flujo de Señales (`src/senales/`)
1. **Creación interactiva de nodos y ramas con el puntero sobre el lienzo (BUG-08):**
   - En `senales.spec.js`, todos los grafos se construyen llamando a `nuevoNodo()` y `nuevaRama()` desde `page.evaluate()`. **No hay ningún test E2E** que haga clic en el lienzo en modo `"nodo"` o arrastre entre dos nodos en modo `"rama"`, curve la rama en el paso `curve-new` y confirme con clic o cancele con `Esc` / cambio de modo.
2. **Selección por banda con `Shift` o en modo selección múltiple (`X`, BUG-09):**
   - Falta verificar que arrastrar una banda en modo `"multi"` o con `Shift` agregue nodos a `S.sel` en vez de sobrescribir la selección previa.
3. **Sanitización de `n.tipo` en `depurarNodos()` (BUG-10):**
   - Falta probar la carga de un JSON con `tipo` ausente/inválido o con múltiples nodos marcados como `"entrada"` o `"salida"`.
4. **Cacheo y límite de seguridad de `analizar()` de Mason en grafos densos (BUG-03).**

---

## 6. Auditoría de Documentación e Higiene del Repositorio

### 6.1. Errores y Desactualizaciones en la Documentación

| Archivo | Líneas | Problema detectado |
| :--- | :--- | :--- |
| `CLAUDE.md` / `README.md` / `.claude/skills/uni-tools/SKILL.md` | `README.md:61, 79`<br>`SKILL.md:16, 312` | **`CLAUDE.md` figura eliminado en el árbol de trabajo (`git status` → `borrados: CLAUDE.md`)**, pero tanto `README.md` como `SKILL.md` siguen enlazándolo como documento principal de arquitectura y convenciones. |
| `tests/README.md` | `17-29`, `51-57` | **Completamente desactualizado respecto a `tests/`:**<br>1. El árbol de archivos lista `specs/ayuda.js`, `specs/portal.spec.js`, `specs/diagrama-bloque.spec.js`, `specs/simulador-logico.spec.js` y `specs/diagrama-senales.spec.js`. **Ninguno de esos 5 archivos existe**; los reales son 13 archivos (`ayudas.js`, `inicio.spec.js`, `bloque.spec.js`, `simulador.spec.js`, `senales.spec.js`, `comun.spec.js`, `correccion.spec.js`, `cortar.spec.js`, `archivos-danados.spec.js`, `fuentes.spec.js`, `humo.spec.js`, `lienzo.spec.js`, `ventanas.spec.js`).<br>2. No menciona la carpeta `tests/unidades/` (`cargar.js`, `ecuaciones.test.js`, `logica.test.js`, `mason.test.js`) ni el script `npm run test:unidades`. |
| `README.md`, `CLAUDE.md`, `.github/workflows/tests.yml` | `README.md:79`<br>`CLAUDE.md:50`<br>`tests.yml:8` | Afirman que el desarrollo se realiza sobre una rama llamada `features` (`branches: [main, features]`), la cual **no existe** en el repositorio local ni remoto (se usan ramas con prefijo como `features/migracion` o `features/análisis`, por lo que el workflow de GitHub Actions no se dispara en `push` a `features/*`). |
| `.github/workflows/tests.yml` | `1` | El comentario de cabecera dice `# Corre las pruebas E2E (Playwright + Chromium)`, cuando en realidad desde la línea 28 instala y ejecuta tanto **Chromium como Firefox**, además de las pruebas unitarias de Node (línea 24). |
| `src/simulador/pagina.html` | `149-165` | En la ventana de ayuda (`?`), la tabla de atajos omite documentar:<br>- `<kbd>B</kbd>`: Compuerta Buffer (`src/simulador/barra.js:48`).<br>- `<kbd>M</kbd>`: Recuadro (`src/simulador/barra.js:50`).<br>- `<kbd>Ctrl+A</kbd>`: Seleccionar todo (`src/comun/teclado.js:23`). |
| `src/senales/pagina.html` | `135-146` | En la ventana de ayuda (`?`), la tabla de atajos omite documentar:<br>- `<kbd>X</kbd>`: Modo selección múltiple (`src/senales/barra.js:35`).<br>- `<kbd>F</kbd>`: Encuadrar todo (`src/senales/barra.js:37`).<br>- `<kbd>Ctrl+A</kbd>`: Seleccionar todo (`src/comun/teclado.js:23`). |
| `src/bloque/pagina.html`, `src/simulador/pagina.html`, `src/senales/pagina.html` | Tablas de ayuda (`?`) | Las tres herramientas aceptan tanto `Delete` (`Supr`) como `Backspace` (`Retroceso`) para borrar la selección (`src/comun/teclado.js:26`), pero las tablas de ayuda sólo mencionan `<kbd>Supr</kbd>`. |
| `.claude/skills/uni-tools/SKILL.md` | `293` | En la tabla comparativa dice que `simulador-logico.html` tiene `selección múltiple: no`. En realidad sí tiene selección múltiple (tanto por banda de arrastre como con `Shift + clic` y `Ctrl+A`); lo único que no tiene es el botón de modo `"Selección múltiple"` en la barra superior. |

### 6.2. Higiene del Repositorio

1. **Imagen binaria pesada y sin uso (`uni-tools-logo.jpg`):**
   - En la raíz del repositorio está versionado `uni-tools-logo.jpg` (**2.03 MB**, resolución 1696×2528), que representa más del **70 % del peso total del repositorio Git**, pero **no es referenciado por ningún archivo HTML, CSS, JS ni Markdown** (la portada `index.html` usa `logo.png`, de 469 KB).
2. **Restos locales en el directorio de trabajo raíz:**
   - Existen en el disco local `/node_modules/` (51 paquetes remanentes de la rama `features/migracion`) y `/test-results/` en la raíz (ignorados por `.gitignore`, pero ajenos a la estructura de esta rama donde las dependencias de prueba viven únicamente en `tests/node_modules/`).

---

## 7. Plan de Mejoras Propuestas (Hoja de Ruta)

Todas las mejoras propuestas respetan estrictamente la **regla de oro del proyecto**: mantener las páginas `.html` de la raíz 100 % autocontenidas, sin dependencias externas ni pasos de compilación complejos más allá de `node src/construir.js`.

### Fase 1: Correcciones Críticas de Integridad de Datos y Estabilidad (Prioridad Inmediata)

1. **Identificación de herramienta al guardar y abrir (`src/comun/documento.js`):**
   - Agregar `herramienta: HERRAMIENTA.clave` en `docDatosBase()` (`src/comun/documento.js:5`).
   - En `abrirTexto()` (`src/comun/documento.js:44`), comprobar:
     ```js
     const otraConexion = (HERRAMIENTA.conexiones === "edges" && Array.isArray(d.wires))
                       || (HERRAMIENTA.conexiones === "wires" && Array.isArray(d.edges));
     if (!d || typeof d !== "object" || (d.herramienta && d.herramienta !== HERRAMIENTA.clave)
         || otraConexion || !Array.isArray(d[HERRAMIENTA.nodos])) {
       toast(HERRAMIENTA.textos.noEsDoc); return;
     }
     ```
2. **Validación estricta de puertos y nodos en `depurarFlechas()`, `depurarNodos()` y `hojaValida()`:**
   - En `src/bloque/modelo.js:61`: exigir `PUERTOS.includes(e.from.port) && PUERTOS.includes(e.to.port)` y que ningún extremo sea `"marco"`.
   - En `src/senales/modelo.js:66`: validar `["entrada", "normal", "salida"].includes(n.tipo)` (por defecto `"normal"`) y asegurar unicidad de `"entrada"` y `"salida"`.
   - En `src/simulador/modelo.js:58`: sanitizar `n.pins` (filtrando sólo cadenas válidas), `n.salida`, `n.salidaNeg` y `n.rot`.
   - En `src/comun/hoja.js:16`: exigir `h.w > 0 && h.h > 0 && (h.preset in HOJAS)`.
3. **Aislamiento de estado por fila en `truthTable()` (`src/simulador/logica.js:82-97`):**
   - Clonar los nodos (o restablecer `q`, `clkPrev` y `clkArranque` a sus valores originales) dentro de cada iteración `m` del bucle de la tabla de verdad.
4. **Proteger el foco del panel derecho durante el reloj automático (`src/simulador/interaccion.js` y `src/simulador/panel.js`):**
   - En `actualizarReloj()` (`src/simulador/interaccion.js:173`), pasar un parámetro o evitar que `renderInspector()` pise `box.innerHTML` cuando el panel ya está mostrando el elemento seleccionado o tiene un control con foco (`box.contains(document.activeElement)`).

### Fase 2: Rendimiento y Saneamiento del Ciclo `commit() / render()` (Corto Plazo)

1. **Cachear `analizar()` de Mason y desacoplarlo del arrastre geométrico (`src/senales/mason.js`, `src/senales/panel.js`):**
   - Guardar el último resultado de `analizar()` asociado a una clave topológica (`JSON.stringify([S.nodos.map(n => [n.id, n.nombre, n.tipo]), S.ramas.map(r => [r.id, r.de, r.a, r.g])])`). Mientras sólo cambien `x`, `y` o `curva` durante un arrastre, `analizar()` devolverá el resultado en $O(1)$ sin recalcular caminos ni ciclos.
   - Añadir un tope de seguridad en `lazos()` y `combinacionesDisjuntas()` para evitar que un grafo completo de muchos nodos congele la pestaña.
2. **Ordenar el ciclo de actualización de modelo vs vista:**
   - Extraer `actualizarTamaños()` y `routeAll()` / `acomodarRamas()` para que se ejecuten antes de tomar el `snapshot()` en `commit()`, o bien omitir propiedades derivadas (`e.pts` cuando `!e.manual`, `r.curva` automática) en `docDatos()` y `snapshot()`.
   - Añadir `autoguardar()` al final de `undo()` y `redo()` (`src/comun/historial.js:15-24`).
3. **Evitar redibujados completos del SVG en `pointermove` sin arrastre:**
   - Al cambiar `hoverNode` o `hoverSeg`, alternar únicamente una clase CSS (`.hover`) sobre el `<g class="node">` o el segmento correspondiente en lugar de vaciar y reconstruir todo el lienzo y el panel derecho.
4. **Acotar cachés de ecuaciones (`src/bloque/ecuaciones.js`):**
   - Si `_mcache.size > 500` o `_bcache.size > 500`, eliminar la primera entrada (`cache.delete(cache.keys().next().value)`).

### Fase 3: Consistencia Funcional y de Interfaz entre las Tres Herramientas (Mediano Plazo)

1. **Completar las reglas de conexión en `diagrama-bloque` (`src/bloque/`):**
   - Incorporar las reglas completas de validez de entradas/salidas, signos de sumador y lazos con sumador (como en `520e9a1`), incluyendo la validación al pulsar `#e-flip` ("Invertir sentido") en `src/bloque/panel.js:163`.
2. **Paridad de recuadros (`marco`) en `simulador-logico`:**
   - Activar `dibujarMarco(g, n, true)` en `src/simulador/dibujo.js:34` y mover `renderHandles()` y la lógica de redimensionamiento/creación por arrastre de `src/bloque/` hacia `src/comun/recuadros.js` para que funcione igual en ambas herramientas.
3. **Incluir cables y flechas en `bboxAll()` (`src/comun/ortogonal.js:5-11`):**
   - Considerar todos los puntos `pts` de `S[HERRAMIENTA.conexiones]` al calcular el recorte de exportación y el encuadre (`fit()`).
4. **Correcciones puntuales de UI e interacción:**
   - Eliminar `.signbox .mid::before,.signbox .mid::after{top:50%}` en `src/bloque/estilos.css:20` (BUG-14).
   - Eliminar el `</head>` duplicado en `src/bloque/pagina.html:14` (BUG-15).
   - Copiar `color` en `splitEdge()` (`src/bloque/comandos.js:29`, BUG-16).
   - Confirmar y cerrar `curve-new` al cambiar de modo o pulsar `Esc` en `diagrama-señales` (BUG-08), y respetar `sumandoALaSeleccion(ev)` en la banda de selección de `diagrama-señales` (BUG-09).

### Fase 4: Saneamiento de la Suite de Pruebas, Documentación e Higiene del Repositorio

1. **Corregir falsos positivos y errores en los tests actuales:**
   - En `tests/specs/archivos-danados.spec.js`: verificar que tras intentar abrir un archivo inválido o de otra herramienta, el diagrama previo se mantenga intacto (`S[clave]` no se vacíe), y en la prueba de XSS seleccionar también las conexiones (`S.selEdges`, `S.selW`, `S.selR`) y usar IDs válidos en los nodos que llevan colores/números trampa.
   - En `tests/unidades/logica.test.js:47-49`: corregir `pin: "o"` por `pin: "o0"`.
   - En `tests/specs/comun.spec.js:32-54` y `tests/specs/bloque.spec.js:228-231`: reemplazar las esperas en tiempo real por `page.clock` para ahorrar ~20 segundos por corrida.
2. **Eliminar redundancias y mover pruebas puras a `tests/unidades/`:**
   - Unificar las pruebas exhaustivas de `simplify()` (hoy triplicadas en `logica.test.js`, `simulador.spec.js` y `correccion.spec.js`) dentro de `tests/unidades/logica.test.js`, y mover `limpiarNombre()` a `tests/unidades/`.
   - Eliminar los tests duplicados de `Ctrl + arrastrar` / rueda del mouse y de `"área de impresión"` en `bloque.spec.js`, `simulador.spec.js` y `senales.spec.js`, dejándolos parametrizados una sola vez en `comun.spec.js` / `lienzo.spec.js`.
3. **Incorporar los tests faltantes (Sección 5.4):**
   - Agregar tests para `alinear()`, `splitEdge()`, `#e-flip`, puertos corruptos, oscilación (`OSC === true`), reloj automático sin perder foco en `#insp`, doble clic rápido en reloj de pulso, recuadros (`marco`) en el simulador, y creación interactiva de ramas (`curve-new`) y banda con `Shift` en `diagrama-señales`.
4. **Restaurar o actualizar referencias a `CLAUDE.md`:**
   - Restaurar `CLAUDE.md` (`git checkout -- CLAUDE.md`) o, si se decide prescindir de él, eliminar los enlaces rotos en `README.md` y `.claude/skills/uni-tools/SKILL.md`.
5. **Actualizar `tests/README.md` y `.github/workflows/tests.yml`:**
   - Documentar los 13 archivos reales de `tests/specs/` y la carpeta `tests/unidades/` (`npm run test:unidades`).
   - En `.github/workflows/tests.yml:8`, cambiar `branches: [main, features]` por `branches: [main, 'features/**']` y actualizar el comentario de cabecera para mencionar Chromium, Firefox y las pruebas unitarias.
6. **Completar las tablas de atajos en las ventanas de ayuda (`?`):**
   - Agregar `B`, `M`, `Ctrl+A` y `Retroceso` en `src/simulador/pagina.html`; agregar `X`, `F`, `Ctrl+A` y `Retroceso` en `src/senales/pagina.html`; agregar `Retroceso` en `src/bloque/pagina.html`.
7. **Limpieza del repositorio:**
   - Eliminar `uni-tools-logo.jpg` (2.03 MB sin uso) del seguimiento de Git y borrar las carpetas locales huérfanas `/node_modules` y `/test-results` de la raíz.
