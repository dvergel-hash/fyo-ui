// Pruebas de la documentación para consumidores (README, skill fyo-diseno, CHANGELOG):
// la URL de instalación es el asset del Release de la versión actual, los logos no usan `.src`
// (con Turbopack la imagen importada es un string) y el menú no usa `scrollIntoView` (mueve la ventana).
// Los helpers que documenta patrones-next.md se ejecutan acá, con los mismos casos que el patrón.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as modulo from "node:module";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const pkg = JSON.parse(leer("../package.json"));
const VERSION = pkg.version;
const README = leer("../README.md");
const CHANGELOG = leer("../CHANGELOG.md");
const SKILL_DIR = "../plugins/fyo-diseno/skills/fyo-diseno/";
const SKILL = leer(SKILL_DIR + "SKILL.md");
const PATRONES = leer(SKILL_DIR + "patrones-next.md");
const TOKENS = leer(SKILL_DIR + "tokens.md");
const LISTA = leer(SKILL_DIR + "lista-de-control.md");
const PLUGIN = JSON.parse(leer("../plugins/fyo-diseno/.claude-plugin/plugin.json"));

const URL_RELEASE = `https://github.com/dvergel-hash/fyo-ui/releases/download/v${VERSION}/fyo-ui-${VERSION}.tgz`;
const DOCS = { "README.md": README, "SKILL.md": SKILL, "patrones-next.md": PATRONES, "tokens.md": TOKENS, "lista-de-control.md": LISTA };

test("README y SKILL.md instalan el asset del Release de la versión actual", () => {
  assert.ok(README.includes(URL_RELEASE), `el README no menciona ${URL_RELEASE}`);
  assert.ok(SKILL.includes(URL_RELEASE), `SKILL.md no menciona ${URL_RELEASE}`);
});

test("ningún documento recomienda el archivo de etiqueta de GitHub (archive/refs/tags) ni otra versión", () => {
  for (const [nombre, texto] of Object.entries(DOCS)) {
    assert.doesNotMatch(texto, /archive\/refs\/tags/, `${nombre} todavía usa el archivo de etiqueta`);
    for (const m of texto.matchAll(/releases\/download\/v(\d+\.\d+\.\d+)\/fyo-ui-(\d+\.\d+\.\d+)\.tgz/g)) {
      assert.equal(m[1], VERSION, `${nombre}: ${m[0]} no es la versión ${VERSION}`);
      assert.equal(m[2], VERSION, `${nombre}: ${m[0]} no es la versión ${VERSION}`);
    }
  }
});

test("el README explica por qué el asset y qué hosts tiene que alcanzar el build", () => {
  for (const host of ["github.com", "release-assets.githubusercontent.com", "registry.npmjs.org"]) {
    assert.ok(README.includes(host), `el README no menciona ${host}`);
  }
  assert.match(README, /node:22-slim/);
  assert.match(README, /integrity|integridad/i);
});

test("el plugin se versiona junto con el paquete (la versión es lo que entrega la skill nueva)", () => {
  assert.equal(PLUGIN.version, VERSION);
});

