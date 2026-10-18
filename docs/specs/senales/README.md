# Especificaciones del Diagrama de Flujo de Señales (SFG)

Este directorio contiene las especificaciones para la modelización, análisis mediante la regla de Mason y síntesis de equivalentes en diagramas de bloques.

## Alcance del Módulo

1. **Modelo del Grafo de Señales (`graph-model.spec.md`):**
   - Nodos de señal con nomenclatura alfabética automática (`a`, `b`, ... `z`, `a1`...) reservando variables especiales ($r$ para entrada, $c$ para salida, $g, h$ para transferencias).
   - Ramas dirigidas con transmitancias/ganancias asignadas automáticamente ($G_i$ hacia adelante, $H_i$ hacia atrás).
   - Autolazos (self-loops).
   - Curvaturas de ramas y renderizado de arcos.

2. **Motor de Análisis de Mason (`mason-engine.spec.md`):**
   - Algoritmo de backtracking para búsqueda de trayectorias directas simples ($P_k$).
   - Detección de lazos dirigidos simples ($L_j$).
   - Determinación de lazos disjuntos de orden $2, 3, \dots, n$ (lazos que no comparten nodos).
   - Cálculo del determinante del grafo $\Delta = 1 - \sum L_j + \sum L_a L_b - \dots$.
   - Cálculo de cofactores $\Delta_k$ para cada trayectoria directa (determinante de los lazos que no tocan la trayectoria $k$).
   - Resolución simbólica y numérica de la función de transferencia global:
     $$T = \frac{\sum_k P_k \Delta_k}{\Delta}$$
   - Generación del sistema de ecuaciones algebraicas nodales.

3. **Síntesis de Diagrama de Bloques Equivalente (`block-synthesis.spec.md`):**
   - Transformación algorítmica del grafo de señales a un diagrama de bloques estructurado:
     - Nodos receptores múltiples $\to$ Sumadores encadenados (máx 3 entradas por sumador).
     - Ramas con ganancia $\to$ Bloques de transferencia con posicionamiento optimizado.
     - Nodos emisores múltiples $\to$ Puntos de bifurcación.
   - Posicionamiento horizontal y niveles de arcos superiores/inferiores para evitar superposiciones.
   - Exportación de JSON interoperable con el módulo de Diagrama de Bloques.
