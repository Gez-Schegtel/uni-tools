# Bitácora de Estado del Proyecto (status.md)

Este documento es el registro vivo de la evolución del proyecto **uni-tools**, decisiones arquitectónicas y hoja de ruta inmediata.

---

## 1. Resumen Ejecutivo y Dónde Estamos Parados

* **Fase Actual:** **Fase 0: Configuración y Gobernanza SDD** (Completándose).
* **Próxima Fase:** **Fase 1: Especificaciones del Rediseño UI/UX**.
* **Rama de Trabajo:** `features/migracion`.
* **Fuente Única de Verdad:** Carpeta `docs/` (conforme a [GEMINI.md](file:///home/n1krov/projects/uni-tools/GEMINI.md)).

El proyecto se encuentra en el punto de inflexión donde se ha completado el análisis forense del código legacy ([docs/resumen_actual.md](file:///home/n1krov/projects/uni-tools/docs/resumen_actual.md)), se han establecido las reglas de gobernanza para Spec-Driven Development, y se ha priorizado el **rediseño completo de la interfaz de usuario (UI/UX)** para hacerla moderna, fluida y natural antes de comenzar a portar el código.

---

## 2. Decisiones Técnicas Acordadas

| Decisión | Opción Seleccionada | Justificación |
|---|---|---|
| **Metodología** | **Spec-Driven Development (SDD)** | La especificación en `docs/specs/` precede obligatoriamente a la implementación para evitar deuda técnica y bugs no testeados. |
| **Gobernanza** | **Fuente única de verdad en `docs/`** | Ninguna decisión se toma sin reflejarse en `docs/`. Se realiza un commit por cada spec o cambio funcional. |
| **Framework de UI** | **Svelte 5** | Máximo rendimiento sobre SVG (sin sobrecarga de Virtual DOM), bundle minúsculo para distribución offline, sintaxis limpia. |
| **Lenguaje** | **TypeScript (strict)** | Modelos y ASTs fuertemente tipados, erradicación de errores de tipos en tiempo de ejecución. |
| **Bundler / Build** | **Vite** | Compilación rápida, soporte estático para GitHub Pages y generación de archivo único portable. |
| **Validación de Datos** | **Zod** | Definición y validación automática de contratos de documentos JSON y SVG. |
| **Testing** | **Vitest + Playwright** | Vitest para algoritmos y Core en Node (milisegundos); Playwright para integración E2E de interfaz gráfica. |
| **Diseño Visual** | **Rediseño Total UI/UX** | Reemplazo completo de la interfaz actual por una experiencia moderna, limpia, intuitiva y con sensación natural. |

---

## 3. Registro Cronológico de Actividades

### [2026-10-18]
- **Análisis completo del código fuente:** Se auditaron todas las herramientas ([diagrama-bloque.html](file:///home/n1krov/projects/uni-tools/diagrama-bloque.html), [simulador-logico.html](file:///home/n1krov/projects/uni-tools/simulador-logico.html), [diagrama-señales.html](file:///home/n1krov/projects/uni-tools/diagrama-señales.html)) y fuentes en `src/`. Se documentaron en [docs/resumen_actual.md](file:///home/n1krov/projects/uni-tools/docs/resumen_actual.md).
- **Configuración del entorno SDD:**
  - Estructuración de directorios temáticos: `docs/specs/core/`, `docs/specs/bloque/`, `docs/specs/simulador/`, `docs/specs/senales/`, `docs/specs/ui/`.
  - Creación de `docs/tablero.json` y del visualizador interactivo de terminal `docs/tablero.js`.
  - Reglas operativas y fuente de verdad en [GEMINI.md](file:///home/n1krov/projects/uni-tools/GEMINI.md).
- **Inicialización del Stack Tecnológico Moderno (Fase 4):**
  - Setup de `package.json` en raíz con Vite 8, Svelte 5 (`^5.57.2`), TypeScript 7 strict, Vitest 5 y Zod.
  - Configuración de `tsconfig.json`, `vite.config.ts`, `svelte.config.js`.
- **Preservación y Port de Motores Matemáticos / Core (Fases 2 y 5):**
  - Especificación formal e implementación de esquemas Zod en [docs/specs/core/document-schema.spec.md](file:///home/n1krov/projects/uni-tools/docs/specs/core/document-schema.spec.md) y `src/core/schemas/document.schema.ts`.
  - Port a TypeScript puro del motor de análisis de Mason (`src/core/mason/mason.ts`) y síntesis de diagramas de bloques (`src/core/mason/synthesis.ts`).
  - Port a TypeScript puro del simulador lógico combinacional/secuencial (`src/core/logic/simulator.ts`) y optimizador Quine-McCluskey (`src/core/logic/minimizer.ts`).
  - Port a TypeScript puro del parser de ecuaciones LaTeX y layout de cajas (`src/core/math/parser.ts`).
  - Port a TypeScript puro del ruteo ortogonal A* (`src/core/routing/orthogonal.ts`).
  - Implementación de máquina de estado e historial inmutable `HistoryManager` (`src/core/history/history.ts`).
- **Limpieza de la Raíz y Organización Arquitectónica:**
  - Se movieron todos los archivos monolíticos HTML viejos a `legacy/html/`.
  - Se movió el código viejo de `src/` (`bloque`, `comun`, `senales`, `simulador`, `construir.js`) a `legacy/src/`.
  - Se movieron `CLAUDE.md` y `.claude/` a `legacy/claude/`.
  - Se organizaron las imágenes en `public/`.
  - Se configuró el nuevo `index.html`, `src/App.svelte` y `src/main.ts` con compilación verificada en producción (`npm run build`).
- **Fase 1: Especificaciones del Rediseño UI/UX (Completada):**
  - Redacción de [docs/specs/ui/design-tokens.spec.md](file:///home/n1krov/projects/uni-tools/docs/specs/ui/design-tokens.spec.md): paletas cromáticas, variables semánticas, temas claro y oscuro, sombras y tipografía.
  - Redacción de [docs/specs/ui/layout.spec.md](file:///home/n1krov/projects/uni-tools/docs/specs/ui/layout.spec.md): arquitectura de pantalla completa (Header con tool switcher, lienzo infinito con grilla sutil, toolbar flotante, inspector contextual colapsable y barra de estado).
  - Redacción de [docs/specs/ui/interactions.spec.md](file:///home/n1krov/projects/ui/interactions.spec.md): modos de cursor, doble clic para edición de texto in-situ, gestos táctiles y atajos de teclado universales.
  - Redacción de [docs/specs/simulador/components.spec.md](file:///home/n1krov/projects/uni-tools/docs/specs/simulador/components.spec.md): catálogo formal de símbolos ANSI (AND, OR, NOT, XOR, NAND, NOR, XNOR), encapsulados IC de biestables (D, JK, T, RS con notch dinámico de reloj y salidas $Q/\overline{Q}$), interruptores interactivos con toggle vivo y sondas LED de salida.
- **Fase 6: Construcción de la Nueva UI en Svelte 5 (En Progreso - T6.1 Completada):**
  - Implementación del sistema de diseño en `src/ui/theme.css` con variables CSS semánticas, temas claro/oscuro y reseteo moderno.
  - Módulo geométrico [`src/ui/canvas/geometry.ts`](file:///home/n1krov/projects/uni-tools/src/ui/canvas/geometry.ts): cálculo de puertos/pines, ruteo Manhattan a 90° con esquinas curvadas, caminos SVG ANSI y bucles de realimentación.
  - Creación de componentes modulares de Svelte 5:
    - [`Header.svelte`](file:///home/n1krov/projects/uni-tools/src/ui/Header.svelte): selector de herramientas (Bloques, Simulador, Señales), nombre editable in-situ, acciones de deshacer/rehacer, exportación y alternador de tema.
    - [`Toolbar.svelte`](file:///home/n1krov/projects/uni-tools/src/ui/Toolbar.svelte): barra flotante con cursores (`V`, `C`), agregado rápido de todas las compuertas lógicas (AND, OR, NOT, XOR, NAND, NOR), biestables (D, JK, T, RS) y borrado.
    - [`Canvas.svelte`](file:///home/n1krov/projects/uni-tools/src/ui/Canvas.svelte): lienzo SVG con terminales interactivos de pines visibles al hacer hover, drag-and-drop de cables ortogonales con guía punteada elástica, renderizado ANSI, conmutadores interactivos con simulación en tiempo real y cables energizados con nivel lógico visual (verde esmeralda para High, pizarra para Low).
    - [`Inspector.svelte`](file:///home/n1krov/projects/uni-tools/src/ui/Inspector.svelte): panel lateral derecho contextual con configuración de compuertas lógicas, número de entradas, selector de biestable (D, JK, T, RS), estado de interruptores, coordenadas $X/Y$, encaje en grilla y paleta cromática.
    - [`StatusBar.svelte`](file:///home/n1krov/projects/uni-tools/src/ui/StatusBar.svelte): barra inferior con estadísticas, nivel de zoom y estado de autoguardado.
    - [`App.svelte`](file:///home/n1krov/projects/uni-tools/src/App.svelte): integración completa, reactividad con runes de Svelte 5 (`$state`, `$derived`, `$effect`) y circuito demostrativo interactivo listo para probar en local.
- **Verificación Automática:** 25 pruebas unitarias en Vitest (`tests/unit/`) pasando al 100% y build de producción verificado con Vite (`npm run build` en ~480ms sin advertencias).

---

## 4. Próximos Pasos Inmediatos

1. **Fase 6 (Finalización):**
   - Incorporar diálogos modales modernos (Tabla de Verdad con simplificación Quine-McCluskey, Análisis de Mason con árbol paso a paso, Importación/Apertura con Drag & Drop).
2. **Fase 3 (Especificaciones detalladas de Motores de Dominio):**
   - Completar las specs formales pendientes en `docs/specs/`.
