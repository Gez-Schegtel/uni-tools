# Spec 08 — Correcciones Rápidas de CSS, HTML y Color al Dividir Flechas (`diagrama-bloque`)

- **ID:** `SPEC-08`
- **Estado:** ✅ Completada
- **Referencia en el informe:** `BUG-14`, `BUG-15`, `BUG-16` y Sección `5.4.B.3`
- **Prioridad:** Media / Quick Win (8 / 27)
- **Esfuerzo estimado:** Muy bajo (~15 minutos)
- **Herramientas afectadas:** Diagramas de bloques (`src/bloque/estilos.css`, `src/bloque/pagina.html`, `src/bloque/comandos.js`, `diagrama-bloque.html`)

---

## 1. Historia de Usuario

> **Como** usuario de Diagramas de bloques,  
> **quiero** que el ícono del sumador en el panel derecho tenga su cruz (`×`) centrada, que el archivo HTML generado sea sintácticamente válido sin etiquetas `</head>` duplicadas, y que al partir una flecha coloreada con una bifurcación ambas mitades conserven el color personalizado,  
> **para** contar con una interfaz prolija y consistente al editar diagramas.

---

## 2. Descripción Técnica de los Tres Problemas (Causa Raíz)

1. **`BUG-14` — Cruz (`×`) descentrada en `.signbox .mid` (`src/bloque/estilos.css:17-20`):**
   ```css
   .signbox .mid::before,.signbox .mid::after{content:"";position:absolute;inset:0;margin:auto;width:70%;height:1.2px;background:var(--ink)}
   .signbox .mid::before{transform:rotate(45deg)}
   .signbox .mid::after{transform:rotate(-45deg)}
   .signbox .mid::before,.signbox .mid::after{top:50%}
   ```
   La regla de la línea 17 ya centra las dos barras en el medio del círculo usando `inset: 0; margin: auto; height: 1.2px`. La línea 20 agrega `top: 50%` sin quitar `bottom: 0`, desplazando el centro de rotación al **75 %** de la altura del círculo y haciendo que la cruz se salga por abajo.

2. **`BUG-15` — Etiqueta `</head>` duplicada (`src/bloque/pagina.html:13-14`):**
   ```html
   <!-- @incluir ../comun/estilos-fin.html -->
   </head>
   </head>
   <body>
   ```
   Produce dos cierres `</head>` consecutivos en `diagrama-bloque.html` (líneas 357-358).

3. **`BUG-16` — `splitEdge()` pierde el color personalizado (`src/bloque/comandos.js:29-31`):**
   ```js
   S.edges.push({ id: uid("e"), from: { id: n.id, port: pOut }, to: oldTo,
     label: e.label || "", variant: 0, dashed: !!e.dashed, arrow: e.arrow || "end", width: e.width || 0 });
   ```
   Al partir una flecha insertando un nodo de bifurcación (`n`), copia `label`, `dashed`, `arrow` y `width` a la segunda mitad, pero omite copiar `e.color`.

---

## 3. Especificación de la Solución

1. En [`src/bloque/estilos.css:20`](../src/bloque/estilos.css), eliminar la línea `.signbox .mid::before,.signbox .mid::after{top:50%}`.
2. En [`src/bloque/pagina.html:14`](../src/bloque/pagina.html), eliminar el segundo `</head>`.
3. En [`src/bloque/comandos.js:29-31`](../src/bloque/comandos.js), incluir `color: e.color ? Object.assign({}, e.color) : undefined` al crear la nueva arista en `splitEdge()`:
   ```js
   const nueva = { id: uid("e"), from: { id: n.id, port: pOut }, to: oldTo,
     label: e.label || "", variant: 0, dashed: !!e.dashed, arrow: e.arrow || "end", width: e.width || 0 };
   if (e.color) nueva.color = Object.assign({}, e.color);
   S.edges.push(nueva);
   ```

---

## 4. Plan de Pruebas (Tests a modificar y agregar)

1. **En [`tests/specs/fuentes.spec.js`](../tests/specs/fuentes.spec.js):**
   - En el bucle `for (const p of PAGINAS)` (líneas 16-24), agregar `expect(html.match(/<\/head>/g)).toHaveLength(1);` para asegurar que ninguna página vuelva a tener `</head>` duplicado.
2. **En [`tests/specs/bloque.spec.js`](../tests/specs/bloque.spec.js):**
   - Agregar un test `"al partir una flecha con una bifurcación, ambas mitades conservan el estilo, grosor y color"` que cree una flecha con `dashed: true, width: 3, color: { flecha: "#cc0000" }`, llame a `splitEdge(e.id, pt)` (o inserte una bifurcación sobre ella) y verifique que las dos flechas resultantes tengan `color.flecha === "#cc0000"`, `dashed === true` y `width === 3`.

---

## 5. Criterios de Aceptación

- [x] La cruz `.signbox .mid` del inspector del sumador se ve centrada en el círculo.
- [x] `diagrama-bloque.html` contiene exactamente una etiqueta `</head>`.
- [x] `splitEdge()` preserva `e.color` en la segunda mitad de la flecha dividida.
- [x] `node src/construir.js` actualiza `diagrama-bloque.html` y pasan `fuentes.spec.js` y `bloque.spec.js`.
