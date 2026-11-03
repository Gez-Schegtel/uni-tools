/* Modo oscuro (comun/tema.css, comun/tema.js y la copia de index.html): el botón de la luna y el
   sol, que se recuerde en todas las páginas, que ningún texto de la interfaz quede poco
   visible y que el dibujo y lo que se exporta no cambien. */
const { test, expect } = require("@playwright/test");

const PAGINAS = ["index.html", "diagrama-bloque.html", "simulador-logico.html", "diagrama-señales.html", "simulador-lgr.html"];
const HERRAMIENTAS = PAGINAS.slice(1, 4);
const ir = (page, pag) => page.goto("/" + encodeURI(pag));
function vigilar(page) {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  return errores;
}
const oscuroDesdeElArranque = (page) => page.addInitScript(() => {
  if (!sessionStorage.getItem("ya")) { sessionStorage.setItem("ya", "1"); localStorage.clear(); localStorage.setItem("uni-tools-tema", "oscuro"); }
});

/* Todo texto visible fuera de los dibujos, con su contraste contra lo que tiene detrás (los
   fondos semitransparentes se componen). Lo atenuado a propósito (deshabilitado) no cuenta. */
const textosConPocoContraste = (page, minimo) => page.evaluate((minimo) => {
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const mezclar = (a, b) => [0, 1, 2].map((i) => a[i] * a[3] + b[i] * (1 - a[3]));
  const fondo = (el) => {
    const capas = [];
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c && c[3] > 0) { capas.push(c); if (c[3] >= 1) break; }
    }
    return capas.reverse().reduce((res, c) => mezclar(c, res), [255, 255, 255]);
  };
  const malos = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg")) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === "hidden" || r.bottom < 0 || r.top > innerHeight) continue;
    if (el.closest("[disabled]")) continue;
    let opacidad = 1; for (let e = el; e; e = e.parentElement) opacidad *= +getComputedStyle(e).opacity;
    if (opacidad < 0.5) continue;
    const f = fondo(el), c = mezclar(rgba(cs.color), f);
    const k = (Math.max(lum(c), lum(f)) + 0.05) / (Math.min(lum(c), lum(f)) + 0.05);
    if (k < minimo) malos.push(`${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${[...el.classList].join(".")} «${el.textContent.trim().slice(0, 30)}» ${k.toFixed(2)}`);
  }
  return malos;
}, minimo);

