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
- **Detección de problemas legacy:** Se identificó que en el commit `46402a1` se habían editado directamente los archivos de la raíz desincronizando `src/` y rompiendo `src/construir.js --comprobar`.
- **Definición de stack tecnológico:** Evaluación y selección de Svelte 5 + TypeScript + Vite.
- **Creación de directivas en GEMINI.md:** Fuente de verdad única en `docs/`, commits obligatorios por cada spec/cambio, y sincronización estricta de estado.
- **Configuración del entorno SDD:**
  - Estructuración de directorios temáticos: `docs/specs/core/`, `docs/specs/bloque/`, `docs/specs/simulador/`, `docs/specs/senales/`, `docs/specs/ui/`.
  - Creación de `docs/tablero.json` y del visualizador interactivo de terminal `docs/tablero.js`.
  - Creación de `docs/status.md`.

---

## 4. Próximos Pasos Inmediatos

1. **Finalizar Fase 0:** Marcar T0.4 como completada en `docs/tablero.json` y realizar el commit correspondiente.
2. **Arrancar Fase 1 (Rediseño UI/UX):**
   - Redactar `docs/specs/ui/layout.spec.md` detallando la nueva disposición de la pantalla, el lienzo infinito, el inspector colapsable y los controles contextuales.
   - Definir `docs/specs/ui/design-tokens.spec.md` (paleta moderna, tipografía y soporte para temas claro/oscuro).
   - Acordar los mockups conceptuales con el usuario antes de pasar a la especificación de los motores de cálculo.
