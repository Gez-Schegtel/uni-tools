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
    ajustarVista(); const k0 = vista.k, r = svg.getBoundingClientRect();
    svg.dispatchEvent(new WheelEvent("wheel", { deltaMode: m, deltaY: d, clientX: r.left + 100, clientY: r.top + 100, cancelable: true }));
    return vista.k / k0;
  }, [deltaMode, deltaY]);
  const enPixeles = await zoom(0, -48), enLineas = await zoom(1, -3);
  expect(enLineas).toBeCloseTo(enPixeles, 6);
  expect(enLineas).toBeGreaterThan(1.05);
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
    setTimeout(() => { S.N = "1"; S.D = "s(s+1)(s+2)"; calcular(); }, 300);
  }));
  expect(r.peor).toBeLessThan(400);                  // antes: 1,5 s trabada
  expect(r.enCurso).toBe(false);
  expect(await page.evaluate(() => ramas.length)).toBe(3);
});

test("Inicio, la ayuda con ? y Esc, y los atajos no actúan mientras se escribe", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator("#b-inicio")).toBeVisible();
  await page.keyboard.press("?");
  await expect(page.locator("#ov-help")).toHaveClass(/show/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#ov-help")).not.toHaveClass(/show/);
  await page.click("#i-N");
  await page.keyboard.type("?");                       // en un campo, «?» es texto
  await expect(page.locator("#ov-help")).not.toHaveClass(/show/);
  await page.click("#b-inicio");
  await expect(page).toHaveURL(/index\.html$/);
});

test("el SVG exportado trae la leyenda y el ejercicio, y se vuelve a abrir igual", async ({ page }) => {
  await page.goto(URL);
  await page.click("#m-zp");
  await page.fill("#i-Z", "-1"); await page.fill("#i-P", "0; -3+2j; -3-2j"); await page.press("#i-P", "Enter");
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.click("#e-svg")]);
  expect(descarga.suggestedFilename()).toBe("lugar-de-raices.svg");
  const txt = require("fs").readFileSync(await descarga.path(), "utf8");
  expect(txt).toContain('<metadata id="uni-tools-datos">');
  expect(txt).toContain(">asíntotas</text>");
  expect(await page.evaluate((t) => !new DOMParser().parseFromString(t, "image/svg+xml").querySelector("parsererror"), txt)).toBe(true);
  await page.evaluate(() => { S.modo = "ec"; S.N = "1"; S.D = "s+1"; pasarAInputs(); calcular(); });
  await page.locator("#a-archivo").setInputFiles({ name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from(txt) });
  await expect(page.locator("#toast")).toContainText("Abierto");
  expect(await page.evaluate(() => [S.modo, S.Z, S.P])).toEqual(["zp", "-1", "0; -3+2j; -3-2j"]);
  // un archivo de otra herramienta no se abre
  await page.locator("#a-archivo").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from('{"herramienta":"bloque","nodes":[]}') });
  await expect(page.locator("#toast")).toContainText("no es de Lugar de las raíces");
  expect(await page.evaluate(() => S.modo)).toBe("zp");
});

test("el autoguardado usa la clave común (y migra la vieja) y la portada avisa que hay un ejercicio", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("ya")) {
      sessionStorage.setItem("ya", "1");
      localStorage.clear();
      localStorage.setItem("uni-tools-lgr", JSON.stringify({ modo: "ec", N: "2", D: "s^2+3s", Z: "", P: "", ver: { grid: false } }));
    }
  });
  await page.goto(URL);
  expect(await page.evaluate(() => [S.N, S.D, S.ver.grid])).toEqual(["2", "s^2+3s", false]);
  const claves = await page.evaluate(() => [localStorage.getItem("uni-tools-lgr"), JSON.parse(localStorage.getItem("uni-tools-autoguardado-lgr")).doc.herramienta]);
  expect(claves).toEqual([null, "lgr"]);
  await page.goto("/index.html");
  await expect(page.locator('a[data-auto="lgr"] .guardado')).toContainText("ejercicio guardado");
});

test("atajos del LGR: F encuadra, + y − hacen zoom, D pliega los pasos", async ({ page }) => {
  await page.goto(URL);
  const k0 = await page.evaluate(() => vista.k);
  await page.keyboard.press("+");
  expect(await page.evaluate(() => vista.k)).toBeCloseTo(k0 * 1.3, 6);
  await page.keyboard.press("-");
  await page.keyboard.press("-");
  expect(await page.evaluate(() => vista.k)).toBeCloseTo(k0 / 1.3, 6);
  await page.keyboard.press("f");
  expect(await page.evaluate(() => vista.k)).toBeCloseTo(k0, 6);
  await page.keyboard.press("d");
  await expect(page.locator("#detalles")).toHaveClass(/collapsed/);
});

test("entrar y salir del LGR sin tocar nada no deja nada guardado", async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem("ya")) { sessionStorage.setItem("ya", "1"); localStorage.clear(); } });
  await page.goto(URL);
  await page.evaluate(() => dispatchEvent(new Event("pagehide")));
  expect(await page.evaluate(() => localStorage.getItem("uni-tools-autoguardado-lgr"))).toBeNull();
  await page.fill("#i-N", "2");                        // un cambio sí se guarda
  await expect.poll(() => page.evaluate(() => localStorage.getItem("uni-tools-autoguardado-lgr"))).not.toBeNull();
});
