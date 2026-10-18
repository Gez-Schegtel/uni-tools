# Reglas y Directivas del Proyecto uni-tools para Gemini

Este archivo define las reglas operativas, la metodología de trabajo y los principios rectores que deben seguirse estrictamente en el desarrollo de **uni-tools**.

---

## 1. Regla de Oro: Fuente Única de Verdad (`docs/`)

* **La única, pura y exclusiva fuente de verdad es la carpeta `docs/`.**
* Ningún cambio de arquitectura, modelo de datos, algoritmo o interfaz puede implementarse sin que esté previamente documentado y acordado en `docs/specs/`.
* Si hay contradicción entre el código existente (legacy) y lo documentado en `docs/`, **manda `docs/`**.
* Todas las dudas funcionales o decisiones de diseño se discuten y se plasman en `docs/specs/` antes de tocar código.

---

## 2. Flujo de Trabajo: Spec-Driven Development (SDD)

1. **Especificar primero:** Cada funcionalidad, módulo o componente debe contar con su especificación detallada en su subdirectorio correspondiente dentro de `docs/specs/` (`core/`, `bloque/`, `simulador/`, `senales/`, `ui/`).
2. **Definir contratos y esquemas:** Las specs deben contener interfaces de TypeScript o esquemas de validación (Zod) claros, casos de uso, comportamiento esperado y casos borde.
3. **Validación:** El usuario revisa y aprueba la especificación.
4. **Implementación:** Se escribe el código respetando a rajatabla la spec.
5. **Verificación:** Pruebas unitarias (Vitest) y de interfaz contra los criterios de aceptación de la spec.

---

## 3. Registro Obligatorio: `status.md` y `tablero.json`

* **`docs/status.md` (Bitácora de Estado):**
  * Debe actualizarse en cada paso relevante del desarrollo.
  * Contiene el estado del proyecto, resumen ejecutivo de avances, decisiones técnicas tomadas y próximos pasos inmediatos.
* **`docs/tablero.json` (Tablero de Control):**
  * Estructura ágil en formato JSON que organiza todas las tareas, estados (`backlog`, `en_progreso`, `completado`, `bloqueado`), prioridades y dependencias.
  * Debe mantenerse siempre sincronizado con la realidad del desarrollo.
  * Se puede visualizar e inspeccionar en consola en cualquier momento ejecutando:
    ```bash
    node docs/tablero.js
    ```

---

## 4. Política de Commits en Git

* **Cada cambio, especificación creada o modificada, o hito alcanzado DEBE tener su propio commit en Git.**
* Los mensajes de commit deben ser claros, atómicos y descriptivos en español (convención tipo `docs(specs): ...`, `feat(core): ...`, `refactor(ui): ...`).
* Los commits se realizan en la rama de trabajo activa (`features/migracion`).

---

## 5. Stack Tecnológico Elegido

* **Framework de UI:** **Svelte 5**
* **Lenguaje:** **TypeScript (strict)**
* **Bundler:** **Vite** (con generación estática para GitHub Pages y portabilidad offline)
* **Validación de Datos:** **Zod**
* **Testing:** **Vitest** (Unitario y Core algorítmico) + **Playwright** (E2E / Integración UI)
