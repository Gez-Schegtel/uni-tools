# Backlog Ordenado de Especificaciones e Historias de Usuario — `uni-tools`

Este directorio contiene el backlog completo derivado de [`INFORME_ANALISIS.md`](../INFORME_ANALISIS.md) más los requerimientos adicionales de UX y dominio solicitados, desglosado en **31 especificaciones técnicas e historias de usuario autocontenidas** para poder trabajarlas una por una de forma ordenada, incremental y verificable.

## Criterio de Priorización y Ordenamiento

El orden (`01` a `31`) combina tres factores:
1. **Riesgo e Impacto (Primero lo crítico):** Primero se resuelven los bugs que provocan pérdida silenciosa de datos (`01`), caídas por `TypeError` (`02`), corrupción de estado al cargar (`03`, `04`), resultados incorrectos en tablas de verdad (`05`), bloqueo de edición con el reloj (`06`) o congelamiento del navegador (`07`).
2. **Relación Impacto / Esfuerzo (Quick Wins temprano):** A continuación (`08` a `16`) se ubican las correcciones rápidas de unas pocas líneas en CSS, HTML y manejadores de eventos que tienen bajo riesgo de regresión y alto valor percibido.
3. **Dependencias lógicas:** Las mejoras de dominio (`17` a `19`) y de arquitectura/rendimiento (`20` a `22`) van antes del saneamiento final de la suite de pruebas (`23` a `25`) y del cierre de documentación e higiene (`26`, `27`).

> **Nota sobre los tests:** Cada spec individual (`01` a `22`) incluye su propia sección **"Plan de Pruebas"** con los tests unitarios o E2E que deben agregarse o actualizarse al resolver ese ítem. Además, las specs `23`, `24` y `25` abordan específicamente la corrección de falsos positivos, la eliminación de tests redundantes y la cobertura de funciones que hoy no tienen tests.

---

## Tabla Maestra del Backlog

### Bloque 1 — Bugs Críticos y de Alta Severidad (Integridad de Datos, Caídas y Bloqueos)

| # | Estado | Archivo | Ref. Informe | Tipo | Esfuerzo | Resumen |
| :-: | :-: | :--- | :---: | :---: | :---: | :--- |
| **01** | ⏳ Pendiente | [`01-rechazo-documentos-cruzados-y-preservacion.md`](./01-rechazo-documentos-cruzados-y-preservacion.md) | `BUG-01` + Test `5.2.1` | Bug Crítico + Test | Bajo (15 min) | Evitar que abrir un JSON/SVG de `simulador` en `bloques` (o viceversa) borre el diagrama actual y pise el autoguardado. |
| **02** | ⏳ Pendiente | [`02-validacion-puertos-y-extremos-en-flechas-bloques.md`](./02-validacion-puertos-y-extremos-en-flechas-bloques.md) | `BUG-02` | Bug Crítico | Bajo (15 min) | Validar `from.port` y `to.port` en `depurarFlechas()` y prohibir flechas hacia `"marco"` para evitar `TypeError` en `routeAll()`. |
| **03** | ⏳ Pendiente | [`03-validacion-tipos-y-unicidad-en-nodos-senales.md`](./03-validacion-tipos-y-unicidad-en-nodos-senales.md) | `BUG-10` | Bug Alto | Bajo (15 min) | Validar `n.tipo` en `depurarNodos()` de señales (evitando el falso cartel `"SALIDA"`) y asegurar unicidad de entrada/salida. |
| **04** | ⏳ Pendiente | [`04-sanitizacion-hoja-recuadros-y-biestables-al-cargar.md`](./04-sanitizacion-hoja-recuadros-y-biestables-al-cargar.md) | `BUG-20` | Bug Medio/Alto | Bajo (25 min) | Endurecer `hojaValida()`, aplicar `completarMarco()` al cargar y sanitizar `pins`, `salida`, `salidaNeg` y `rot` en flip-flops. |
| **05** | ⏳ Pendiente | [`05-aislamiento-estado-secuencial-en-tabla-de-verdad.md`](./05-aislamiento-estado-secuencial-en-tabla-de-verdad.md) | `BUG-05` | Bug Alto | Bajo (20 min) | Reiniciar el estado secuencial (`q`, `clkPrev`, `clkArranque`) en cada fila de `truthTable()` para no contaminar filas siguientes. |
| **06** | ⏳ Pendiente | [`06-proteger-foco-inspector-con-reloj-automatico.md`](./06-proteger-foco-inspector-con-reloj-automatico.md) | `BUG-04` | Bug Alto | Medio (30 min) | Impedir que el pulso cada 400 ms del reloj automático destruya el DOM y el foco del panel derecho (`#insp`). |
| **07** | ⏳ Pendiente | [`07-cache-y-cotas-de-seguridad-en-mason.md`](./07-cache-y-cotas-de-seguridad-en-mason.md) | `BUG-03` | Bug Alto / Perf | Medio (40 min) | Cachear `analizar()` de Mason durante arrastres geométricos e imponer topes ante explosión combinatoria en grafos densos. |

