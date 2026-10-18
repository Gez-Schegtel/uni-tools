# Especificación de Interacciones, Atajos y Gestos (UI/UX)

**Estado:** Aprobado  
**Fecha:** 2026-10-18  
**Módulo:** `ui/interactions`  
**Implementación:** Gestores de eventos en `src/ui/`

---

## 1. Interacción con el Lienzo

### 1.1 Modos de Cursor
1. **Modo Selección (`V` - Puntero Default):**
   - Clic en elemento: Selecciona el elemento y enfoca el inspector.
   - Clic en espacio vacío: Deselecciona todo.
   - Arrastre sobre elemento: Mueve los elementos seleccionados manteniendo el snap-to-grid a 20px.
   - Arrastre en espacio vacío: Despliega una banda elástica rectangular punteada que selecciona todos los elementos que intersectan.
   - `Shift + Clic`: Alterna la selección de un elemento individual sin deseleccionar los demás.

2. **Modo Conexión (`C` - Cablear/Flechas):**
   - El puntero adopta forma de cruz.
   - Al pasar el cursor sobre un pin o puerto disponible, se resalta con un halo visual.
   - Clic en puerto origen + arrastre hasta puerto destino: Muestra una línea guía ortogonal en tiempo real.
   - Al soltar sobre un puerto compatible: Crea la conexión y calcula automáticamente el ruteo esquivando cajas intermedias.

3. **Modo Paneo (Mano / Espacio):**
   - Mantener apretada la barra espaciadora o el botón central del mouse permite desplazar el lienzo en cualquier dirección libremente.

---

## 2. Manipulación Directa y Edición

### 2.1 Edición de Texto In-Situ (Doble Clic)
* Doble clic sobre un bloque, compuerta o etiqueta de rama: Despliega un `<input>` flotante sin bordes exactamente sobre el texto.
* Soporta vista previa en tiempo real de fórmulas matemáticas (`K/(s+1)` o subíndices `G_1`).
* Confirmación con `Enter` o clic afuera; cancelación con `Esc`.

### 2.2 Redimensionamiento y Tiradores
* Bloques y sumadores seleccionados muestran 4 tiradores discretos en las esquinas (`nw`, `ne`, `se`, `sw`).
* Marcos de agrupación muestran 8 tiradores (esquinas + lados) y un asa superior para arrastre grupal.
* El redimensionamiento escala desde el centro en bloques y compuertas para preservar la alineación ortogonal de los puertos.

### 2.3 Ajuste Manual de Conexiones
* Una flecha o cable seleccionado muestra tiradores sutiles en los puntos medios de sus tramos ortogonales.
* Arrastrar un tramo horizontal lo desplaza verticalmente; arrastrar un tramo vertical lo desplaza horizontalmente.

---

## 3. Atajos de Teclado Universales

| Atajo | Acción |
|---|---|
| `Ctrl + Z` | Deshacer (Undo) |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Rehacer (Redo) |
| `Ctrl + C` | Copiar elementos seleccionados al portapapeles |
| `Ctrl + X` | Cortar elementos seleccionados |
| `Ctrl + V` | Pegar elementos del portapapeles con desplazamiento |
| `Ctrl + D` | Duplicar selección en un solo paso |
| `Supr` / `Backspace` | Eliminar elementos y conexiones seleccionadas |
| `F` | Ajustar vista a todo el diagrama (Fit) |
| `+` / `-` / `Ctrl + Rueda` | Zoom in / Zoom out |
| `V` | Cambiar a herramienta Selección |
| `C` | Cambiar a herramienta Conexión |
| `Esc` | Cancelar arrastre en curso, cerrar modales o deseleccionar |
| `?` | Abrir chuleta de atajos y ayuda |
