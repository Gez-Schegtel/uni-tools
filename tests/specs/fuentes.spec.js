/* Las páginas de la raíz se arman con src/construir.js: tienen que estar al día con sus
   fuentes y no pueden quedar con restos del armado. */
const { test, expect } = require("@playwright/test");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");

const RAIZ = path.resolve(__dirname, "..", "..");
const PAGINAS = ["diagrama-bloque.html", "simulador-logico.html", "diagrama-señales.html", "simulador-lgr.html"];

test("las páginas de la raíz coinciden con lo que arma src/construir.js", () => {
  // si falla: correr «node src/construir.js» y commitear las páginas que cambien
  const salida = execFileSync(process.execPath, [path.join(RAIZ, "src", "construir.js"), "--comprobar"], { encoding: "utf8" });
  expect(salida).toContain("al día");
});

for (const p of PAGINAS) {
  test(`${p}: sin directivas ni parámetros sin resolver, con LF y un solo <script>`, () => {
    const html = fs.readFileSync(path.join(RAIZ, p), "utf8");
    expect(html).not.toMatch(/@incluir/);
    expect(html).not.toMatch(/\{\{[\w-]+\}\}/);
    expect(html).not.toContain("\r");
    expect(html.match(/<\/head>/g)).toHaveLength(1);
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).not.toMatch(/<script\s+src|<link[^>]+stylesheet/);
  });
}

test("index.html tampoco tiene <script src> ni hojas de estilo externas", () => {
  const html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
  expect(html).not.toMatch(/<script[^>]+\bsrc\s*=/i);
  expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet["']/i);
});

test("src/sitio.js publica las páginas y sus imágenes, y nada de src/, tests/ ni backlog/", () => {
  const lista = execFileSync(process.execPath, [path.join(RAIZ, "src", "sitio.js")], { encoding: "utf8" }).trim().split("\n");
  const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html"));
  for (const p of paginas) expect(lista).toContain(p);
  expect(lista).toContain("uni-tools-marca.png");
  expect(lista.filter((a) => /^(src|tests|backlog|\.github|\.claude)\//.test(a) || /\.md$/.test(a))).toEqual([]);
});

test("el armado detecta dos módulos que declaran el mismo nombre global", () => {
  const { colisiones } = require(path.join(RAIZ, "src", "construir.js"));
  expect(colisiones([{ nombre: "comun/vista.js", texto: "function fit() {}\nconst a = 1;" },
                     { nombre: "senales/interaccion.js", texto: "  function local() {}\nfunction fit() {}" }]))
    .toEqual(["«fit» está en comun/vista.js y en senales/interaccion.js"]);
  // pisar a propósito se declara con @pisa
  expect(colisiones([{ nombre: "a.js", texto: "function fit() {}" }, { nombre: "b.js", texto: "/* @pisa fit */\nfunction fit() {}" }])).toEqual([]);
});

test("los enlaces del backlog y de la documentación apuntan a archivos que existen", () => {
  const rotos = [];
  const md = ["README.md", "CLAUDE.md", "tests/README.md", ".claude/skills/uni-tools/SKILL.md"]
    .concat(fs.readdirSync(path.join(RAIZ, "backlog")).filter((f) => f.endsWith(".md")).map((f) => "backlog/" + f));
  for (const f of md) {
    const texto = fs.readFileSync(path.join(RAIZ, f), "utf8");
    for (const [, url] of texto.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(url)) continue;                       // enlaces de afuera
      if (!fs.existsSync(path.resolve(path.dirname(path.join(RAIZ, f)), decodeURI(url)))) rotos.push(f + " → " + url);
    }
  }
  expect(rotos).toEqual([]);
});
