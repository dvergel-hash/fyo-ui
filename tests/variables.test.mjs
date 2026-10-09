// Pruebas de la verificación de variables, imports y selectores de dominio del CSS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  variablesDefinidas,
  variablesUsadas,
  resolverImports,
  verificarVariables,
} from "../scripts/variables.mjs";

const cssReal = fileURLToPath(new URL("../css", import.meta.url));

function dirTemporal(archivos) {
  const dir = mkdtempSync(join(tmpdir(), "fyo-ui-"));
  for (const [nombre, contenido] of Object.entries(archivos)) {
    writeFileSync(join(dir, nombre), contenido);
  }
  return dir;
}

test("variablesDefinidas: junta los nombres declarados en cualquier bloque", () => {
  const css = `:root { --a: 1px; --b: red; }
    @media (prefers-color-scheme: dark) { :root { --b: blue; --c: 2px; } }`;
  assert.deepEqual([...variablesDefinidas(css)].sort(), ["--a", "--b", "--c"]);
});

test("variablesDefinidas: ignora comentarios", () => {
  assert.deepEqual([...variablesDefinidas("/* --x: 1; */ :root { --y: 1; }")], ["--y"]);
});

test("variablesUsadas: cuenta todas por defecto, incluso con respaldo", () => {
  const css = `p { margin: var(--a); padding: var(--b, 1px); color: var( --c ); }`;
  assert.deepEqual([...variablesUsadas(css)].sort(), ["--a", "--b", "--c"]);
});

test("variablesUsadas: con { conRespaldo: false } ignora las que traen valor de respaldo", () => {
  const css = `p { margin: var(--a); padding: var(--b, 1px); }`;
  assert.deepEqual([...variablesUsadas(css, { conRespaldo: false })], ["--a"]);
});

test("variablesUsadas: una variable usada pero no definida se distingue", () => {
  const css = `:root { --a: 1px; } p { margin: var(--a) var(--b); }`;
  const sinDefinir = [...variablesUsadas(css)].filter((v) => !variablesDefinidas(css).has(v));
  assert.deepEqual(sinDefinir, ["--b"]);
});

test("resolverImports: devuelve los archivos importados y lanza si falta alguno", () => {
  const dir = dirTemporal({
    "uno.css": "a { color: red; }",
    "indice.css": `@import "./uno.css";\n@import url("./uno.css");`,
    "roto.css": `@import "./no-existe.css";`,
  });
  try {
    const lista = resolverImports(join(dir, "indice.css"));
    assert.equal(lista.length, 2);
    assert.ok(lista.every((r) => r === join(dir, "uno.css")));
    assert.throws(() => resolverImports(join(dir, "roto.css")), /no-existe\.css/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verificarVariables: informa imports rotos y variables sin definir", () => {
  const dir = dirTemporal({
    "a.css": `@import "./falta.css"; :root { --x: 1px; } p { margin: var(--x) var(--y); }`,
  });
  try {
    const r = verificarVariables(dir);
    assert.equal(r.ok, false);
    assert.equal(r.importsRotos.length, 1);
    assert.match(r.importsRotos[0], /falta\.css/);
    assert.deepEqual(r.sinDefinir, ["--y"]);
    assert.deepEqual(r.selectoresDeDominio, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verificarVariables: informa selectores de dominio de la app", () => {
  const dir = dirTemporal({
    "a.css": `.tabla-compras td { color: red; } .insignia.estado-CANCELADA { color: red; }`,
  });
  try {
    const r = verificarVariables(dir);
    assert.equal(r.ok, false);
    assert.deepEqual(r.selectoresDeDominio.sort(), ["estado-CANCELADA", "tabla-compras"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("verificarVariables: un directorio correcto da ok", () => {
  const dir = dirTemporal({
    "a.css": `:root { --x: 1px; } p { margin: var(--x); }`,
  });
  try {
    assert.deepEqual(verificarVariables(dir), {
      ok: true,
      sinDefinir: [],
      importsRotos: [],
      selectoresDeDominio: [],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- css/ real

test("css/ real: variables, imports y selectores de dominio verificados", () => {
  assert.deepEqual(verificarVariables(cssReal), {
    ok: true,
    sinDefinir: [],
    importsRotos: [],
    selectoresDeDominio: [],
  });
});

test("css/fyo.css importa tokens, base y componentes en ese orden", () => {
  const texto = readFileSync(join(cssReal, "fyo.css"), "utf8");
  const imports = [...texto.matchAll(/@import\s+"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(imports, ["./tokens.css", "./base.css", "./componentes.css"]);
});

test("css/ real: tokens.css no se repite en base.css ni componentes.css", () => {
  for (const nombre of ["base.css", "componentes.css"]) {
    const texto = readFileSync(join(cssReal, nombre), "utf8");
    assert.ok(!/:root\s*\{/.test(texto), `${nombre} no debe declarar :root`);
    assert.ok(!/@font-face/.test(texto), `${nombre} no debe declarar @font-face`);
  }
});

test("css/ real: existen las clases de componentes de la API", () => {
  const todo = readdirSync(cssReal)
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(cssReal, f), "utf8"))
    .join("\n");
  const clases = [
    "encabezado", "marca", "marca-producto", "sesion", "contenido", "tarjetas",
    "tarjeta", "panel", "paneles-edicion", "apilado", "fila-formularios", "alerta",
    "lista-alertas", "insignia", "aviso", "leyenda", "etiqueta", "selector-mes",
    "tabla-contenedor", "visor-pdf", "login", "login-tarjeta", "login-logo",
    "formulario-login", "solo-lectores", "error", "ok",
  ];
  for (const c of clases) {
    assert.ok(new RegExp(`\\.${c}(?![\\w-])`).test(todo), `falta la clase .${c}`);
  }
  for (const n of ["ROJO", "AMARILLO", "VERDE"]) {
    assert.ok(todo.includes(`.insignia.nivel-${n}`), `falta .insignia.nivel-${n}`);
  }
});

test("css/ real: el fondo del login se resuelve desde css/ (../marca/)", () => {
  const texto = readFileSync(join(cssReal, "componentes.css"), "utf8");
  assert.ok(texto.includes('url("../marca/fondo-marca.webp")'));
  assert.ok(!texto.includes('url("./marca/'));
});
