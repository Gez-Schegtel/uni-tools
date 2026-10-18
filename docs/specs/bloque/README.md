# Especificaciones de Diagramas de Bloques

Este directorio contiene las especificaciones funcionales y matemáticas para el editor de diagramas de bloques de sistemas de control.

## Alcance del Módulo

1. **Modelo de Bloques y Componentes (`model.spec.md`):**
   - Bloques SISO y MIMO con etiquetas de función de transferencia.
   - Puntos de suma y resta con configuración de signos en los 4 cuadrantes (`l`, `t`, `r`, `b`) y cruz central opcional.
   - Nodos de bifurcación (puntos de derivación).
   - Entradas y salidas del sistema (`io`).
   - Marcos contenedores de agrupación.

2. **Tipógrafo y Motor Matemático de Ecuaciones (`math-typographer.spec.md`):**
   - Tokenizador léxico y analizador sintáctico con precedencia de operadores.
   - Soporte para sintaxis tipo LaTeX: fracciones anidadas (`\frac{num}{den}` o `/`), exponentes (`^`), subíndices (`_`), símbolos griegos (`\alpha`, `\omega`, etc.).
   - Motor de layout tipográfico basado en cajas (dimensionamiento horizontal y vertical).
   - Autoajuste dinámico de las dimensiones del bloque contenedor según el tamaño calculado de la ecuación.

3. **Conexiones y Ruteo de Flechas (`connections.spec.md`):**
   - Conexiones dirigidas entre puertos de componentes con flechas estándar.
   - Algoritmo de ruteo ortogonal automático esquivando obstáculos.
   - Generación de rutas alternativas.
   - Desplazamiento manual de tramos horizontales/verticales con persistencia de cotas.
