// Pruebas de la parte pura de la verificación de la demo (sin navegador) y del HTML de la demo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { analizarMetricas } from "../scripts/demo.mjs";

const FUENTES_OK = [
  { peso: "400", estado: "loaded" },
  { peso: "500", estado: "loaded" },
  { peso: "600", estado: "loaded" },
];

function sanas(cambios = {}) {
  return {
    consoleErrors: [],
    failedRequests: [],
    fuentes: FUENTES_OK,
    scrollWidth: 1280,
    clientWidth: 1280,
    ...cambios,
  };
}

test("analizarMetricas: métricas sanas no tienen problemas", () => {
  assert.deepEqual(analizarMetricas(sanas()), []);
});

test("analizarMetricas: un error de consola es un problema", () => {
  const p = analizarMetricas(sanas({ consoleErrors: ["Uncaught TypeError: x is undefined"] }));
  assert.equal(p.length, 1);
  assert.match(p[0], /x is undefined/);
});

test("analizarMetricas: una petición fallida es un problema", () => {
  const p = analizarMetricas(sanas({ failedRequests: ["file:///demo/../marca/no-existe.png"] }));
  assert.equal(p.length, 1);
  assert.match(p[0], /no-existe\.png/);
});

test("analizarMetricas: una fuente que no está loaded es un problema", () => {
  const fuentes = [FUENTES_OK[0], { peso: "500", estado: "loading" }, FUENTES_OK[2]];
  const p = analizarMetricas(sanas({ fuentes }));
  assert.equal(p.length, 1);
  assert.match(p[0], /500/);
});

test("analizarMetricas: falta una de las tres fuentes es un problema", () => {
  const p = analizarMetricas(sanas({ fuentes: FUENTES_OK.slice(0, 2) }));
  assert.equal(p.length, 1);
  assert.match(p[0], /600/);
});

test("analizarMetricas: desborde horizontal (scrollWidth > clientWidth) es un problema", () => {
  const p = analizarMetricas(sanas({ scrollWidth: 1400, clientWidth: 1280 }));
  assert.equal(p.length, 1);
  assert.match(p[0], /1400/);
  assert.match(p[0], /1280/);
});

test("analizarMetricas: el logo del encabezado por debajo de 70 px de ancho es un problema (manual, pág. 14)", () => {
  assert.deepEqual(analizarMetricas(sanas({ anchoLogo: 77 })), []);
  const p = analizarMetricas(sanas({ anchoLogo: 60 }));
  assert.equal(p.length, 1);
  assert.match(p[0], /logo.*60.*70/);
});

test("analizarMetricas: no encontrar el logo del encabezado es un problema", () => {
  const p = analizarMetricas(sanas({ anchoLogo: null }));
  assert.equal(p.length, 1);
  assert.match(p[0], /logo/);
});

test("analizarMetricas: junta varios problemas a la vez", () => {
  const p = analizarMetricas(
    sanas({ consoleErrors: ["a", "b"], failedRequests: ["c"], scrollWidth: 400, clientWidth: 375 }),
  );
  assert.equal(p.length, 4);
});

const html = readFileSync(fileURLToPath(new URL("../demo/index.html", import.meta.url)), "utf8");

test("demo/index.html: tiene todas las secciones con sus ids", () => {
  const ids = [
    "encabezado",
    "login",
    "tarjetas",
    "avisos-alertas",
    "insignias",
    "tabla",
    "formularios",
    "paneles",
    "visor",
    "tipografia",
    "paleta",
  ];
  for (const id of ids) assert.match(html, new RegExp(`id="${id}"`), `falta la sección ${id}`);
});

test("demo/index.html: enlaza ../css/fyo.css", () => {
  assert.match(html, /<link rel="stylesheet" href="\.\.\/css\/fyo\.css">/);
});

test("demo/index.html: sin rutas absolutas ni URLs externas", () => {
  const sinNamespaces = html.replaceAll("https://www.w3.org/", "");
  for (const prohibido of ['src="/', 'href="/', "http://", "https://"]) {
    assert.ok(!sinNamespaces.includes(prohibido), `contiene ${prohibido}`);
  }
});

test("demo/index.html: la tabla densa tiene un concepto de 40 caracteres e importes de 12 dígitos", () => {
  const conceptos = [...html.matchAll(/<th scope="row">([^<]+)<\/th>/g)].map((m) => m[1]);
  assert.ok(conceptos.some((c) => c.length === 40), "ningún concepto de 40 caracteres");
  assert.match(html, /\$ \d{3}\.\d{3}\.\d{3}\.\d{3},\d{2}/);
});
