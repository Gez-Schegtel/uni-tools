# Especificación de Arquitectura de Layout y Pantalla (UI/UX)

**Estado:** Aprobado  
**Fecha:** 2026-10-18  
**Módulo:** `ui/layout`  
**Implementación:** Componentes en `src/ui/`

---

## 1. Disposición General del Espacio de Trabajo

La aplicación se estructura en una vista de pantalla completa (`100vw`, `100vh`) sin scrollbars del navegador, con capas z-index bien delimitadas:

```text
+--------------------------------------------------------------------------+
| HEADER (Barra Superior)                                                  |
| [Logo] [Selector Herramienta] [Nombre Archivo] | [Undo/Redo] [Export] [Theme] |
+--------------------------------------------------------------------------+
|                                  |                                       |
|                                  |   INSPECTOR LATERAL                   |
|         LIENZO INFINITO          |   (Panel Colapsable Derecho)          |
|              (SVG)               |                                       |
|                                  |   - Tipo / Título                     |
|     +----------------------+     |   - Etiqueta / Ecuación LaTeX         |
|     | TOOLBAR FLOTANTE     |     |   - Posición y Dimensiones            |
|     | [Select] [Wire] ...  |     |   - Colores y Opciones                |
|     +----------------------+     |                                       |
|                                  |                                       |
+--------------------------------------------------------------------------+
| STATUS BAR (Barra de Estado Inferior)                                    |
| [Nodos: 5 | Cables: 4] [Autoguardado OK]             [Zoom: 100%] [Atajos] |
+--------------------------------------------------------------------------+
```

---

## 2. Componentes Principales

### 2.1 Header (Barra Superior - `Header.svelte`)
* **Ubicación:** Fija en el tope de la pantalla (`height: 52px`).
* **Sección Izquierda:**
  * Logo de `uni-tools` (versión compacta/marca).
  * Selector de herramienta actual (pills o tabs con transiciones suaves):
    * `Bloques` (Diagramas de control).
    * `Simulador` (Circuitos lógicos).
    * `Señales` (Grafos de flujo SFG).
* **Sección Central:**
  * Nombre del proyecto editable in-situ con hover de lápiz y validación de nombres seguros.
* **Sección Derecha:**
  * Botones de acción rápida con tooltips y atajos visibles:
    * Deshacer (`Ctrl+Z`) y Rehacer (`Ctrl+Y`).
    * Ajustar a la pantalla / Fit (`F`).
    * Menú de Exportación (`SVG`, `PNG 3x`, `JSON`).
    * Abrir archivo / Importar (`Ctrl+O`).
    * Alternador de Tema (`Claro` / `Oscuro`).

### 2.2 Lienzo Infinito (`Canvas.svelte`)
* **Ubicación:** Ocupa todo el centro de la pantalla.
* **Fondo:** Grilla sutil de puntos espaciados cada 20px (coincidente con el snap-to-grid).
* **Comportamiento:**
  * Paneo fluido con arrastre de botón medio, barra espaciadora + clic, o arrastre táctil con un dedo.
  * Zoom centrado en el puntero del ratón (`wheel`) o gesto de pellizco en pantallas táctiles.
  * Banda elástica de selección rectangular para selección múltiple.

### 2.3 Barra de Herramientas Flotante (`Toolbar.svelte`)
* **Ubicación:** Flotante en la parte superior-central del lienzo con sombra suave y esquinas redondeadas (`border-radius: 12px`, `backdrop-filter: blur(8px)`).
* **Herramientas Principales:**
  * `V`: Selección / Mover.
  * `C`: Conectar / Cablear.
  * `Paleta de Componentes`: Menú desplegable o botones rápidos según la herramienta activa:
    * En Bloques: Bloque `G`, Sumador `Σ`, Bifurcación `●`, I/O, Recuadro.
    * En Lógica: Compuertas básicas (AND, OR, NOT...), Biestables (D, JK, T, SR), Entradas/Salidas, Reloj.
    * En Señales: Nodo `a`, Entrada `r`, Salida `y`, Autolazo.
  * `M`: Recuadro de agrupación.
  * `T`: Texto libre.
  * `Supr`: Eliminar selección.

### 2.4 Inspector Lateral Contextual (`Inspector.svelte`)
* **Ubicación:** Panel lateral derecho (`width: 280px`), con animación suave de apertura y colapso.
* **Comportamiento:**
  * **Sin selección:** Muestra propiedades del documento (tamaño de hoja para impresión A4, color de fondo, estadísticas del circuito).
  * **Con elemento seleccionado:** Se abre automáticamente mostrando secciones en tarjetas colapsables:
    * **Propiedades Básicas:** Identificador, etiqueta con soporte para escritura en vivo de ecuaciones LaTeX (`K/(s+1)`).
    * **Geometría:** Coordenadas $X, Y$, ancho y alto, botón de alinear y encajar en grilla.
    * **Opciones Específicas:**
      * Sumador: Signos de patas ($+$, $-$, vacío), cruz diagonal.
      * Compuerta: Número de entradas (2, 3, 4, 8), estado encendido/apagado en entradas.
      * Rama de Señal: Ganancia ($G_1$, $-H_2$), invertir sentido, curvar al otro lado.
    * **Colores:** Paleta rápida de 8 colores armónicos o color personalizado.

### 2.5 Barra de Estado Inferior (`StatusBar.svelte`)
* **Ubicación:** Fija al pie (`height: 28px`).
* **Información:**
  * Conteo de componentes y conexiones activas.
  * Selección actual (ej: "2 elementos seleccionados").
  * Indicador de autoguardado en `localStorage` con ícono de check sutil.
  * Control numérico de nivel de zoom actual (`100%`) con botón de reset.
  * Botón de ayuda `?` para ver la chuleta de atajos de teclado.
