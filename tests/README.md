# Pruebas de uni-tools

Suite automática con [Playwright Test](https://playwright.dev/docs/intro). Abre las páginas reales en
Chromium, las maneja como un usuario (teclas, clicks, arrastres) y consulta el estado interno (`S`,
`truthTable()`, `analizar()`…) para comprobar resultados.

## Por qué hay un `package.json` acá y no en la raíz

Las herramientas son HTML autocontenidos, sin build ni dependencias (regla de `CLAUDE.md`). Para no
tocar eso, **todo lo de npm vive sólo en `tests/`**: es herramienta de desarrollo, no se despliega ni
cambia cómo se usa el sitio. (`static.yml` publica la raíz entera, así que `tests/` viaja a Pages,
pero `node_modules/` no se versiona —ver `.gitignore`— y nada del sitio lo referencia.)

## Correrlas

```bash
cd tests
npm install                        # una vez
npx playwright install chromium    # una vez (en Linux limpio: --with-deps)
npm test                           # toda la suite
npx playwright test bloque         # sólo un archivo (por nombre)
npx playwright test -g "Mason"     # sólo lo que mencione "Mason"
npm run test:ui                    # modo interactivo
```

Si ya tenés un Chromium instalado: `CHROMIUM_PATH=/ruta/a/chromium npm test`.
Puerto del servidor de prueba: `PUERTO=9000 npm test` (por defecto 8780).

## Qué cubre cada archivo (`specs/`)

| archivo | qué comprueba |
|---|---|
| `humo.spec.js` | las 4 páginas abren sin errores de consola, sin pedidos externos, sin `<script src>` ni CSS externo; los enlaces de la portada andan |
| `archivos-danados.spec.js` | JSON/SVG roto, truncado o de otra herramienta: nunca deja la herramienta inutilizable; se descarta lo inválido y se conserva lo válido |
| `bloque.spec.js` | herramientas y modos excluyentes (V/X/C vs B/S/N/E/T/M), seleccionar/mover/redimensionar recuadros, tiradores de tramo de flechas, deshacer, ida y vuelta por JSON y por SVG |
| `simulador.spec.js` | tablas de verdad de todas las compuertas, semisumador y sumador completo, ejemplos sin oscilación, nombres de entradas en las expresiones, escape de HTML en etiquetas, biestables |
| `senales.spec.js` | regla de Mason (lazos que se tocan / no se tocan, varias trayectorias, valor numérico), equivalente en bloques abre en `diagrama-bloque`, deshacer/rehacer |

`ayudas.js` tiene las utilidades comunes (`abrir`, `aPantalla`, `arrastrar`, `abrirTexto`).
Cada test que usa `abrir()` falla además si la página tiró algún error de consola.

## Agregar una prueba

1. Elegir el spec de la herramienta (o crear `specs/<algo>.spec.js`).
2. Abrir con `abrir(page, "archivo.html")`.
3. Armar el estado con `page.evaluate` (`cargarEjemplo`, `abrirTexto` con un JSON chico) y comprobar
   contra un resultado **conocido de antemano** (la tabla de un sumador, el Δ de Mason a mano), no
   contra lo que el programa devuelve hoy.
4. Un bug arreglado → una prueba que falle sin el arreglo.

## En GitHub Actions

`.github/workflows/tests.yml` corre en push a `main` y `features`, en pull requests y a mano
(*Actions → Pruebas → Run workflow*). Pasos: verifica que el JS de cada página parsea, instala
dependencias (`npm ci`, usa `package-lock.json`), instala Chromium y corre la suite. Si algo falla,
sube el reporte y las trazas como artefacto (`reporte-playwright`, 14 días). **No despliega**: eso
sigue siendo `static.yml`, que publica al pushear a `main`.

Para impedir que se mezcle a `main` algo que no pasa: *Settings → Branches → Branch protection rule*
sobre `main` → *Require status checks to pass* → elegir «pruebas».
