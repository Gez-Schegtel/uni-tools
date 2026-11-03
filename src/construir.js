#!/usr/bin/env node
/* Arma las páginas de la raíz a partir de las fuentes de src/.

   Cada herramienta sigue siendo un único HTML autocontenido: este script sólo
   junta los pedazos (el CSS, los módulos de JavaScript compartidos y los propios)
   y escribe el resultado en la raíz, que es lo que se publica y lo que se abre
   con doble clic. Es Node pelado: sin npm, sin dependencias.

     node src/construir.js              arma las páginas que cambiaron
     node src/construir.js --comprobar  no escribe nada: falla si alguna página
                                        de la raíz no coincide con sus fuentes

   Las fuentes se juntan con una línea que tiene sólo una directiva:

     <!-- @incluir comun/ventana-abrir.html titulo="Abrir circuito" -->
     /* @incluir comun/base.css *\/
     // @incluir comun/historial.js

   La ruta es relativa a src/. El archivo incluido reemplaza la línea entera, tal
   cual, sin tocar la sangría. Los parámetros opcionales (nombre="valor") se
   reemplazan donde el archivo incluido diga {{nombre}}; un {{nombre}} sin valor o
   un parámetro que no se usa son errores, para que nada quede a medio armar. */
"use strict";
const fs = require("fs"), path = require("path");

const SRC = __dirname, RAIZ = path.resolve(SRC, "..");
/* página de la raíz <- su plantilla en src/ */
const PAGINAS = {
  "diagrama-bloque.html": "bloque/pagina.html",
  "simulador-logico.html": "simulador/pagina.html",
  "diagrama-señales.html": "senales/pagina.html",
  "simulador-lgr.html": "lgr/pagina.html",
};

const DIRECTIVA = /^[ \t]*(?:<!--|\/\*|\/\/)[ \t]*@incluir[ \t]+(\S+)((?:[ \t]+[\w-]+="[^"]*")*)[ \t]*(?:-->|\*\/)?[ \t]*$/;
const PARAMETRO = /([\w-]+)="([^"]*)"/g;

/* Todo el JS de una página termina en un único <script>, así que los módulos comparten el
   ámbito global: si dos declaran la misma función, la segunda pisa a la primera sin ningún
   error. Por eso se junta lo que declara cada módulo al nivel de arriba (al principio de
   línea) y se falla si un nombre aparece en dos. Para pisar algo a propósito, el módulo que
   pisa lo dice con un comentario «@pisa nombre». */
const DECLARACION = /^(?:async[ \t]+)?(?:function[ \t]*\*?[ \t]*([\w$]+)|(?:const|let|var|class)[ \t]+([\w$]+))/gm;
function colisiones(modulos) {
  const dueno = new Map(), choques = [];
  for (const { nombre, texto } of modulos) {
    const pisa = new Set([...texto.matchAll(/@pisa[ \t]+([\w$]+)/g)].map(m => m[1]));
    for (const m of texto.matchAll(DECLARACION)) {
      const n = m[1] || m[2];
      if (dueno.has(n) && dueno.get(n) !== nombre && !pisa.has(n)) choques.push(`«${n}» está en ${dueno.get(n)} y en ${nombre}`);
      else dueno.set(n, nombre);
    }
  }
  return choques;
}

function armar(rel, params, pila, modulos) {
  const archivo = path.join(SRC, rel);
  if (pila.includes(archivo)) throw new Error("inclusión circular: " + pila.concat(archivo).map(a => path.relative(SRC, a)).join(" → "));
  if (!fs.existsSync(archivo)) throw new Error(`${path.relative(SRC, pila[pila.length - 1] || archivo)}: no existe ${rel}`);
  let texto = fs.readFileSync(archivo, "utf8");
  if (texto.includes("\r")) throw new Error(rel + " tiene fines de línea CRLF: el proyecto usa LF");
  const usados = new Set();
  texto = texto.replace(/\{\{([\w-]+)\}\}/g, (todo, nombre) => {
    if (!(nombre in params)) throw new Error(`${rel}: falta el parámetro ${nombre}`);
    usados.add(nombre);
    return params[nombre];
  });
  for (const nombre in params) if (!usados.has(nombre)) throw new Error(`${rel}: el parámetro ${nombre} no se usa`);
  return texto.split("\n").map(linea => {
    const m = DIRECTIVA.exec(linea);
    if (!m) return linea;
    const sub = {};
    for (const [, k, v] of m[2].matchAll(PARAMETRO)) sub[k] = v;
    const dentro = armar(m[1], sub, pila.concat(archivo), modulos);
    if (modulos && m[1].endsWith(".js")) modulos.push({ nombre: m[1], texto: dentro });
    return dentro.endsWith("\n") ? dentro.slice(0, -1) : dentro;   // el salto de línea lo pone la directiva
  }).join("\n");
}

module.exports = { armar, colisiones, PAGINAS };
if (require.main === module) principal();

function principal() {
  const comprobar = process.argv.includes("--comprobar");
  let distintas = 0, conChoques = 0;
  for (const [destino, plantilla] of Object.entries(PAGINAS)) {
    const modulos = [];
    const html = armar(plantilla, {}, [], modulos);
    const choques = colisiones(modulos);
    if (choques.length) {
      conChoques++;
      console.error(`✗ ${destino}: nombres globales repetidos entre módulos\n  ` + choques.join("\n  "));
      continue;
    }
    const ruta = path.join(RAIZ, destino);
    const actual = fs.existsSync(ruta) ? fs.readFileSync(ruta, "utf8") : null;
    if (actual === html) continue;
    distintas++;
    if (comprobar) console.error(`✗ ${destino} no coincide con src/${plantilla}: correr «node src/construir.js» y commitear el resultado`);
    else { fs.writeFileSync(ruta, html); console.log(`✓ ${destino}`); }
  }
  if (conChoques || (comprobar && distintas)) process.exit(1);
  if (comprobar) console.log("Las páginas están al día con src/");
  else if (!distintas) console.log("Nada que armar: las páginas ya están al día");
}
