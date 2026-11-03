/* Simulador del lugar geométrico de las raíces (simulador-lgr.html): la página, no la
   matemática (esa está en tests/unidades/lgr.test.js). */
const { test, expect } = require("@playwright/test");

const URL = "/simulador-lgr.html";
function vigilar(page) {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  return errores;
}

test("todos los ejemplos se calculan y dibujan sin errores, con los nueve pasos", async ({ page }) => {
  const errores = vigilar(page);
  await page.goto(URL);
  const n = await page.locator("#ejemplos option").count();
  for (let i = 0; i < n - 1; i++) {
    await page.selectOption("#ejemplos", String(i));
    await expect(page.locator("#vacio")).toBeHidden();
    expect(await page.locator("details.paso").count()).toBe(9);
  }
  expect(errores).toEqual([]);
});

test("un estado guardado roto o de otra versión no rompe la página", async ({ page }) => {
  const errores = vigilar(page);
  await page.addInitScript(() => localStorage.setItem("uni-tools-lgr", JSON.stringify(
    { modo: "zp", N: 5, D: null, Z: 7, P: ["x"], ver: { grid: "sí", asint: false } })));
  await page.goto(URL);
  await expect(page.locator("#msj")).not.toContainText("is not a function");
  await expect(page.locator("#i-Z")).toHaveValue("");                 // lo que no era texto se descarta
  expect(await page.evaluate(() => S.ver)).toEqual({ asint: false, vals: true, flechas: true, grid: true });
  expect(errores).toEqual([]);
});

test("un grado desmesurado avisa enseguida en vez de trabar la página", async ({ page }) => {
  await page.goto(URL);
  await page.click("#m-ec");
  await page.fill("#i-N", "1");
  const t0 = Date.now();
  await page.fill("#i-D", "s^300+1");
  await page.press("#i-D", "Enter");
  await expect(page.locator("#msj")).toContainText("no puede pasar de 20");
  expect(Date.now() - t0).toBeLessThan(2000);
  await expect(page.locator("#i-D")).toHaveClass(/mal/);
});

test("la rueda en líneas (Firefox) hace el mismo zoom que en píxeles", async ({ page }) => {
  await page.goto(URL);
  const zoom = (deltaMode, deltaY) => page.evaluate(([m, d]) => {
    ajustarVista(); const k0 = V.k, r = svg.getBoundingClientRect();
    svg.dispatchEvent(new WheelEvent("wheel", { deltaMode: m, deltaY: d, clientX: r.left + 100, clientY: r.top + 100, cancelable: true }));
    return V.k / k0;
  }, [deltaMode, deltaY]);
  const enPixeles = await zoom(0, -48), enLineas = await zoom(1, -3);
  expect(enLineas).toBeCloseTo(enPixeles, 6);
  expect(enLineas).toBeGreaterThan(1.05);
});

test("exporta un SVG válido", async ({ page }) => {
  await page.goto(URL);
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.click("#e-svg")]);
  const txt = require("fs").readFileSync(await descarga.path(), "utf8");
  expect(await page.evaluate((t) => !new DOMParser().parseFromString(t, "image/svg+xml").querySelector("parsererror"), txt)).toBe(true);
});

test("trazar un grado alto no traba la página, y un cálculo nuevo abandona el trazado anterior", async ({ page }) => {
  await page.goto(URL);
  await page.click("#m-ec");
  const r = await page.evaluate(() => new Promise((listo) => {
    let ult = performance.now(), peor = 0;
    const t0 = ult;
    const muestra = () => {
      const a = performance.now(); peor = Math.max(peor, a - ult); ult = a;
      if (a - t0 < 1500) setTimeout(muestra, 5); else listo({ peor, enCurso: !!trazadoEnCurso });
    };
    setTimeout(muestra, 5);
    setTimeout(() => { S.N = "s+1"; S.D = "s^20+3s+7"; calcular(); }, 30);
    // a mitad del trazado se cambia la entrada: el viejo se abandona y queda el del ejemplo chico
    setTimeout(() => { S.D = "s(s+1)(s+2)"; calcular(); }, 300);
  }));
  expect(r.peor).toBeLessThan(400);                  // antes: 1,5 s trabada
  expect(r.enCurso).toBe(false);
  expect(await page.evaluate(() => ramas.length)).toBe(3);
});
