/* Pruebas de humo: cada página abre sin errores y no pide nada fuera del repo. */
const { test, expect } = require("@playwright/test");

const PAGINAS = ["index.html", "diagrama-bloque.html", "simulador-logico.html", "diagrama-señales.html", "simulador-lgr.html"];

for (const archivo of PAGINAS) {
  test(`${archivo} abre sin errores ni pedidos externos`, async ({ page }) => {
    const errores = [], externos = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errores.push(m.text()); });
    page.on("requestfailed", (r) => errores.push("falló: " + r.url()));
    page.on("request", (r) => { if (!r.url().startsWith("http://localhost")) externos.push(r.url()); });
    await page.goto("/" + encodeURI(archivo));
    await page.waitForLoadState("networkidle");
    expect(errores).toEqual([]);
    expect(externos, "la regla es: nada de CDN ni recursos externos").toEqual([]);
    expect(await page.title()).not.toBe("");
  });
}

test("la portada enlaza a las cuatro herramientas y los enlaces andan", async ({ page, request }) => {
  await page.goto("/index.html");
  const hrefs = await page.$$eval("a.boton", (as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs.sort()).toEqual(["diagrama-bloque.html", "diagrama-señales.html", "simulador-logico.html", "simulador-lgr.html"].sort());
  for (const h of hrefs) {
    const r = await request.get("/" + encodeURI(h));
    expect(r.ok(), h).toBeTruthy();
  }
});

/* SPEC-48: cada página tiene la política de seguridad del contenido y nada de lo que hace la
   herramienta la viola (abrir, dibujar, exportar PNG); con doble clic (file://) el logo se ve. */
for (const archivo of PAGINAS) {
  test(`${archivo}: tiene la CSP y usarla no la viola`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__violaciones = [];
      document.addEventListener("securitypolicyviolation", (e) => window.__violaciones.push(e.violatedDirective + " " + e.blockedURI));
    });
    await page.goto("/" + encodeURI(archivo));
    await page.waitForLoadState("networkidle");
    expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content")).toContain("connect-src 'none'");
    // exportar PNG pasa por una imagen data: y un canvas: tiene que poder
    // (en los diagramas el botón está en un menú plegado: se lo aprieta desde la página)
    if (archivo !== "index.html") {
      const [descarga] = await Promise.all([page.waitForEvent("download"),
        page.evaluate(() => (document.getElementById("e-png") || document.getElementById("b-png")).click())]);
      expect(descarga.suggestedFilename()).toMatch(/\.png$/);
    }
    // una imagen de afuera queda bloqueada (y eso sí es una violación, la única esperada)
    await page.evaluate(() => { const i = new Image(); i.src = "https://ejemplo.invalid/x.png"; });
    await page.waitForTimeout(200);
    const v = await page.evaluate(() => window.__violaciones);
    expect(v.filter((x) => !x.includes("ejemplo.invalid"))).toEqual([]);
    expect(v.some((x) => x.includes("ejemplo.invalid"))).toBe(true);
  });
}

test("con doble clic (file://) la CSP deja ver el logo de la portada", async ({ page }) => {
  const ruta = require("path").resolve(__dirname, "..", "..", "index.html");
  await page.goto("file://" + ruta);
  await expect.poll(() => page.evaluate(() => document.querySelector("img").naturalWidth)).toBeGreaterThan(0);
});

test("los botones Cerrar de las ventanas andan sin onclick escrito en el HTML", async ({ page }) => {
  for (const archivo of ["diagrama-bloque.html", "simulador-logico.html", "diagrama-señales.html", "simulador-lgr.html"]) {
    await page.goto("/" + encodeURI(archivo));
    expect(await page.locator("[onclick]").count()).toBe(0);
    await page.evaluate(() => document.getElementById("ov-help").classList.add("show"));
    await page.click('#ov-help [data-cerrar="ov-help"]');
    await expect(page.locator("#ov-help")).not.toHaveClass(/show/);
  }
});
