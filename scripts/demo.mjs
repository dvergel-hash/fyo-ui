// Verificación visual de la demo: abre demo/index.html en Chromium sin interfaz, en 1280 y 375 px,
// tema claro y oscuro, y falla ante errores de consola, peticiones fallidas, fuentes que no cargan
// o desborde horizontal. Guarda una captura por combinación.
// Uso: node scripts/demo.mjs [--salida demo-salida]  (sale con código 1 si algo falla).
import { createServer } from "node:http";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { esEjecucionDirecta } from "./ejecucion.mjs";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PESOS = ["400", "500", "600"];
const ANCHO_MINIMO_LOGO = 70;

const COMBINACIONES = [
  { nombre: "1280-claro", ancho: 1280, alto: 900, tema: "light" },
  { nombre: "1280-oscuro", ancho: 1280, alto: 900, tema: "dark" },
  { nombre: "375-claro", ancho: 375, alto: 812, tema: "light" },
  { nombre: "375-oscuro", ancho: 375, alto: 812, tema: "dark" },
];

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

/**
 * Función pura: recibe las métricas de una página y devuelve la lista de problemas (vacía = bien).
 * @param {{ consoleErrors: string[]; failedRequests: string[]; fuentes: { peso: string; estado: string }[];
 *   scrollWidth: number; clientWidth: number; anchoLogo?: number | null }} m
 * @returns {string[]}
 */
export function analizarMetricas(m) {
  const problemas = [];
  for (const e of m.consoleErrors) problemas.push(`Error de consola: ${e}`);
  for (const r of m.failedRequests) problemas.push(`Petición fallida: ${r}`);
  for (const peso of PESOS) {
    const fuente = m.fuentes.find((f) => String(f.peso) === peso);
    const estado = fuente ? fuente.estado : "ausente";
    if (estado !== "loaded") problemas.push(`Poppins ${peso} no cargó (estado: ${estado})`);
  }
  if (m.scrollWidth > m.clientWidth) {
    problemas.push(`Desborde horizontal: scrollWidth ${m.scrollWidth} > clientWidth ${m.clientWidth}`);
  }
  // Mínimo digital del logo según el manual de marca (pág. 14). Solo si se midió (undefined = no aplica).
  if (m.anchoLogo === null) problemas.push("No se encontró el logo del encabezado (.encabezado .marca img)");
  else if (m.anchoLogo !== undefined && m.anchoLogo < ANCHO_MINIMO_LOGO) {
    problemas.push(`El logo del encabezado mide ${m.anchoLogo} px de ancho (mínimo ${ANCHO_MINIMO_LOGO} px)`);
  }
  return problemas;
}

/** Servidor estático mínimo sobre la raíz del repositorio (sólo 127.0.0.1, puerto libre). */
function servirRaiz() {
  const servidor = createServer((req, res) => {
    try {
      // Dentro del try: una URL mal codificada (%E0%A4%A) es un 404, no una excepción del servidor.
      const ruta = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      const archivo = normalize(join(RAIZ, ruta));
      const dentro = archivo === resolve(RAIZ) || archivo.startsWith(resolve(RAIZ) + sep);
      if (!dentro || !statSync(archivo).isFile()) throw new Error("no es un archivo");
      res.writeHead(200, { "content-type": TIPOS[extname(archivo)] ?? "application/octet-stream" });
      res.end(readFileSync(archivo));
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("No encontrado");
    }
  });
  return new Promise((ok) => servidor.listen(0, "127.0.0.1", () => ok(servidor)));
}

