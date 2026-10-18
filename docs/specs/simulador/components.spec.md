# Especificación de Componentes, Pines y Renderizado del Simulador Lógico

**Estado:** Aprobado  
**Fecha:** 2026-10-18  
**Módulo:** `simulador/components`  
**Implementación:** `src/ui/Canvas.svelte`, `src/ui/canvas/geometry.ts`, `src/core/logic/simulator.ts`

---

## 1. Catálogo Visual de Componentes Lógicos

El simulador implementa el estándar gráfico ANSI/IEEE para esquemáticos digitales:

### 1.1 Compuertas Combinacionales
* **AND:** Cuerpo con espalda recta a la izquierda y semicírculo convexo a la derecha ($w=60, h=44$).
* **NAND:** AND con burbuja de inversión de radio $3.5\text{px}$ en el pin de salida.
* **OR:** Espalda cóncava a la izquierda, arcos superiores e inferiores que convergen en punta afilada en la derecha ($w=62, h=46$).
* **NOR:** OR con burbuja de inversión en el pin de salida.
* **XOR:** OR con un arco curvo adicional desfasado $6\text{px}$ a la izquierda.
* **XNOR:** XOR con burbuja de inversión en el pin de salida.
* **NOT (Inversor):** Triángulo equilátero horizontal apuntando a la derecha con burbuja de inversión en el vértice de salida ($w=48, h=36$).
* **BUFFER:** Triángulo equilátero horizontal sin burbuja de inversión.

### 1.2 Biestables y Flip-Flops (Secuenciales)
Encapsulado tipo circuito integrado (rectángulo limpio con esquinas redondeadas $4\text{px}$, $w=100, h=82..108$ según cantidad de pines):
* **Pines de Entrada (Izquierda):**
  * `D`: Entrada de datos `D` y reloj `CLK`.
  * `T`: Entrada de conmutación `T` y reloj `CLK`.
  * `JK`: Entrada `J`, reloj `CLK`, y entrada `K`.
  * `SR`: Entrada `S`, reloj `CLK`, y entrada `R`.
* **Notch de Reloj:** El pin de `CLK` incluye un triángulo indicador dinámico ($\blacktriangleright$) en el borde interno del componente.
* **Pines de Salida (Derecha):**
  * Salida normal $Q$.
  * Salida complementada $\overline{Q}$ con barra superior y opcionalmente burbuja de inversión.

### 1.3 Entradas y Salidas Interactivas (I/O)
* **Interruptor de Entrada (`in`):**
  * Rectángulo estilo conmutador toggle con indicador de estado `0` / `1`.
  * Al hacer clic directamente sobre el botón, conmuta su estado (`node.on = !node.on`) y recalcula la simulación instantáneamente.
  * Pin de salida a la derecha con stub.
* **Sonda / LED de Salida (`out`):**
  * Círculo/cápsula con indicador LED.
  * Cuando el valor recibido es `1` (High), se ilumina con halo verde esmeralda (`#22c55e`) y fondo brillante.
  * Cuando el valor es `0` (Low), permanece en gris pizarra oscuro apagado (`#334155`).
  * Muestra el dígito `0` o `1` en su centro y la etiqueta del nodo debajo.
* **Generador de Reloj (`clk`):**
  * Indicador de señal periódica cuadrada. Conmutable por clic o configurable en frecuencia.

---

## 2. Sistema de Pines y Conexión Interactiva

### 2.1 Identificación de Pines
Cada componente expone una lista formal de pines accesibles:
* **Entradas:** `in:0`, `in:1`, etc. (coordenadas relativas a la izquierda con stub de $10\text{px}$).
* **Salidas:** `out:0` (o `o`), `out:1` (`o1`).
* Cada pin cuenta con un área de captura táctil/mouse de radio $9\text{px}$.

### 2.2 Hover y Feedback Visual
* Al pasar el cursor (`hover`) sobre cualquier componente o pin, se revelan todos los pines con anillos concéntricos brillantes (`var(--accent)`).
* Al pasar sobre un pin específico, se amplía a radio $5.5\text{px}$ con cursor `crosshair` o `pointer`.

### 2.3 Creación de Conexiones (Drag-and-Drop y Click-Click)
1. **Arrastre desde Pin:** Al presionar y arrastrar desde cualquier pin de salida (`out`), se inicia el trazo dinámico de un cable ortogonal con línea discontinua hacia el cursor.
2. **Soltar en Pin Compatible:** Si se suelta sobre un pin de entrada (`in`), se crea inmediatamente el enlace `{ from: { id, pin }, to: { id, pin } }`.
3. **Modo Conexión (`C`):** Al activar el modo conexión en la barra de herramientas, hacer clic en un componente o pin y luego en otro establece la conexión automáticamente.

---

## 3. Ruteo Ortogonal de Cables, Manipulación y Bifurcaciones

### 3.1 Ángulos Rectos Cuadrados (Sharp 90°)
* Los cables se trazan exclusivamente como **líneas ortogonales cuadradas a 90°** sin esquinas redondeadas (radio de curvatura $0\text{px}$), siguiendo el estándar industrial CAD de esquemáticos digitales.

### 3.2 Manipulación de Tramos y Segmentos de Cable
* Cada conexión se compone de tramos ortogonales alternados (horizontales y verticales).
* Al pasar el cursor o seleccionar un cable, cada segmento expone una manija interactiva en su punto medio:
  * **Tramos verticales:** Cursor `ew-resize`. Arrastrar el tramo modifica su posición horizontal ($X$), desplazando el quiebre de la línea con snap a la grilla.
  * **Tramos horizontales:** Cursor `ns-resize`. Arrastrar el tramo modifica su posición vertical ($Y$), permitiendo desviar el cable por arriba o abajo de otros elementos.
* Los desplazamientos manuales se persisten en las propiedades `manualMidX` y `manualMidY` de la conexión.

### 3.3 Bifurcaciones desde Cables y Esquinas (Junction Dots)
* Cualquier esquina (vértice a 90°) o punto de un cable existente actúa como un punto de anclaje para ramificaciones:
  * Al hacer clic y arrastrar desde una esquina o manija de bifurcación, se abre una nueva conexión rama.
  * En el punto de derivación se renderiza un punto de bifurcación / soldadura (`●`, radio $4.5\text{px}$) del color del estado lógico del cable.
  * La conexión ramificada hereda el nodo y pin origen del cable padre (`from.id`, `from.pin`, `branchFrom`, `branchPt`), asegurando que la propagación del voltaje sea exactamente la misma en todas las ramas conectadas.

### 3.4 Propagación Lógica en Bifurcaciones y Nodos Passthrough
* Tanto los puntos de bifurcación en cable como los nodos discretos de bifurcación (`node`) operan como conductores ideales transparentes (`evalGate("node") = entrada[0]`).
* Cualquier cambio en el interruptor de entrada o compuerta origen se propaga de manera instantánea a todos los cables ramificados, compuertas receptoras y sondas de salida conectadas.

