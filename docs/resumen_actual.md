# Resumen Integral del Estado Actual del Código (uni-tools)

Este documento contiene el relevamiento técnico y análisis arquitectónico exhaustivo del repositorio previo al inicio de la migración y la adopción de **Spec-Driven Development (SDD)**.

---

## 1. Visión General del Proyecto

`uni-tools` es una suite de aplicaciones web de escritorio-en-el-navegador orientada a materias de ingeniería (Sistemas de Control, Electrónica Digital, Teoría de Circuitos).
Se publica como sitio estático vía GitHub Pages (originalmente servido desde `main`).

El repositorio comprende **4 páginas principales**:
1. **`index.html`**: Portada de acceso rápido. Muestra el estado de autoguardado en `localStorage` de cada una de las tres herramientas y provee accesos directos.
2. **`diagrama-bloque.html`**: Editor de diagramas de bloques (funciones de transferencia de control, sumadores/restadores con signos configurables, bifurcaciones, etiquetas I/O, marcos de agrupación, ruteo ortogonal de conexiones con flechas y tipógrafo de ecuaciones estilo LaTeX).
3. **`simulador-logico.html`**: Simulador interactivo de circuitos lógicos combinacionales y secuenciales (compuertas básicas, biestables/flip-flops síncronos y asíncronos, semisumadores y sumadores completos, simulación en tiempo real, generador de tablas de verdad y minimización de funciones booleanas vía Quine-McCluskey).
4. **`diagrama-señales.html`**: Editor y analizador de grafos de flujo de señales (SFG - Signal Flow Graphs). Modela nodos y ramas con transmitancias ($G_i$, $H_i$), resuelve la función de transferencia mediante la **Regla de Ganancia de Mason** (lazos, trayectorias, determinantes $\Delta$ y cofactores $\Delta_i$, simbólicos y numéricos), genera el sistema de ecuaciones nodales y sintetiza un diagrama de bloques equivalente exportable.

---

## 2. Arquitectura de Construcción y Empaquetado Actual

### 2.1 La regla de diseño original: HTML monolíticos autocontenidos
El proyecto original se concibió bajo la regla estricta de que cada herramienta distribuida debe ser **un único archivo `.html` autocontenido** (HTML + CSS + JavaScript inline sin dependencias externas ni CDNs) para permitir ejecución offline directa (doble clic en archivo local o pendrive).

### 2.2 Sistema de ensamblado (`src/construir.js`)
Para no duplicar código entre herramientas, las fuentes se separaron en `src/` y se compilan a la raíz mediante un script Node.js pelado (`src/construir.js`):
- Procesa directivas estilo:
  - `<!-- @incluir ruta/archivo.html [param="valor"] -->`
  - `/* @incluir ruta/archivo.css */`
  - `// @incluir ruta/archivo.js`
- Realiza interpolación de parámetros `{{param}}`.
- Valida que no existan saltos de línea CRLF (exige terminaciones LF).
- Valida consistencia con el flag `--comprobar`.

### 2.3 Problemas críticos detectados en el sistema actual
1. **Divergencia entre `src/` y la raíz**: En commits recientes (ej. `46402a1`), se editaron directamente los archivos `.html` de la raíz sin sincronizar los módulos en `src/`. Al ejecutar `node src/construir.js --comprobar`, la verificación falla por inconsistencia.
2. **Ámbito global compartido (Namespace Pollution)**: La compilación pega todos los módulos `.js` dentro de un único bloque `<script>` plano. Todas las variables (`S`, `VAL`, `DEF`, etc.) y funciones se declaran en el scope global `window`. El sistema depende críticamente del orden manual de inclusión en `pagina.html` para evitar errores `ReferenceError / Cannot access before initialization`.
3. **Re-renderizado destructivo total**:
   En todas las herramientas, la función `render()` ejecuta:
   ```js
   gAtras.textContent = ""; gEdges.textContent = ""; gNodes.textContent = ""; gOv.textContent = "";
   ```
   Borra todo el árbol DOM SVG y lo recrea desde cero iterando sobre el estado global `S`. Esto:
   - Destruye cualquier referencia a elementos DOM nativos.
   - Rompe eventos nativos como `dblclick` del navegador (se tuvo que reimplementar un listener sintético con temporizador a mano en `comun/doble-clic.js`).
   - Genera sobrecarga de recálculo y repintado geométrico continuo.