---

### Bloque 2 — Quick Wins Visuales, HTML y de Interacción (Alta Facilidad / Bajo Riesgo)

| # | Estado | Archivo | Ref. Informe | Tipo | Esfuerzo | Resumen |
| :-: | :-: | :--- | :---: | :---: | :---: | :--- |
| **08** | ✅ Hecho | [`08-correcciones-rapidas-html-css-y-color-bifurcacion.md`](./08-correcciones-rapidas-html-css-y-color-bifurcacion.md) | `BUG-14`, `BUG-15`, `BUG-16` | Bug Bajo (×3) | Muy bajo (15 min) | Centrar la cruz `×` del sumador en CSS, borrar el `</head>` duplicado en `bloque/pagina.html` y copiar `color` en `splitEdge()`. |
| **09** | ✅ Hecho | [`09-autoguardado-en-deshacer-y-rehacer.md`](./09-autoguardado-en-deshacer-y-rehacer.md) | `BUG-19` | Bug Bajo | Muy bajo (10 min) | Llamar a `autoguardar()` al final de `undo()` y `redo()` para no depender sólo del evento `pagehide`. |
| **10** | ✅ Hecho | [`10-seleccion-por-banda-acumulativa-en-senales.md`](./10-seleccion-por-banda-acumulativa-en-senales.md) | `BUG-09` | Bug Medio | Muy bajo (15 min) | Respetar `Shift` y el modo selección múltiple (`X`) al seleccionar por banda en `diagrama-señales`. |
| **11** | ✅ Hecho | [`11-cierre-limpio-de-rama-nueva-curve-new-en-senales.md`](./11-cierre-limpio-de-rama-nueva-curve-new-en-senales.md) | `BUG-08` | Bug Medio | Bajo (25 min) | Confirmar con `commit()` y limpiar `drag` si el usuario pulsa `Esc` o cambia de herramienta durante `curve-new`. |
| **12** | ✅ Hecho | [`12-cancelacion-de-herramienta-pendiente-en-simulador.md`](./12-cancelacion-de-herramienta-pendiente-en-simulador.md) | `BUG-22` | Bug Bajo | Bajo (15 min) | Limpiar o priorizar `pendiente` en `simulador-logico` para que no se coloque una compuerta vieja al deseleccionar. |
| **13** | ✅ Hecho | [`13-antirebote-en-reloj-de-pulso-simulador.md`](./13-antirebote-en-reloj-de-pulso-simulador.md) | `BUG-17` | Bug Bajo | Bajo (20 min) | Evitar condiciones de carrera y pasos duplicados en `undoStack` al hacer clics rápidos sobre un reloj en modo pulso. |
| **14** | ✅ Hecho | [`14-sincronizacion-editor-doble-clic-al-desplazar-hoja.md`](./14-sincronizacion-editor-doble-clic-al-desplazar-hoja.md) | `BUG-18` | Bug Bajo | Bajo (15 min) | Reposicionar o confirmar el `.editor-hoja` de doble clic cuando se mueve el lienzo con la rueda del mouse. |
| **15** | ✅ Hecho | [`15-validacion-distribuir-y-grilla-en-alinear.md`](./15-validacion-distribuir-y-grilla-en-alinear.md) | `BUG-21` + Test `5.4.A.2` | Bug Bajo + Test | Bajo (25 min) | Exigir ≥ 3 elementos al distribuir (`dh`/`dv`), ajustar todas las alineaciones con `snapV()` y agregar tests de `alinear()`. |
| **16** | ✅ Hecho | [`16-inclusion-de-flechas-y-cables-en-recorte-bboxall.md`](./16-inclusion-de-flechas-y-cables-en-recorte-bboxall.md) | `BUG-12` | Bug Medio | Bajo (20 min) | Incluir los puntos `pts` de flechas y cables en `bboxAll()` para que los lazos externos no se corten al exportar a SVG/PNG. |
| **28** | ✅ Hecho | [`28-simplificacion-panel-sin-duplicar-ni-botones-flecha.md`](./28-simplificacion-panel-sin-duplicar-ni-botones-flecha.md) | Pedido Usuario (1 y 2) | Mejora UI / Panel | Bajo (20 min) | Quitar el botón `#n-dup` (`Duplicar`) en las 3 herramientas y quitar `#e-split`, `#e-alt`, `#e-reset` y `#e-flip` del panel de flechas. |
| **29** | ✅ Hecho | [`29-estabilidad-puertos-sin-titileo-al-pasar-cursor.md`](./29-estabilidad-puertos-sin-titileo-al-pasar-cursor.md) | Pedido Usuario (3) | Bug UX / Interacción | Bajo (25 min) | Eliminar el titileo de los círculos `.port` al pasar el cursor por el perímetro de un elemento en `diagrama-bloque`. |
| **30** | ✅ Hecho | [`30-trayectoria-ortogonal-en-vista-previa-de-conexion.md`](./30-trayectoria-ortogonal-en-vista-previa-de-conexion.md) | Pedido Usuario (4) | Mejora UX / Lienzo | Bajo (25 min) | Hacer que la vista previa `.ghostline` al tirar una conexión salga en la dirección del puerto y se doble siguiendo al mouse. |
| **31** | ⏳ Pendiente | [`31-sumador-sin-contenido-texto-vacio-y-maximo-tres-signos.md`](./31-sumador-sin-contenido-texto-vacio-y-maximo-tres-signos.md) | Pedido Usuario (5, 6 y 7) | Dominio / UX | Bajo (25 min) | Quitar `Contenido` de los sumadores, cambiar `"—vacío—"` por `"vacío"` y exigir que tengan hasta 3 signos (1 lado siempre vacío). |

