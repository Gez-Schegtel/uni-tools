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

## 3. Ruteo Ortogonal de Cables

* **Ángulos Rectos (90°):** Los cables nunca se dibujan como líneas diagonales directas. Utilizan ruteo ortogonal Manhattan con esquinas redondeadas (radio de curvatura $6\text{px}$).
* **Estado Lógico Energizado:**
  * Si la señal que viaja por el cable es `1` (High), el cable se colorea de verde esmeralda brillante (`#22c55e`, stroke-width $2.5\text{px}$) con resalte sutil.
  * Si la señal es `0` (Low), el cable se colorea de azul pizarra (`#64748b`, stroke-width $2\text{px}$).
* **Interactividad del Cable:**
  * Al hacer clic en un cable, se selecciona (anillo de resalte celeste/azul).
  * Se puede borrar con la tecla `Supr` / `Backspace`.