4. **Acoplamiento UI - Lógica de Dominio**: Algoritmos matemáticos de alto valor (análisis de Mason, minimización booleana, ruteo ortogonal) están entrelazados con llamadas directas al DOM (`document.getElementById`, `toast()`, manipulación de SVG y CSS).

---

## 3. Desglose Módulo por Módulo

### 3.1 Núcleo Común (`src/comun/`)
Código compartido entre las herramientas:
- **`lienzo.js`**: Declaración del namespace SVG (`NS`), funciones auxiliares de selección (`$`), creación de elementos SVG (`el`), escape de texto HTML (`esc`) y notificaciones flotantes (`toast`).
- **`ids.js`**: Generador determinístico de identificadores únicos (`uid(prefijo)`), corrector de IDs duplicados (`sanearIds`) y búsqueda de nodos.
- **`documento.js`**:
  - Serialización de documentos (`docDatos`).
  - Lector de archivos JSON y SVG (`abrirTexto`, `datosDeSVG`). Los archivos SVG exportados incrustan el JSON del proyecto en una etiqueta `<metadata id="uni-tools-datos">`, permitiendo reabrir el vector como documento editable.
  - Exportación gráfica a SVG y renderizado a PNG a escala $3\times$ mediante un elemento `<canvas>` temporal.
