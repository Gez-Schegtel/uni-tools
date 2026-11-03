#!/usr/bin/env node
/* Arma la carpeta que se publica en GitHub Pages: los HTML de la raíz y los archivos
   locales que piden (las imágenes del logo). Nada de src/, tests/, backlog/ ni docs.

     node src/sitio.js _sitio     copia el sitio a _sitio/ (la borra antes)
     node src/sitio.js            sólo lista lo que se publicaría

   Falla si una página pide un archivo local que no existe: así un logo renombrado no
   llega roto a Pages. Node pelado, sin dependencias, como construir.js. */
"use strict";
const fs = require("fs"), path = require("path");

const RAIZ = path.resolve(__dirname, "..");

function archivosDelSitio(raiz = RAIZ) {
  const paginas = fs.readdirSync(raiz).filter(f => f.endsWith(".html")).sort();
  const pedidos = new Set();
  const faltan = [];
  for (const p of paginas) {
    const html = fs.readFileSync(path.join(raiz, p), "utf8");
    for (const [, url] of html.matchAll(/\b(?:src|href)="([^"#?]+)"/g)) {
      if (/^[a-z]+:|^\/\//i.test(url) || url.endsWith(".html")) continue;   // externos y enlaces entre páginas
      if (!fs.existsSync(path.join(raiz, url))) faltan.push(`${p} pide ${url}`);
      else pedidos.add(url);
    }
  }
  if (faltan.length) throw new Error("faltan archivos:\n  " + faltan.join("\n  "));
  return paginas.concat([...pedidos].sort());
}

module.exports = { archivosDelSitio };
if (require.main === module) principal();

function principal() {
  const archivos = archivosDelSitio();
  const destino = process.argv[2];
  if (!destino) { archivos.forEach(a => console.log(a)); return; }
  const dir = path.resolve(destino);
  // se borra antes de copiar: nunca la raíz del repo ni una carpeta que la contenga (con «..» se iba todo)
  const desdeDestino = path.relative(dir, RAIZ);      // "" si es la raíz; sin «..» si la contiene
  if (!desdeDestino.startsWith("..") && !path.isAbsolute(desdeDestino))
    throw new Error("el destino no puede ser la raíz del repo ni una carpeta que la contenga");
  fs.rmSync(dir, { recursive: true, force: true });
  for (const a of archivos) {
    fs.mkdirSync(path.dirname(path.join(dir, a)), { recursive: true });
    fs.copyFileSync(path.join(RAIZ, a), path.join(dir, a));
  }
  console.log(`Sitio armado en ${path.relative(process.cwd(), dir) || "."}: ${archivos.length} archivos`);
}