/** Métricas medidas dentro de la página (fuentes, desborde y tabla densa). */
async function medir(page) {
  return page.evaluate(async (pesos) => {
    await document.fonts.ready;
    // Fuerza la carga de los tres pesos aunque alguno no se use en la vista inicial.
    await Promise.all(pesos.map((p) => document.fonts.load(`${p} 16px Poppins`).catch(() => [])));
    const caras = [...document.fonts].filter((f) => f.family.replace(/["']/g, "") === "Poppins");
    const fuentes = pesos.map((peso) => {
      const cara = caras.find((f) => String(f.weight) === peso);
      const disponible = document.fonts.check(`${peso} 16px Poppins`);
      const estado = !cara ? "ausente" : cara.status === "loaded" && !disponible ? "no disponible" : cara.status;
      return { peso, estado };
    });
    const html = document.documentElement;
    const contenedor = document.querySelector("#tabla .tabla-contenedor");
    const tabla = contenedor?.querySelector("table");
    const logo = document.querySelector(".encabezado .marca img");
    const encabezado = document.querySelector(".encabezado");
    const anchoEncabezado = encabezado?.scrollWidth ?? 0;
    // Espacio libre alrededor del logo del encabezado (área de protección): hasta el borde del encabezado,
    // hasta el separador del nombre del producto y hasta el elemento más cercano de la fila de abajo.
    let libre = null;
    if (logo && encabezado) {
      const l = logo.getBoundingClientRect();
      const e = encabezado.getBoundingClientRect();
      const producto = encabezado.querySelector(".marca-producto")?.getBoundingClientRect();
      const debajo = [...encabezado.children]
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.top >= l.bottom - 1)
        .map((r) => r.top);
      const r = (n) => Math.round(n * 10) / 10;
      libre = {
        alto: r(e.height),
        arriba: r(l.top - e.top),
        izquierda: r(l.left - e.left),
        // Sin nombre del producto visible (oculto hasta 600 px), no hay separador que medir.
        separador: producto && producto.width > 0 ? r(producto.left - l.right) : null,
        abajo: r((debajo.length ? Math.min(...debajo) : e.bottom) - l.bottom),
      };
    }
    return {
      libreLogo: libre,
      fuentes,
      anchoLogo: logo ? Math.round(logo.getBoundingClientRect().width * 10) / 10 : null,
      encabezadoDesborda: anchoEncabezado > (document.querySelector(".encabezado")?.clientWidth ?? 0),
      scrollWidth: Math.max(html.scrollWidth, document.body.scrollWidth),
      clientWidth: html.clientWidth,
      tablaDensa: contenedor && tabla
        ? {
            anchoTabla: Math.round(tabla.getBoundingClientRect().width),
            anchoContenedor: contenedor.clientWidth,
            scrollContenedor: contenedor.scrollWidth,
            scrollInterno: contenedor.scrollWidth > contenedor.clientWidth,
          }
        : null,
    };
  }, PESOS);
}

/**
 * Abre la demo en las cuatro combinaciones (de a un navegador por vez) y analiza las métricas.
 * @param {{ salida?: string }} [opciones]
 * @returns {Promise<{ ok: boolean; problemas: string[]; medidas: object[] }>}
 */
export async function ejecutarDemo({ salida = "demo-salida" } = {}) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("No se pudo cargar Playwright: ejecutá npm install && npx playwright install chromium");
  }
  const dirSalida = resolve(RAIZ, salida);
  mkdirSync(dirSalida, { recursive: true });
  const servidor = await servirRaiz();
  const url = `http://127.0.0.1:${servidor.address().port}/demo/index.html`;
  const problemas = [];
  const medidas = [];
  try {
    for (const c of COMBINACIONES) {
      const navegador = await chromium.launch({ headless: true });
      try {
        const contexto = await navegador.newContext({
          viewport: { width: c.ancho, height: c.alto },
          colorScheme: c.tema,
          reducedMotion: "reduce",
        });
        const page = await contexto.newPage();
        const consoleErrors = [];
        const failedRequests = [];
        page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
        page.on("pageerror", (err) => consoleErrors.push(err.message));
        page.on("requestfailed", (req) => failedRequests.push(`${req.url()} (${req.failure()?.errorText ?? "falló"})`));
        page.on("response", (res) => { if (res.status() >= 400) failedRequests.push(`${res.url()} (HTTP ${res.status()})`); });

        await page.goto(url, { waitUntil: "load" });
        const m = await medir(page);
        await page.screenshot({ path: join(dirSalida, `${c.nombre}.png`), fullPage: true });

        // El visor abre con showModal() sin errores; captura aparte del diálogo abierto.
        await page.click("#abrir-visor");
        const abierto = await page.evaluate(() => document.querySelector("dialog.visor-pdf")?.open === true);
        if (!abierto) consoleErrors.push("El visor no se abrió con showModal()");
        await page.screenshot({ path: join(dirSalida, `${c.nombre}-visor.png`) });

        const propios = analizarMetricas({ consoleErrors, failedRequests, ...m });
        for (const p of propios) problemas.push(`[${c.nombre}] ${p}`);
        if (m.encabezadoDesborda) problemas.push(`[${c.nombre}] El encabezado desborda horizontalmente`);
        medidas.push({ combinacion: c.nombre, scrollWidth: m.scrollWidth, clientWidth: m.clientWidth, fuentes: m.fuentes, tablaDensa: m.tablaDensa, anchoLogo: m.anchoLogo, libreLogo: m.libreLogo });
        await contexto.close();
      } finally {
        await navegador.close();
      }
    }
  } finally {
    await new Promise((ok) => servidor.close(ok));
  }
  return { ok: problemas.length === 0, problemas, medidas };
}

if (esEjecucionDirecta(import.meta.url, process.argv[1])) {
  const i = process.argv.indexOf("--salida");
  const salida = i > -1 && process.argv[i + 1] ? process.argv[i + 1] : "demo-salida";
  let r;
  try {
    r = await ejecutarDemo({ salida });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  for (const m of r.medidas) {
    const t = m.tablaDensa;
    const fuentes = m.fuentes.map((f) => `${f.peso}:${f.estado}`).join(" ");
    console.log(
      `${m.combinacion.padEnd(12)} página ${m.scrollWidth}/${m.clientWidth} px · logo ${m.anchoLogo} px` +
        (m.libreLogo ? ` (encabezado ${m.libreLogo.alto} px; libre: arriba ${m.libreLogo.arriba}, izquierda ${m.libreLogo.izquierda}, separador ${m.libreLogo.separador}, abajo ${m.libreLogo.abajo})` : "") +
        ` · fuentes ${fuentes}` +
        (t ? ` · tabla ${t.anchoTabla} px en contenedor ${t.anchoContenedor} px (scroll interno: ${t.scrollInterno ? "sí" : "no"})` : ""),
    );
  }
  for (const p of r.problemas) console.log(`  ✗ ${p}`);
  console.log(r.ok ? `\nDemo verificada. Capturas en ${salida}/.` : "\nHay problemas en la demo.");
  process.exit(r.ok ? 0 : 1);
}