---

### Bloque 3 — Mejoras de Dominio y Paridad entre Herramientas (Complejidad Media)

| # | Estado | Archivo | Ref. Informe | Tipo | Esfuerzo | Resumen |
| :-: | :-: | :--- | :---: | :---: | :---: | :--- |
| **17** | ⏳ Pendiente | [`17-reglas-completas-de-conexion-en-diagrama-de-bloques.md`](./17-reglas-completas-de-conexion-en-diagrama-de-bloques.md) | `BUG-07` | Bug Medio / Dominio | Medio (45 min) | Completar reglas de conexión en bloques (validar `#e-flip`, entradas en `node`/`io`, salidas únicas, signos de sumador y lazos). |
| **18** | ⏳ Pendiente | [`18-paridad-de-recuadros-marco-en-simulador-logico.md`](./18-paridad-de-recuadros-marco-en-simulador-logico.md) | `BUG-11` | Bug Medio / UI | Medio (45 min) | Habilitar el área de agarre, los tiradores de tamaño y el dibujo por arrastre para recuadros (`marco`) en el simulador. |
| **19** | ⏳ Pendiente | [`19-mejoras-topologicas-en-equivalente-en-bloques.md`](./19-mejoras-topologicas-en-equivalente-en-bloques.md) | `BUG-13` | Bug Medio | Medio (35 min) | Insertar bifurcación antes del rótulo de salida cuando salen lazos de una salida sumada y limpiar bifurcaciones 1→1 superfluas. |

---

### Bloque 4 — Saneamiento Arquitectónico y Rendimiento