for (const pag of PAGINAS) {
  test(`${pag}: el botón pasa de la luna al sol, y la elección queda guardada`, async ({ page }) => {
    const errores = vigilar(page);
    await ir(page, pag);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-tema", "claro");          // sin elección, claro
    await expect(page.locator("#b-tema .ico-luna")).toBeVisible();
    await expect(page.locator("#b-tema .ico-sol")).toBeHidden();
    await expect(page.locator("#b-tema")).toHaveAttribute("title", "Pasar a modo oscuro");
    await page.click("#b-tema");
    await expect(html).toHaveAttribute("data-tema", "oscuro");
    await expect(page.locator("#b-tema .ico-sol")).toBeVisible();
    await expect(page.locator("#b-tema .ico-luna")).toBeHidden();
    await expect(page.locator("#b-tema")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe("rgb(242, 245, 248)");
    await page.reload();
    await expect(html).toHaveAttribute("data-tema", "oscuro");
    await page.click("#b-tema");
    await expect(html).toHaveAttribute("data-tema", "claro");
    expect(await page.evaluate(() => localStorage.getItem("uni-tools-tema"))).toBe("claro");
    expect(errores).toEqual([]);
  });
}

test("la elección vale para todas las páginas, también las que ya están abiertas", async ({ page, context }) => {
  await ir(page, "diagrama-bloque.html");
  const otra = await context.newPage();
  await ir(otra, "simulador-lgr.html");
  await page.click("#b-tema");
  await expect(otra.locator("html")).toHaveAttribute("data-tema", "oscuro");   // la otra pestaña se entera
  for (const pag of PAGINAS) {
    await ir(page, pag);
    await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
  }
});

for (const pag of HERRAMIENTAS) {
  test(`${pag} en oscuro: ningún texto de la barra, el panel, la paleta, las ventanas o los avisos queda poco visible`, async ({ page }) => {
    const errores = vigilar(page);
    await oscuroDesdeElArranque(page);
    await ir(page, pag);
    await page.waitForFunction(() => typeof S !== "undefined");
    await page.evaluate(() => { const b = document.getElementById("b-example"); if (b) b.click(); });   // los otros arrancan con un ejemplo
    await page.evaluate(() => document.querySelectorAll(".group").forEach((g) => g.classList.remove("collapsed")));
    const malos = [];
    const revisar = async (cuando) => { for (const m of await textosConPocoContraste(page, 4.5)) malos.push(cuando + ": " + m); };
    await revisar("al abrir");
    await page.evaluate(() => { const L = S.nodes || S.nodos; S.sel = [L[1].id]; render(); toast("Un aviso"); });
    await revisar("con algo seleccionado y un aviso");
    await page.evaluate(() => { S.sel = []; render(); });
    const ventanas = await page.evaluate(() => [...document.querySelectorAll(".overlay")].map((o) => o.id));
    for (const id of ventanas) {
      await page.evaluate((id) => {
        if (id === "ov-truth") document.getElementById("b-truth").click();
        else if (id === "ov-mason") document.getElementById("b-mason").click();
        else document.getElementById(id).classList.add("show");
      }, id);
      await revisar("ventana " + id);
      await page.evaluate((id) => document.getElementById(id).classList.remove("show"), id);
    }
    expect(malos).toEqual([]);
    expect(errores).toEqual([]);
  });
}

test("simulador-lgr.html en oscuro: ningún texto de la barra, la entrada, los pasos, la ayuda o los avisos queda poco visible", async ({ page }) => {
  await oscuroDesdeElArranque(page);
  await ir(page, "simulador-lgr.html");
  await page.selectOption("#ejemplos", "2");
  await page.click("#d-abrir");
  const malos = (await textosConPocoContraste(page, 4.5)).map((m) => "pasos: " + m);
  await page.evaluate(() => { document.getElementById("ov-help").classList.add("show"); toast("Un aviso"); });
  malos.push(...(await textosConPocoContraste(page, 4.5)).map((m) => "ayuda: " + m));
  await page.evaluate(() => document.getElementById("ov-help").classList.remove("show"));
  await page.fill("#i-D", "s^300+1"); await page.press("#i-D", "Enter");
  malos.push(...(await textosConPocoContraste(page, 4.5)).map((m) => "error: " + m));
  expect(malos).toEqual([]);
});

test("index.html en oscuro: ningún texto queda poco visible", async ({ page }) => {
  await oscuroDesdeElArranque(page);
  await page.addInitScript(() => localStorage.setItem("uni-tools-autoguardado-bloque", JSON.stringify({ doc: { nodes: [1] } })));
  await ir(page, "index.html");
  await expect(page.locator(".guardado")).toHaveCount(1);
  expect(await textosConPocoContraste(page, 4.5)).toEqual([]);
});

for (const pag of HERRAMIENTAS) {
  test(`${pag}: en oscuro el dibujo conserva sus colores (sólo se ve invertido) y el SVG exportado es idéntico`, async ({ page }) => {
    await ir(page, pag);
    await page.waitForFunction(() => typeof S !== "undefined");
    await page.evaluate(() => { const b = document.getElementById("b-example"); if (b) b.click(); });
    const exportar = () => page.evaluate(() => new XMLSerializer().serializeToString(buildExportSVG().svg));
    const claro = await exportar();
    await page.click("#b-tema");
    const r = await page.evaluate(() => {
      const c = getComputedStyle(document.getElementById("canvas"));
      return { filtro: c.filter, papel: c.getPropertyValue("--paper").trim(), tinta: c.getPropertyValue("--ink").trim(),
               papelInterfaz: getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() };
    });
    expect(r.filtro).toContain("invert");
    expect([r.papel, r.tinta]).toEqual(["#ffffff", "#12181f"]);        // el lienzo, con los tokens claros
    expect(r.papelInterfaz).not.toBe("#ffffff");                        // la interfaz, con los oscuros
    expect(await exportar()).toBe(claro);
  });
}

test("simulador-lgr.html: en oscuro el SVG exportado es idéntico", async ({ page }) => {
  await ir(page, "simulador-lgr.html");
  await page.selectOption("#ejemplos", "2");
  const claro = await page.evaluate(() => svgExportado());
  await page.click("#b-tema");
  expect(await page.evaluate(() => getComputedStyle(document.getElementById("canvas")).filter)).toContain("invert");
  expect(await page.evaluate(() => svgExportado())).toBe(claro);
});
