// Pruebas del chequeo de documentación: tokens y clases del CSS que el README no documenta,
// y valores de la tabla de tokens que no coinciden con css/tokens.css.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  tokensSinDocumentar,
  clasesSinDocumentar,
  valoresDesactualizados,
} from "../scripts/readme.mjs";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

const TICK = "`";
const celda = (v) => (v === "igual" ? v : TICK + v + TICK);
const fila = (n, c, o = "igual") => `| ${TICK}${n}${TICK} | ${celda(c)} | ${celda(o)} | uso |\n`;
const TABLA = "| Token | Claro | Oscuro | Uso |\n|---|---|---|---|\n";

test("tokensSinDocumentar: devuelve los tokens declarados que no tienen fila en la tabla", () => {
  const css = ":root { --a: 1; --b: 2; --c: var(--a); }";
  assert.deepEqual(tokensSinDocumentar(css, TABLA + fila("--a", "1") + fila("--c", "var(--a)")), ["--b"]);
});

test("tokensSinDocumentar: mencionarlo en prosa no alcanza", () => {
  const css = ":root { --a: 1; }";
  assert.deepEqual(tokensSinDocumentar(css, `Usá ${TICK}--a${TICK} para todo.`), ["--a"]);
});

test("tokensSinDocumentar: no confunde un token con otro que lo contiene como prefijo", () => {
  const css = ":root { --texto: #000; --texto-xs: 1px; }";
  assert.deepEqual(tokensSinDocumentar(css, TABLA + fila("--texto-xs", "1px")), ["--texto"]);
  assert.deepEqual(tokensSinDocumentar(css, TABLA + fila("--texto", "#000")), ["--texto-xs"]);
});

test("tokensSinDocumentar: cuenta cada token una sola vez y ordenado", () => {
  const css = ":root { --z: 1; --b: 1; } @media (x) { :root { --b: 2; } }";
  assert.deepEqual(tokensSinDocumentar(css, ""), ["--b", "--z"]);
});

const CSS_VALORES = `:root { --a: #111111; --c: var(--a); --d: 4px; }
@media (prefers-color-scheme: dark) { :root { --a: #eeeeee; --c: var(--a); } }`;

test("valoresDesactualizados: pasa cuando claro y oscuro coinciden (var() e 'igual' incluidos)", () => {
  const readme = TABLA + fila("--a", "#111111", "#eeeeee") + fila("--c", "var(--a)", "var(--a)") + fila("--d", "4px");
  assert.deepEqual(valoresDesactualizados(CSS_VALORES, readme), []);
});

test("valoresDesactualizados: detecta un valor claro viejo", () => {
  const readme = TABLA + fila("--a", "#222222", "#eeeeee");
  const r = valoresDesactualizados(CSS_VALORES, readme);
  assert.equal(r.length, 1);
  assert.match(r[0], /--a.*claro.*#222222.*#111111/);
});

test("valoresDesactualizados: detecta un valor oscuro viejo y un 'igual' que ya no lo es", () => {
  const readme = TABLA + fila("--a", "#111111", "#000000") + fila("--c", "var(--a)");
  const r = valoresDesactualizados(CSS_VALORES, readme).join("\n");
  assert.match(r, /--a.*oscuro/);
  assert.match(r, /--c.*oscuro/);
});

test("valoresDesactualizados: normaliza espacios y avisa de tokens que ya no existen", () => {
  const css = ":root { --v: rgba(0,  0, 0,\n 0.5); }";
  assert.deepEqual(valoresDesactualizados(css, TABLA + fila("--v", "rgba(0, 0, 0, 0.5)")), []);
  const r = valoresDesactualizados(css, TABLA + fila("--v", "rgba(0, 0, 0, 0.5)") + fila("--x", "1")).join();
  assert.match(r, /--x.*no en tokens/);
});

test("clasesSinDocumentar: devuelve las clases de los selectores que el README no menciona", () => {
  const css = `
/* .comentario no cuenta */
.uno { color: red; }
.dos.nivel-ROJO, nav a[aria-current="page"] { background: url("../x/img.webp"); }
@media (max-width: 600px) { .tres { margin: 0.5rem; } }
`;
  assert.deepEqual(clasesSinDocumentar(css, "Clases: `.uno`, `.dos`"), ["nivel-ROJO", "tres"]);
});

test("clasesSinDocumentar: .insignia no da por documentada a .insignia-grande", () => {
  const css = ".insignia-grande { x: 1 } .insignia { x: 1 }";
  assert.deepEqual(clasesSinDocumentar(css, "`.insignia`"), ["insignia-grande"]);
});

test("clasesSinDocumentar: ignora extensiones de archivo y decimales dentro de las reglas", () => {
  const css = ".a { background: url(../marca/f.webp) 0.5s; opacity: .6 }";
  assert.deepEqual(clasesSinDocumentar(css, ".a"), []);
});

test("el README real documenta todos los tokens de css/tokens.css en su tabla", () => {
  assert.deepEqual(tokensSinDocumentar(leer("../css/tokens.css"), leer("../README.md")), []);
});

test("el README real tiene los valores de la tabla al día con css/tokens.css", () => {
  assert.deepEqual(valoresDesactualizados(leer("../css/tokens.css"), leer("../README.md")), []);
});

test("el README real documenta todas las clases de css/base.css y css/componentes.css", () => {
  const css = leer("../css/base.css") + "\n" + leer("../css/componentes.css");
  assert.deepEqual(clasesSinDocumentar(css, leer("../README.md")), []);
});