- **`historial.js`**: Implementación de pila de deshacer/rehacer (`snapshot()`, `commit()`, `undo()`, `redo()`). Almacena serializaciones completas en memoria; lo que no esté en `snapshot()` no sobrevive al deshacer.
- **`portapapeles.js`**: Operaciones de selección, corte, copia, pegado y duplicación (`tomarSeleccion`, `copiarSel`, `cortarSel`, `pegarSel`, `duplicar`, `borrar`).
- **`vista.js` & `tactil.js`**: Transformación de coordenadas de pantalla a espacio mundo (`toWorld`), encuadre automático (`fit`), paneo con mouse/espacio/gestos táctiles con un dedo, zoom por rueda y pellizco con dos dedos.
- **`doble-clic.js`**: Detección manual de doble puntero para habilitar edición de texto inline (`<input>` flotante sobre el SVG).
- **`teclado.js`**: Manejador central de teclas rápidas (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Ctrl+D`, `Supr`, `?`, etc.) con bloqueo automático si hay modales o diálogos abiertos (`.overlay.show`).
- **`panel.js`**: Utilidades para el inspector lateral con soporte para edición en vivo (`enVivo`) y bloqueo de redibujado durante la escritura (`lock`).
- **`autoguardado.js`**: Debounce de 400ms tras cada `commit()` para guardar en `localStorage` (`uni-tools-autoguardado-...`) y eventos de ciclo de vida (`pagehide`, `visibilitychange`, `beforeunload`).
- **`ortogonal.js`**: Algoritmo de ruteo ortogonal en ángulo recto (A* heurístico con penalizaciones por cruces, dobleces y colisiones con cajas `rectOf`).
- **`colores.js`, `hoja.js`, `recuadros.js`**: Paletas de temas, delimitadores de hojas de impresión estándar (A4, etc.) y contenedores visuales de agrupación ("marcos").

---

### 3.2 Diagrama de Bloques (`src/bloque/`)
- **`modelo.js`**: Definición de entidades: `block`, `sum`, `node` (bifurcación), `io`, `text`, `marco`. Sanitización estricta al importar (`depurarNodos`, `depurarFlechas`).
- **`ecuaciones.js`**:
  - Tokenizador léxico (`fichas`) que procesa números, identificadores, comandos LaTeX (`\frac`, griegos `\alpha`, `\omega`, etc.) y operadores.
  - Parser de expresiones con precedencia formal (`expr`, `termino`, `factor`, `atomo`).
  - Manejo de fracciones multinivel, subíndices, superíndices y paréntesis escalables.
  - Motor de cajas tipográficas (`cajaFila`, `cajaDe`) que calcula la caja de límite (`up`, `down`, `w`) midiendo texto en un nodo oculto del SVG (`gMeasure`) y genera la geometría vectorial SVG correspondiente.
  - Autoajuste dinámico de las dimensiones de los bloques (`actualizarTamaños`) para contener confortablemente la ecuación.
- **`ruteo.js`**: Generación de candidatos de ruteo ortogonal entre puertos (`l`, `r`, `t`, `b`), variantes alternativas cíclicas y persistencia de desvíos manuales definidos por el usuario (`e.manual.c`).
- **`dibujo.js`**: Renderizado de nodos, flechas con puntas SVG markers, uniones de bifurcación (`junctionDots`), puertos interactivos y tiradores de estiramiento y de segmentos.
- **`interaccion.js`**: Máquina de estados de interacción en el lienzo: arrastrar elementos, estirar esquinas, mover segmentos de flecha ortogonal, trazar conexiones punto a punto, caja de selección múltiple (banda).

---

### 3.3 Simulador Lógico (`src/simulador/`)
- **`tipos.js`**: Catálogo de compuertas (`and`, `or`, `not`, `nand`, `nor`, `xor`, `xnor`, `buf`), entradas (`in`), reloj (`clk`), salidas (`out`), biestables (`ff` tipo D, JK, T, SR) y sumadores aritméticos (semisumador y sumador completo).
- **`modelo.js`**: Estructuras de datos para nodos y cables (`wires`). Validación de topología de pines de entrada y salida (`depurarCables`).
- **`logica.js`**:
  - `simulate(nodes, wires, prev)`: Motor de simulación en dos pasos:
    1. Propagación combinacional iterativa con límite de 60 ciclos para detectar oscilaciones.
    2. Evaluación secuencial por flanco de subida en biestables sincronizados por reloj (recursión de hasta 16 niveles para contadores en cascada) seguido de re-estabilización combinacional.
  - `truthTable()`: Generación exhaustiva de la tabla de verdad evaluando los $2^N$ estados de las entradas (tope de 10 entradas).
  - `simplify(minterms, n, nombres)`: Motor de minimización booleana:
    - Fase 1: Identificación de implicantes primos mediante el algoritmo de Quine-McCluskey.
    - Fase 2: Extracción de implicantes primos esenciales.
    - Fase 3: Algoritmo goloso de cobertura como cota inicial + búsqueda exacta con poda de costo mínimo (términos y literales) protegida por un timeout estricto de 150ms.
- **`panel.js` & `tabla.js`**: Renderizado del inspector de componentes y visualización modal interactiva de la tabla de verdad y función simplificada.

---

### 3.4 Diagrama de Señales (`src/senales/`)
- **`modelo.js`**: Nodos con convención alfabética (`a`, `b`, ... `z`, `a1`, etc., excluyendo letras reservadas $c, g, h, r$). Ramas dirigidas con asignación automática de nombres de transmitancia ($G$ hacia adelante, $H$ hacia atrás).
- **`mason.js`**:
  - `trayectorias(desde, hasta)`: Búsqueda exhaustiva por backtracking de todos los caminos simples entre el nodo de entrada y el nodo de salida.
  - `lazos()`: Búsqueda de todos los ciclos simples del grafo dirigidos, normalizados iniciando en el nodo de menor índice.
  - `combinacionesDisjuntas(ls)`: Agrupación de lazos disjuntos de orden 2, 3, etc. que no comparten nodos.
  - `determinante(ls)`: Cálculo formal de $\Delta = 1 - \sum L_i + \sum L_j L_k - \dots$.
  - `analizar()`: Cálculo de cofactores $\Delta_i$ por cada trayectoria $P_i$ (subgrafo de lazos que no tocan a $P_i$). Entrega la solución simbólica y numérica.
  - `ecuaciones()`: Derivación del sistema algebraico de ecuaciones lineales nodales.
- **`equivalente.js`**:
  - Algoritmo sintetizador que transforma el grafo de flujo de señales en un diagrama de bloques completo:
    - Convierte sumas nodales en bloques sumadores (con soporte de encadenamiento para más de 3 entradas).
    - Asigna ganancias a bloques y calcula niveles de altura de arcos hacia adelante y realimentaciones por debajo.
    - Exporta el resultado en formato JSON directamente compatible con `diagrama-bloque.html`.

---

## 4. Estado de las Pruebas Automatizadas (`tests/`)

El repositorio cuenta con una suite E2E armada con **Playwright**:
- `humo.spec.js`: Carga básica sin errores de consola ni peticiones de red externas.
- `correccion.spec.js`: **Pruebas de corrección matemática de alta importancia**:
  - Contrasta la fórmula de Mason contra la resolución exacta e independiente del sistema algebraico lineal de ecuaciones.
  - Verifica la minimalidad de las simplificaciones booleanas.
  - Valida el comportamiento de flip-flops y latches contra modelos teóricos.
  - Comprueba que las ecuaciones tipografiadas preserven la sintaxis de fracciones, exponentes y subíndices LaTeX.
- `bloque.spec.js`, `simulador.spec.js`, `senales.spec.js`: Flujos funcionales de cada herramienta.
- `archivos-danados.spec.js`: Tolerancia a archivos corruptos, truncados o maliciosos.
- `fuentes.spec.js`: Asegura que los HTML de la raíz coincidan con la compilación de `src/construir.js`.

---

## 5. Diagnóstico de Fragilidad y Deuda Técnica

| Área | Estado Actual | Riesgo / Limitación |
|---|---|---|
| **Sistema de Tipos** | JavaScript Vanilla sin tipos. Objetos dinámicos mutables sin esquemas formales. | Errores en tiempo de ejecución al manipular propiedades de nodos, ramas o conexiones. |
| **Arquitectura de Módulos** | Concatenación plana mediante script ad-hoc (`src/construir.js`) a scope global. | Imposibilidad de usar imports ES estándar, análisis estático de dependencias, tree-shaking o tests unitarios aislados. |
| **Sincronización Raíz / Fuentes** | Se editan archivos en la raíz por error, sobreescribiendo o desfasando `src/`. | Pérdida de código o fallos en CI/CD (`fuentes.spec.js`). |
| **Motor de Renderizado** | SVG destructivo total (`innerHTML = ""` en cada evento de mouse o tipeo). | Pérdida de foco, degradación de performance con circuitos grandes, imposibilidad de animaciones fluidas o diffing. |
| **Seguridad / Sanitización** | Concatenación de strings en templates HTML (`innerHTML`, plantillas de atributos). | Riesgo potencial de inyección al importar archivos SVG o JSON externos no verificados. |
| **Testing del Core** | Todos los tests dependen de levantar navegadores Chromium/Firefox vía Playwright. | No hay tests unitarios rápidos en Node para algoritmos puros (Mason, Quine-McCluskey, parser de ecuaciones, ruteo ortogonal). |

---

## 6. Propuesta para el Entorno de Spec-Driven Development (SDD)

Para transformar este proyecto en una base de código robusta, escalable y mantenible, se propone implementar la metodología **Spec-Driven Development**:

### 6.1 Principios de SDD para uni-tools
1. **La Especificación Precede al Código**:
   Cada módulo, formato de archivo o algoritmo debe tener un archivo de especificación en `specs/` (ej. `specs/core/mason.spec.md`, `specs/storage/format-schema.spec.md`) que detalle:
   - Entradas, salidas e invariantes matemáticas.
   - Casos borde y manejo de fallos.
   - Definición de esquemas de datos (TypeScript Interfaces / Zod Schemas).
2. **Separación Estricta Núcleo de Dominio vs. Presentación**:
   - **`packages/core` o `src/core/`**: Motores de cálculo 100% desacoplados del DOM:
     - Motor de Mason (cálculo de trayectorias, lazos, determinantes).
     - Simulador lógico (redes combinacionales, evaluación secuencial de reloj).
     - Tipógrafo matemático (lexer, parser AST, cálculo de layout de cajas agnóstico a SVG).
     - Optimizador y minimizador Quine-McCluskey.
     - Algoritmo de ruteo ortogonal A*.
     - Esquemas de serialización (JSON/SVG metadata).
   - **`src/ui/` o Capa de Presentación**: Canvas/SVG, interacción, gestos, inspectors, modales.
3. **Pirámide de Pruebas Automatizada**:
   - **Nivel 1 (Unitario Rápido)**: Pruebas matemáticas puras en milisegundos con Vitest / Node test runner para el Core (sin navegador).
   - **Nivel 2 (Integración / Contrato)**: Verificación de esquemas de guardado/apertura entre versiones.
   - **Nivel 3 (E2E / Visual)**: Playwright para comprobar interacciones de usuario, gestos táctiles y renderizado SVG final.
4. **Build Estático Moderno y Tipado**:
   - Migración a **TypeScript** estricto (`strict: true`).
   - Uso de un bundler estático moderno (como **Vite**) configurado para producir compilados estáticos optimizados (pudiendo mantener el despliegue estático offline en GitHub Pages sin perder ergonomía de desarrollo moderno).

---
*Documento generado en rama `features/migracion` como línea base para el proceso de especificación y re-arquitectura.*
