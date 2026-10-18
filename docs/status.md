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
- **Verificación Automática:** 19 pruebas unitarias creadas en `tests/unit/` ejecutándose al 100% en menos de 800ms con Vitest. Todo el CSS legacy fue desvinculado del Core, dejándolo listo para la nueva UI.

---

## 4. Próximos Pasos Inmediatos

1. **Fase 1 (Rediseño UI/UX):**
   - Especificar en `docs/specs/ui/layout.spec.md` la nueva interfaz moderna, fluida y natural (header, lienzo infinito, barra de herramientas flotante, panel inspector contextual colapsable y diálogos modales).
   - Especificar tokens de diseño y temas claro/oscuro en `docs/specs/ui/design-tokens.spec.md`.
2. **Fase 6 (Implementación UI Svelte 5):**
   - Crear los componentes visuales de la nueva UI en `src/ui/` con el nuevo CSS desde cero.
