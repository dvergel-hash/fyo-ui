// Pruebas del contenido del paquete npm (lo que realmente se publica) y de package.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8"));

// `npm pack --dry-run --json`: lista exacta de lo que entraría al tarball.
const [empaque] = JSON.parse(
  execSync("npm pack --dry-run --json", { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
);
const archivos = empaque.files.map((f) => f.path);

const CARPETAS = ["css/", "fonts/", "marca/"];
const SUELTOS = ["README.md", "CHANGELOG.md", "LICENSE", "package.json"];

test("el paquete incluye exactamente css/, fonts/, marca/ y los cuatro archivos sueltos", () => {
  const raros = archivos.filter((a) => !CARPETAS.some((c) => a.startsWith(c)) && !SUELTOS.includes(a));
  assert.deepEqual(raros, [], `archivos que no deberían estar en el paquete: ${raros.join(", ")}`);
  for (const s of SUELTOS) assert.ok(archivos.includes(s), `falta ${s}`);
  for (const c of CARPETAS) assert.ok(archivos.some((a) => a.startsWith(c)), `falta la carpeta ${c}`);
});

test("el paquete no incluye demo/, scripts/, tests/, docs/, plugins/, .claude-plugin/, .github/ ni package-lock.json", () => {
  const carpetas = ["demo", "scripts", "tests", "docs", "plugins", ".claude-plugin", ".github", "node_modules", ".superpowers"];
  const colados = archivos.filter(
    (a) => a === "package-lock.json" || carpetas.some((c) => a === c || a.startsWith(c + "/")),
  );
  assert.deepEqual(colados, []);
});

test("el paquete trae los tres pesos de Poppins, su licencia, el favicon y el CSS", () => {
  for (const f of [
    "fonts/poppins-latin-400-normal.woff2",
    "fonts/poppins-latin-500-normal.woff2",
    "fonts/poppins-latin-600-normal.woff2",
    "fonts/OFL.txt",
    "marca/favicon.ico",
    "css/fyo.css",
    "css/tokens.css",
    "css/base.css",
    "css/componentes.css",
  ]) {
    assert.ok(archivos.includes(f), `falta ${f}`);
  }
});

test("el tarball pesa menos de 400 KB", () => {
  assert.ok(empaque.size < 400 * 1024, `el tarball pesa ${empaque.size} bytes`);
});

test("package.json: versión 1.0.1 y metadatos del paquete", () => {
  assert.equal(pkg.name, "fyo-ui");
  assert.equal(pkg.version, "1.0.1");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.private, false);
  assert.ok(pkg.description && pkg.description.length > 10);
  assert.ok(Array.isArray(pkg.keywords) && pkg.keywords.length >= 3);
  assert.ok(pkg.repository?.url?.includes("dvergel-hash/fyo-ui"));
  assert.ok(pkg.homepage?.includes("dvergel-hash/fyo-ui"));
  assert.ok(pkg.bugs?.url?.includes("dvergel-hash/fyo-ui"));
  assert.deepEqual(pkg.sideEffects, ["*.css"]);
  assert.equal(pkg.engines?.node, ">=22");
  assert.equal(pkg.dependencies, undefined, "el paquete no tiene dependencias");
});

test("package.json: exports con las claves de la API", () => {
  assert.deepEqual(Object.keys(pkg.exports).sort(), [
    ".",
    "./css/*",
    "./fonts/*",
    "./marca/*",
    "./package.json",
  ]);
  assert.equal(pkg.exports["."], "./css/fyo.css");
});

test("package.json: cada ruta de exports apunta a archivos que existen", () => {
  for (const [clave, destino] of Object.entries(pkg.exports)) {
    if (destino.includes("*")) {
      const carpeta = join(RAIZ, destino.slice(0, destino.indexOf("*")));
      assert.ok(existsSync(carpeta), `exports["${clave}"] → carpeta inexistente ${destino}`);
    } else {
      assert.ok(existsSync(join(RAIZ, destino)), `exports["${clave}"] → no existe ${destino}`);
    }
  }
});

test("package.json: scripts de verificación (la instalación queda aparte)", () => {
  assert.ok(pkg.scripts["verificar:instalacion"]?.includes("scripts/instalacion.mjs"));
  const v = pkg.scripts.verificar;
  for (const parte of ["npm test", "contraste.mjs", "variables.mjs", "demo.mjs", "readme.mjs"]) {
    assert.ok(v.includes(parte), `verificar debería correr ${parte}`);
  }
  assert.ok(!v.includes("instalacion"), "verificar no corre la instalación (solo CI)");
});

test("CHANGELOG: tiene las entradas 1.0.1 y 1.0.0 con fecha", () => {
  const cl = readFileSync(join(RAIZ, "CHANGELOG.md"), "utf8");
  assert.match(cl, /^## \[1\.0\.1\] - 2026-10-10$/m);
  assert.match(cl, /^## \[1\.0\.0\] - 2026-10-09$/m);
});

// ---------------------------------------------------------------------------------------------
// El tarball de etiqueta de GitHub (lo que instalan las apps) es `git archive`: npm no le aplica
// "files", así que el filtro lo hace .gitattributes (export-ignore). Refleja el HEAD commiteado.
const dentroDeGit = (() => {
  try {
    return execSync("git rev-parse --is-inside-work-tree", { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "true";
  } catch {
    return false;
  }
})();

test(
  "git archive HEAD (el tarball de etiqueta) trae solo los archivos del paquete",
  { skip: dentroDeGit ? false : "no hay un repositorio git: no se puede probar `git archive`" },
  () => {
    const entradas = execSync("git archive --format=tar HEAD | tar -t", {
      cwd: RAIZ,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 16 * 1024 * 1024,
    })
      .split(/\r?\n/)
      .filter((e) => e && !e.endsWith("/"));
    const raros = entradas.filter((a) => !CARPETAS.some((c) => a.startsWith(c)) && !SUELTOS.includes(a));
    assert.deepEqual(raros, [], `el archive de git trae archivos que no son del paquete (¿falta commitear .gitattributes?): ${raros.join(", ")}`);
    for (const s of SUELTOS) assert.ok(entradas.includes(s), `falta ${s} en el archive`);
    for (const c of CARPETAS) assert.ok(entradas.some((a) => a.startsWith(c)), `falta ${c} en el archive`);
    for (const p of ["demo/", "scripts/", "tests/", "docs/", "plugins/", ".claude-plugin/", ".github/", "package-lock.json", ".gitattributes"]) {
      assert.ok(!entradas.some((a) => a === p || a.startsWith(p)), `el archive no debería traer ${p}`);
    }
  },
);
