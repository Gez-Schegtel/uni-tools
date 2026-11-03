# Pruebas de uni-tools

Suite automática con [Playwright Test](https://playwright.dev/docs/intro). Abre las páginas reales en
Chromium y en Firefox, las maneja como un usuario (teclas, clicks, arrastres) y consulta el estado interno (`S`,
`truthTable()`, `analizar()`…) para comprobar resultados.

## Por qué hay un `package.json` acá y no en la raíz

Las herramientas son HTML autocontenidos, sin build ni dependencias (regla de `CLAUDE.md`). Para no
tocar eso, **todo lo de npm vive sólo en `tests/`**: es herramienta de desarrollo, no se despliega ni
cambia cómo se usa el sitio. (`static.yml` publica sólo lo que arma `src/sitio.js`: los HTML de la
raíz y sus imágenes; `tests/` no viaja a Pages.)

## Correrlas

```bash
cd tests
npm install                        # una vez
npx playwright install chromium firefox   # una vez (en Linux limpio: --with-deps)
npm test                           # toda la suite
npm run test:unidades              # sólo los cálculos puros (rápido, sin navegador ni dependencias)
npx playwright test bloque         # sólo un archivo (por nombre)
npx playwright test -g "Mason"     # sólo lo que mencione "Mason"
npm run test:ui                    # modo interactivo
```

Si ya tenés un Chromium instalado: `CHROMIUM_PATH=/ruta/a/chromium npm test` (Firefox se instala aparte con `npx playwright install firefox`).
Puerto del servidor de prueba: `PUERTO=9000 npm test` (por defecto 8780).

## Qué cubre cada archivo (`specs/`)

| archivo | qué comprueba |
|---|---|
| `humo.spec.js` | las 4 páginas abren sin errores de consola, sin pedidos externos, sin `<script src>` ni CSS externo; los enlaces de la portada andan |
| `archivos-danados.spec.js` | JSON/SVG roto, truncado o de otra herramienta: nunca deja la herramienta inutilizable; se descarta lo inválido y se conserva lo válido; colores cortos (`#123`) y colores inválidos |
| `bloque.spec.js` | herramientas y modos excluyentes (V/X/C vs B/S/N/E/T/M), seleccionar/mover/redimensionar recuadros, tiradores de tramo de flechas, doble clic para editar el contenido, copiar/pegar, mover la hoja (rueda, botón del medio, espacio, Ctrl+clic), deshacer, ida y vuelta por JSON y por SVG, el área de impresión (la exportación sale recortada a la hoja), que las puntas de flecha no acumulen marcadores viejos, que las ecuaciones de los bloques conserven el signo de `s^-1`, tomen una sola letra de subíndice sin llaves (`\omega_ns`) y entren en el bloque aunque lleven una fracción en el exponente, y que un bloque no acepte una segunda entrada (avisa y no la crea, y al abrir un archivo con entradas de más se queda con una sola; los sumadores siguen juntando varias); con 160 bloques, que seleccionar no rerutee, que arrastrar sea rápido y que al soltar las rutas sean las de un ruteo completo, y que en 25 diagramas en grilla ninguna flecha atraviese un bloque; la vista previa de la flecha: sobre un destino es la ruta que va a tener y, con el cursor detrás del puerto, rodea el bloque de origen |
| `simulador.spec.js` | tablas de verdad de todas las compuertas, semisumador y sumador completo, ejemplos sin oscilación, nombres de entradas en las expresiones, escape de HTML en etiquetas, biestables, simplificación mínima, el área de impresión y que ningún cable pase por encima de su propia compuerta; la vista previa del cable: sobre una entrada es la ruta que va a tener y, con el cursor detrás de la salida, rodea la compuerta |
| `lienzo.spec.js` | el lienzo sigue respondiendo tras copiar/pegar/mover/deseleccionar; no es seleccionable ni arrastrable por el navegador |
| `cortar.spec.js` | Ctrl+X en las tres herramientas: borra, el primer pegado vuelve al mismo lugar, conserva nombres, se deshace |
| `inicio.spec.js` | botón Inicio, aviso antes de salir, autoguardado (recuperar al volver o recargar, archivo roto, una copia por herramienta) y aviso en la portada |
| `ventanas.spec.js` | con una ventana abierta Ctrl+C copia su texto y los atajos no tocan el diagrama de atrás; Esc la cierra |
| `comun.spec.js` | lo compartido de `src/comun/`, una vez por herramienta: Ctrl+D sin selección avisa y no toca nada, el aviso se queda el tiempo suficiente para leerlo y se cierra con la cruz, duplicar es un solo paso de deshacer, `?` abre la ayuda, Shift/Ctrl + rueda, nombres de archivo válidos, al encuadrar la paleta no tapa nada, ventana Abrir, el PNG descargado (firma y tamaño al triple), la versión del documento (en el JSON y adentro del SVG) y los gestos táctiles (un dedo mueve la hoja, dos hacen zoom) |
| `correccion.spec.js` | exactitud contra referencias independientes (lo esperado no sale del código de la app): Mason contra resolver el sistema lineal de grafos al azar (transferencia, ecuaciones, lazos, trayectorias y el equivalente en bloques), simplificación equivalente y mínima, circuitos al azar (tabla y expresión mostradas), biestables contra el modelo de libro y ecuaciones de bloques (lo dibujado vale lo escrito y entra en el bloque) |
| `fuentes.spec.js` | las páginas de la raíz coinciden con lo que arma `src/construir.js` y no quedan restos del armado (directivas, `{{parámetros}}`, CRLF, `<script src>`); el armado detecta nombres globales repetidos entre módulos; `src/sitio.js` publica sólo páginas e imágenes; y los enlaces del backlog y de la documentación apuntan a archivos que existen; la portada copia el modo oscuro de `comun/tema.*` sin desfasarse |
| `senales.spec.js` | regla de Mason (lazos que se tocan / no se tocan, varias trayectorias, valor numérico), el equivalente en bloques tiene la misma transferencia que el grafo (con varias ramas a la salida, autolazo y cinco ramas entrando a un nodo), flechas de la vista previa que llegan desde afuera del puerto, términos negativos que se restan, aviso cuando a la entrada le llegan ramas, y que el JSON generado se abre en `diagrama-bloque`; deshacer/rehacer, copiar/pegar y duplicar; la vista previa de la rama sale del borde del nodo y se engancha al borde del destino |
| `lgr.spec.js` | simulador del LGR: todos los ejemplos se calculan sin errores y muestran los nueve pasos, un estado guardado roto no rompe la página, un grado desmesurado avisa en vez de trabarla, la rueda en líneas (Firefox) hace el mismo zoom que en píxeles, trazar un grado alto no traba la página, Inicio y la ayuda, el SVG exportado trae leyenda y datos y se vuelve a abrir (y uno de otra herramienta no), y el autoguardado con la clave común y el aviso en la portada |
| `tema.spec.js` | modo oscuro en las 5 páginas: el botón pasa de la luna al sol y se recuerda (también en otras pestañas); en oscuro, todo texto visible de la barra, el panel, la paleta, las ventanas, los avisos y los pasos del LGR tiene contraste de 4,5:1 o más; el lienzo conserva sus colores (sólo se ve invertido) y el SVG exportado es idéntico al de claro |

`lienzo.spec.js` repite, en las tres herramientas, el flujo copiar → pegar → mover → deseleccionar → Ctrl+clic / banda, y comprueba que el navegador no pueda seleccionar ni arrastrar el lienzo (causa de un bloqueo que sólo se veía en Firefox). Desde 2026-10 la suite entera corre también en Firefox (`--project=firefox`).

`ayudas.js` tiene las utilidades comunes (`abrir`, `aPantalla`, `arrastrar`, `abrirTexto`). Una prueba que corre en las tres herramientas lee el modelo con los accesos de la página (`nodosDe()`, `conexionesDe()`, `etiquetaDe(n)`, `tipoDe(n)`), no con `S.edges || S.wires || S.ramas`.
Cada test que usa `abrir()` falla además si la página tiró algún error de consola.

La suite corre en **Chromium y en Firefox** (los dos proyectos de `playwright.config.js`; `npx playwright test --project=firefox` corre uno solo). `CHROMIUM_PATH` sólo vale para Chromium.

Las pruebas corren contra las páginas **armadas** de la raíz: después de tocar `src/`, correr
`node src/construir.js` antes de `npm test` (si no, `fuentes.spec.js` lo avisa).

## Pruebas unitarias de los cálculos puros (`unidades/`)

Mason, la lógica del simulador (compuertas, `simplify`, tablas de verdad) y el analizador de
ecuaciones de los bloques son código puro: no tocan el DOM. `unidades/` los prueba **sin navegador**
y en menos de un segundo (necesita Node ≥ 20; el CI usa 22):

```bash
node --test "unidades/*.test.js"        # desde tests/
node --test "tests/unidades/*.test.js"  # desde la raíz del repo
npm --prefix tests run test:unidades    # atajo de npm
```

Archivos de `unidades/`:
- `cargar.js`: pega los fragmentos de `src/` en un contexto de Node igual que lo hace la página (mismo scope global, mismo orden de inclusión).
- `ecuaciones.test.js`: parser y maquetador de ecuaciones (`parsearExpr`, `armarCaja`) de `diagrama-bloque`.
- `logica.test.js`: evaluación de compuertas (`evalGate`), simplificación booleana exacta por Quine–McCluskey (`simplify`) y tablas de verdad (`truthTable`) de `simulador-logico`.
- `mason.test.js`: búsqueda de trayectorias, lazos, determinante Δ y armado de ecuaciones (`analizar`, `producto`) de `diagrama-señales`.
- `ruteo.test.js`: el ruteo de flechas de bloques (`comun/ruteo-bloques.js`, que comparten el editor y el equivalente de señales): sale y llega por los puertos en ángulo recto, esquiva el bloque del medio, no lee `S`, rutear sólo algunas flechas deja las demás como estaban, y cuando todos los candidatos fijos chocan el rodeo (A*) da la vuelta por afuera; `ptsPrevia` (la vista previa) rodea el elemento de origen si el cursor queda detrás del puerto y, si no, hace el recorrido de siempre.
- `lgr.test.js`: el lugar geométrico de las raíces (`src/lgr/calculo.js`): lectura de polinomios y listas, tope de grado, un caso de libro resuelto a mano (también escalado por 10^±4 y 10^±6), polos y ceros cancelados, la coma decimal y la K en la entrada, y los ejercicios de la Guía 3 contra referencias independientes (otro resolvedor de raíces para el K crítico y la estabilidad por tramos, perturbación de K para los ángulos de salida, raíz doble en los puntos de ruptura) y la condición de ángulo sobre las ramas trazadas.

Fijan los mismos resultados que `correccion.spec.js` verifica en el navegador, sin el costo de
levantar Chromium o Firefox. Si alguno de esos archivos empezara a tocar el DOM al cargarse, estas
pruebas fallan: es la señal de que dejó de ser puro y hay que probarlo desde `specs/`.

## Agregar una prueba

1. Elegir el spec de la herramienta (o crear `specs/<algo>.spec.js`).
2. Abrir con `abrir(page, "archivo.html")`.
3. Armar el estado con `page.evaluate` (`cargarEjemplo`, `abrirTexto` con un JSON chico) y comprobar
   contra un resultado **conocido de antemano** (la tabla de un sumador, el Δ de Mason a mano), no
   contra lo que el programa devuelve hoy.
4. Un bug arreglado → una prueba que falle sin el arreglo.

## En GitHub Actions

`.github/workflows/tests.yml` corre en push a `main` y `features/**`, en pull requests y a mano
(*Actions → Pruebas → Run workflow*). Pasos: verifica que las páginas estén al día con `src/`
(`node src/construir.js --comprobar`), que el JS de cada página parsea, corre las unidades
(`node --test`, sin navegador), instala
dependencias (`npm ci`, usa `package-lock.json`), instala Chromium y Firefox y corre la suite en los dos. Si algo falla,
sube el reporte y las trazas como artefacto (`reporte-playwright`, 14 días). **No despliega**: eso
sigue siendo `static.yml`, que al pushear a `main` comprueba que las páginas coincidan con `src/`,
corre las pruebas unitarias y publica sólo el sitio (`node src/sitio.js _sitio`).

Para impedir que se mezcle a `main` algo que no pasa: *Settings → Branches → Branch protection rule*
sobre `main` → *Require status checks to pass* → elegir «pruebas».
