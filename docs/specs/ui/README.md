# Especificaciones del Sistema de Diseño e Interfaz Gráfica (UI/UX)

Este directorio contiene las especificaciones para el **rediseño integral de la interfaz de usuario** de `uni-tools`.

## Objetivos del Nuevo Diseño

1. **Facilidad de Uso y Sensación Natural:**
   - La interfaz actual es tosca, rígida y visualmente saturada. La nueva interfaz debe sentirse fluida, moderna y liviana, similar a herramientas contemporáneas de diseño gráfico e ingeniería (tipo Figma, Linear o Excalidraw, pero especializada en diagramas técnicos).
   - Acceso inmediato y contextual a herramientas sin saturar la pantalla.
   - Microinteracciones naturales: cursores contextuales, estados de hover claros, transiciones suaves y snapping visual intuitivo.

2. **Arquitectura de la Pantalla (`layout.spec.md`):**
   - **Header / Barra de Estado Superior:** Nombre del proyecto editable in-situ, selector de herramientas (pestañas o menú limpio), botones de acción rápida (Deshacer, Rehacer, Limpiar, Ajustar a pantalla `Fit`, Exportar, Abrir), y estado de guardado.
   - **Lienzo Infinito Central:** Fondo limpio con grilla de puntos o líneas sutiles, soporte de navegación con mouse, trackpad o pantalla táctil.
   - **Paleta Flotante / Toolbar Contextual:** Barra de herramientas accesible pero no invasiva para seleccionar modos de cursor (Seleccionar, Conectar, Agregar componentes).
   - **Inspector Lateral Colapsable:** Panel derecho moderno que sólo muestra controles cuando hay un elemento seleccionado, agrupando propiedades de manera lógica (Tipo, Etiqueta/Ecuación, Dimensiones, Colores, Opciones específicas).
   - **Diálogos Modales Limpios:** Ventanas de análisis (Mason, Tabla de Verdad, Importar/Abrir) con diseño espacioso, tipografía monoespaciada para matemáticas y opción de copiado rápido al portapapeles.

3. **Sistema de Temas y Estilos (`design-tokens.spec.md`):**
   - Paleta cromática moderna con soporte nativo de modo claro y oscuro (Dark mode).
   - Variables de color semánticas (`bg-canvas`, `panel-surface`, `accent-primary`, `wire-active`, etc.).
   - Tipografía refinada para textos de interfaz (ej. Inter / Geist) y soporte tipográfico para fórmulas matemáticas.

4. **Interacciones y Accesibilidad (`interactions.spec.md`):**
   - Paleta de comandos o atajos de teclado intuitivos y descubribles (con ventana de ayuda `?` visualmente clara).
   - Manipulación directa sobre el lienzo: doble clic para editar textos in-situ sin necesidad de ir al panel lateral obligatoriamente.