| # | Estado | Archivo | Ref. Informe | Tipo | Esfuerzo | Resumen |
| :-: | :-: | :--- | :---: | :---: | :---: | :--- |
| **20** | ⏳ Pendiente | [`20-saneamiento-ciclo-commit-render-y-datos-derivados.md`](./20-saneamiento-ciclo-commit-render-y-datos-derivados.md) | `BUG-06` + Sec. `2.2.B` | Arquitectura | Medio (45 min) | Actualizar geometrías antes de `snapshot()` en `commit()` y no serializar `e.pts` automáticos en `docDatos()`. |
| **21** | ⏳ Pendiente | [`21-optimizacion-hover-sin-redibujado-completo-y-caches-acotadas.md`](./21-optimizacion-hover-sin-redibujado-completo-y-caches-acotadas.md) | Sec. `4.1`, `4.2`, `4.3` | Rendimiento | Medio (45 min) | Evitar redibujar todo el SVG y `#insp` en `pointermove` sin arrastre, acotar `_mcache`/`_bcache` y quitar `unescape()`. |
| **22** | ⏳ Pendiente | [`22-deduplicacion-vista-y-geometria-entre-herramientas.md`](./22-deduplicacion-vista-y-geometria-entre-herramientas.md) | Sec. `4.4` | Mantenibilidad | Medio (40 min) | Unificar `fit()` e `instalarRueda()` de `senales` con `src/comun/vista.js` y centralizar helpers repetidos. |

---

### Bloque 5 — Saneamiento, Optimización y Ampliación de la Suite de Pruebas (`tests/`)

| # | Estado | Archivo | Ref. Informe | Tipo | Esfuerzo | Resumen |
| :-: | :-: | :--- | :---: | :---: | :---: | :--- |
| **23** | ✅ Hecho | [`23-correccion-tests-xss-datos-invalidos-y-esperas-fijas.md`](./23-correccion-tests-xss-datos-invalidos-y-esperas-fijas.md) | Sec. `5.2.2` a `5.2.5` | Tests (Calidad) | Bajo (30 min) | Seleccionar conexiones en el test XSS, corregir `pin: "o"` → `"o0"` en `logica.test.js` y usar `page.clock` en esperas fijas. |
| **24** | ⏳ Pendiente | [`24-eliminacion-de-tests-redundantes-y-migracion-a-unitarios.md`](./24-eliminacion-de-tests-redundantes-y-migracion-a-unitarios.md) | Sec. `5.3` | Tests (Velocidad) | Medio (35 min) | Consolidar `simplify()` y `limpiarNombre()` en `tests/unidades/` y eliminar tests duplicados de pan/rueda y área de impresión. |
| **25** | ⏳ Pendiente | [`25-nuevos-tests-faltantes-de-interaccion-y-oscilacion.md`](./25-nuevos-tests-faltantes-de-interaccion-y-oscilacion.md) | Sec. `5.4` | Tests (Cobertura) | Medio (40 min) | Agregar tests de detección de oscilación (`OSC === true`), rotación/pines de compuertas y botones `#e-reroute`/`#e-auto`. |

---

### Bloque 6 — Documentación e Higiene del Repositorio

| # | Estado | Archivo | Ref. Informe | Tipo | Esfuerzo | Resumen |
| :-: | :-: | :--- | :---: | :---: | :---: | :--- |
| **26** | ⏳ Pendiente | [`26-actualizacion-documentacion-tests-atajos-y-workflows.md`](./26-actualizacion-documentacion-tests-atajos-y-workflows.md) | Sec. `6.1` | Documentación | Bajo (30 min) | Restaurar `CLAUDE.md`, actualizar `tests/README.md`, completar atajos en modales de ayuda (`?`) y ajustar `tests.yml`. |
| **27** | ⏳ Pendiente | [`27-limpieza-de-archivos-huerfanos-y-peso-del-repositorio.md`](./27-limpieza-de-archivos-huerfanos-y-peso-del-repositorio.md) | Sec. `6.2` | Higiene Git | Muy bajo (10 min) | Eliminar `uni-tools-logo.jpg` (2.03 MB sin uso) de Git y limpiar `/node_modules` y `/test-results` huérfanos en la raíz. |

---

## Flujo de Trabajo Recomendado para Cada Spec

1. Leer la spec correspondiente (`backlog/XX-....md`).
2. Realizar los cambios indicados en `src/` (y/o `tests/`).
3. Regenerar las páginas autocontenidas de la raíz cuando se toque `src/`:
   ```bash
   node src/construir.js
   ```
4. Ejecutar las pruebas unitarias y las especificaciones de Playwright afectadas en **ambos navegadores (Chromium y Firefox)**:
   ```bash
   npm --prefix tests run test:unidades
   cd tests && npx playwright test
   ```
5. Marcar los criterios de aceptación de la spec y realizar el commit atómico.
