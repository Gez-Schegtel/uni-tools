# Especificación de Tokens de Diseño y Temas (UI/UX)

**Estado:** Aprobado  
**Fecha:** 2026-10-18  
**Módulo:** `ui/design-tokens`  
**Implementación:** `src/ui/theme.css`

---

## 1. Filosofía Visual

La nueva interfaz de `uni-tools` busca abandonar el aspecto tosco y saturado del HTML legacy, adoptando una estética **técnica, moderna, minimalista y espaciosa**, inspirada en aplicaciones como Figma, Linear y tldraw.

### Principios Fundamentales:
1. **Contraste y Jerarquía Limpia:** Superficies diferenciadas por elevación sutil y bordes finos de 1px en lugar de sombras pesadas o colores chillones.
2. **Soporte Nativo Claro / Oscuro (Light & Dark Mode):** El lienzo y la interfaz responden a la preferencia del sistema o al selector de tema manual.
3. **Tipografía Clara:** 
   - Interfaz: Fuente de sistema sans-serif optimizada para pantallas (`system-ui, -apple-system, sans-serif`).
   - Fórmulas y valores numéricos: Tipografía monoespaciada para tablas de verdad y variables matemáticas.
4. **Paleta Semántica Funcional:** Colores con significado estricto (activos, selección, advertencias de oscilación, cables energizados).

---

## 2. Variables y Tokens CSS

### 2.1 Paleta de Modo Claro (Default)
```css
:root, [data-theme="light"] {
  /* Fondos y Superficies */
  --bg-app: #f8fafc;
  --bg-surface: #ffffff;
  --bg-surface-hover: #f1f5f9;
  --bg-surface-active: #e2e8f0;
  --bg-canvas: #ffffff;
  --grid-dot: #cbd5e1;

  /* Bordes y Separadores */
  --border-subtle: #e2e8f0;
  --border-strong: #cbd5e1;
  --border-focus: #3b82f6;

  /* Textos y Rótulos */
  --text-main: #0f172a;
  --text-muted: #64748b;
  --text-subtle: #94a3b8;
  --text-inverse: #ffffff;

  /* Acento y Acción */
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-surface: #eff6ff;

  /* Elementos de Diagramas y Cables */
  --diagram-node-bg: #ffffff;
  --diagram-node-stroke: #1e293b;
  --diagram-wire: #334155;
  --diagram-wire-active: #10b981;    /* Nivel lógico 1 */
  --diagram-wire-inactive: #94a3b8;  /* Nivel lógico 0 */
  --diagram-selection: #2563eb;
  --diagram-selection-bg: rgba(37, 99, 235, 0.08);

  /* Estados y Alertas */
  --color-danger: #ef4444;
  --color-danger-bg: #fef2f2;
  --color-warning: #f59e0b;
  --color-warning-bg: #fffbeb;
  --color-success: #10b981;

  /* Sombras y Elevaciones */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
}
```

### 2.2 Paleta de Modo Oscuro
```css
[data-theme="dark"] {
  /* Fondos y Superficies */
  --bg-app: #090d16;
  --bg-surface: #111827;
  --bg-surface-hover: #1f2937;
  --bg-surface-active: #374151;
  --bg-canvas: #090d16;
  --grid-dot: #1f2937;

  /* Bordes y Separadores */
  --border-subtle: #1f2937;
  --border-strong: #374151;
  --border-focus: #60a5fa;

  /* Textos y Rótulos */
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-subtle: #64748b;
  --text-inverse: #0f172a;

  /* Acento y Acción */
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-surface: rgba(59, 130, 246, 0.15);

  /* Elementos de Diagramas y Cables */
  --diagram-node-bg: #111827;
  --diagram-node-stroke: #f1f5f9;
  --diagram-wire: #cbd5e1;
  --diagram-wire-active: #34d399;
  --diagram-wire-inactive: #475569;
  --diagram-selection: #60a5fa;
  --diagram-selection-bg: rgba(96, 165, 250, 0.15);

  /* Estados y Alertas */
  --color-danger: #f87171;
  --color-danger-bg: rgba(239, 68, 68, 0.15);
  --color-warning: #fbbf24;
  --color-warning-bg: rgba(245, 158, 11, 0.15);
  --color-success: #34d399;

  /* Sombras y Elevaciones */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
}
```

---

## 3. Escala de Radios y Espaciado
* `radius-sm`: `4px` (botones chicos, badges).
* `radius-md`: `8px` (inputs, botones principales, cards de inspector).
* `radius-lg`: `12px` (paneles flotantes, modales, toolbar flotante).
* `radius-full`: `9999px` (pills de selección, switches, avatares).
* Grilla base de layout: Multiplos de `4px` y `8px` (`gap: 8px`, `padding: 12px`, `padding: 16px`).
