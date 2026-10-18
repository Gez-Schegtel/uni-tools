# Especificaciones del Simulador Lógico

Este directorio contiene las especificaciones para el diseño, simulación y optimización de circuitos lógicos.

## Alcance del Módulo

1. **Catálogo de Componentes Lógicos (`components.spec.md`):**
   - Compuertas combinacionales estándar: `AND`, `OR`, `NOT`, `NAND`, `NOR`, `XOR`, `XNOR`, `BUFFER`.
   - Elementos secuenciales / biestables: Latches y Flip-Flops `D`, `JK`, `T`, `SR` (con y sin reloj sincrónico por flanco de subida, con pines invertibles).
   - Bloques aritméticos: Semisumador (Half Adder) y Sumador Completo (Full Adder).
   - Fuentes de entrada: Conmutadores lógicos (`in`), generadores de pulso / reloj (`clk`).
   - Salidas: Sondas lógicas / indicadores de estado (`out`).

2. **Motor de Simulación en Dos Fases (`simulation-engine.spec.md`):**
   - **Fase 1 (Combinacional):** Propagación topológica iterativa de estados lógicos con detección de ciclos de oscilación metaestables (límite de iteraciones).
   - **Fase 2 (Secuencial):** Detección de flancos activos de reloj (`clk`), actualización de estados internos $Q$ y propagación en cascada.

3. **Análisis y Tabla de Verdad (`truth-table.spec.md`):**
   - Generación exhaustiva de los $2^N$ estados de entradas vs. salidas (con salvaguarda para $N \le 10$).
   - Detección de oscilación por fila.

4. **Motor de Minimización Booleana (`logic-minimizer.spec.md`):**
   - Algoritmo de Quine-McCluskey para determinar implicantes primos.
   - Selección de implicantes primos esenciales.
   - Búsqueda exacta de cobertura mínima con cota golosa heurística y poda por límite de tiempo de ejecución (150ms) para evitar bloqueo de la UI.