test("el CHANGELOG tiene la sección de la versión actual", () => {
  assert.match(CHANGELOG, new RegExp(`^## \\[${VERSION.replace(/\./g, "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m"));
});

test("los documentos no leen `.src` de una imagen importada: usan urlImagen()", () => {
  for (const [nombre, texto] of Object.entries(DOCS)) {
    assert.doesNotMatch(texto, /\b(logo\w*|favicon|fondo\w*)\.src\b/, `${nombre} usa .src de una imagen importada`);
  }
  assert.match(README, /urlImagen\(/);
  assert.match(PATRONES, /<img src=\{urlImagen\(logoColor\)\} alt="fyo" width=\{77\} height=\{36\} \/>/);
});

test("los documentos no llaman a scrollIntoView (desplaza también la ventana)", () => {
  for (const [nombre, texto] of Object.entries(DOCS)) {
    assert.doesNotMatch(texto, /scrollIntoView\s*\(/, `${nombre} recomienda scrollIntoView(...)`);
  }
  assert.match(PATRONES, /desplazamientoParaVer\(/);
  assert.match(README, /desplazamientoParaVer/);
});

test("lista-de-control.md tiene los chequeos de logos con Turbopack y del menú que no mueve la página", () => {
  assert.match(LISTA, /- \[ \] .*logos importados se resuelven a una URL \(no `undefined`\).*Turbopack/);
  assert.match(LISTA, /- \[ \] .*menú no mueve la página al desplazarse/);
});

// ---------------------------------------------------------------------------------------------
// Los helpers del patrón se extraen del Markdown y se ejecutan: así el código documentado no se rompe.

/** Código de la función exportada `nombre` dentro de un bloque ```ts de `md` (hasta la `}` de cierre en la columna 0). */
export function funcionDocumentada(md, nombre) {
  const m = new RegExp(`^export function ${nombre}\\([\\s\\S]*?^\\}$`, "m").exec(md);
  return m ? m[0] : null;
}

const quitarTipos = modulo.stripTypeScriptTypes;

function cargar(nombre) {
  const codigo = funcionDocumentada(PATRONES, nombre);
  assert.ok(codigo, `patrones-next.md no tiene «export function ${nombre}(…)»`);
  const js = quitarTipos(codigo).replace(/^export /, "");
  return new Function(`${js}\nreturn ${nombre};`)();
}

const sinTipos = { skip: typeof quitarTipos === "function" ? false : "este Node no trae module.stripTypeScriptTypes" };

test("funcionDocumentada: extrae la función completa y nada más", () => {
  const md = "```ts\nexport function f(a: number): number {\n  if (a) {\n    return 1;\n  }\n  return 2;\n}\n```\n\nexport function g() {}\n";
  assert.equal(funcionDocumentada(md, "f"), "export function f(a: number): number {\n  if (a) {\n    return 1;\n  }\n  return 2;\n}");
  assert.equal(funcionDocumentada(md, "h"), null);
});

test("urlImagen del patrón: devuelve el string tal cual (Turbopack) o .src (StaticImageData)", sinTipos, () => {
  const urlImagen = cargar("urlImagen");
  assert.equal(urlImagen("/_next/static/media/logo-fyo-color.0a1b2c.png"), "/_next/static/media/logo-fyo-color.0a1b2c.png");
  assert.equal(urlImagen({ src: "/_next/static/media/logo.png", width: 77, height: 36 }), "/_next/static/media/logo.png");
});

test("desplazamientoParaVer del patrón: null si se ve entero, centrado y nunca negativo", sinTipos, () => {
  const d = cargar("desplazamientoParaVer");
  assert.equal(d(0, 363, 100, 80), null);
  assert.equal(d(0, 363, 0, 80), null);
  assert.equal(d(0, 363, 283, 80), null);
  assert.equal(d(100, 363, 100, 80), null);
  assert.equal(d(0, 363, 400, 98), 267.5);
  assert.equal(d(0, 363, 300, 98), 167.5);
  assert.equal(d(300, 100, 250, 50), 225);
  assert.equal(d(300, 100, 280, 50), 255);
  assert.equal(d(200, 363, 10, 60), 0);
});

test("NavPrincipal del patrón desplaza solo la fila del menú, cuando cambia la sección activa", () => {
  const nav = /```tsx\n\/\/ app\/NavPrincipal\.tsx\n([\s\S]*?)```/.exec(PATRONES);
  assert.ok(nav, "no encontré el bloque de app/NavPrincipal.tsx");
  const codigo = nav[1];
  assert.match(codigo, /useEffect\(/);
  assert.match(codigo, /useRef<HTMLElement>\(null\)/);
  assert.match(codigo, /desplazamientoParaVer\(/);
  assert.match(codigo, /\.scrollTo\(\{ left: /);
  assert.match(codigo, /\}, \[activo\]\);/, "el efecto depende solo de la sección activa");
  assert.match(codigo, /if \(!fila \|\| activo === null/, "el efecto no hace nada sin la fila o sin sección activa");
  assert.match(codigo, /if \(destino !== null\)/);
});
