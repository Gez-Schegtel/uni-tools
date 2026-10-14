<img src="uni-tools-logo.png" alt="uni-tools — Simulación y creación de diagramas lógicos, de bloques y de señales" width="480">

# uni-tools
Repo de opciones para la cursada en la facu. Plantear circuitos, apuntes, y no se, lo que me pinte

**Actualmente se encuentra implementado los modulo para creación de diagramas de bloques y de citcuitos lógicos.**

## Que incluyen?
1. Diagrama de bloques: 
   - Bloques
   - Sumadores
   - Bifurcaciones
2. Circuitos lógicos: 
   - Compuertas lógicas
   - Biestables (Incluido uno Custom)
   - Sumadores y Semi-sumadores
   - Tablas de Verdad y de exitación
   - Clock con 3 modos de funcionamiento
   - Funciones Lógicas
3. Todos:
   - Visualización de ecuaciones
   - Exportación en formatos JSON, SVG, PNG
   - Importación en formato JSON
   - Ajuste a la grilla (se puede desactivar)
   - Ediciones de tamaño y otras opciones de UI de elementos
   - Ejemplos de Uso

## Pruebas

Hay una suite automática con Playwright en `tests/` que corre en GitHub Actions (`.github/workflows/tests.yml`)
en cada push a `main`/`features` y en cada pull request. Para correrla en tu compu:

```bash
cd tests && npm install && npx playwright install chromium && npm test
```

Las herramientas en sí siguen siendo HTML sueltos: `npm` se usa sólo para las pruebas. Detalles en `tests/README.md`.

# Link del deploy a Github Pages:
https://gez-schegtel.github.io/uni-tools/
