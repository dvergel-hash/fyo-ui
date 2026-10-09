// Pruebas de las partes puras de la verificación de instalación (sin red ni Next).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  crearStubGit, pathConStubGit, comprobarBuild, comprobarPaqueteInstalado, leerOrigen, imagenesDeHtml, comprobarImagenes,
} from "../scripts/instalacion.mjs";

test("pathConStubGit: pone el stub al frente y deja el resto del PATH intacto", () => {
  assert.equal(pathConStubGit("/usr/bin:/bin", "/tmp/stub", ":"), "/tmp/stub:/usr/bin:/bin");
  assert.equal(pathConStubGit("", "/tmp/stub", ":"), "/tmp/stub");
});

test("crearStubGit: el `git` de mentira falla con un mensaje claro y gana en el PATH", () => {
  const dir = mkdtempSync(join(tmpdir(), "fyo-ui-stub-"));
  try {
    crearStubGit(dir);
    const env = { ...process.env };
    const clave = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
    env[clave] = pathConStubGit(env[clave] ?? "", dir);
    const r = spawnSync("git --version", { env, shell: true, encoding: "utf8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /git-de-mentira-de-fyo-ui/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("comprobarPaqueteInstalado: acepta solo los archivos del paquete", () => {
  const dir = proyectoFalso({
    "css/fyo.css": "", "fonts/a.woff2": "", "marca/logo.png": "",
    "README.md": "", "CHANGELOG.md": "", "LICENSE": "", "package.json": "{}",
  });
  try {
    assert.deepEqual(comprobarPaqueteInstalado(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("comprobarPaqueteInstalado: avisa de demo/, scripts/, tests/, docs/ y de lo que falta", () => {
  const dir = proyectoFalso({
    "css/fyo.css": "", "demo/index.html": "", "scripts/x.mjs": "", "tests/x.mjs": "", "docs/x.md": "",
    "package.json": "{}",
  });
  try {
    const r = comprobarPaqueteInstalado(dir).join("\n");
    assert.match(r, /demo\/index\.html/);
    assert.match(r, /scripts\/x\.mjs/);
    assert.match(r, /docs\/x\.md/);
    assert.match(r, /falta README\.md/);
    assert.match(r, /falta fonts\//);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function proyectoFalso(archivos) {
  const base = mkdtempSync(join(tmpdir(), "fyo-ui-test-"));
  for (const [ruta, contenido] of Object.entries(archivos)) {
    const destino = join(base, ruta);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, contenido);
  }
  return base;
}

test("comprobarBuild: sin problemas con CSS con --celeste, tres woff2 distintos y el logo", () => {
  const dir = proyectoFalso({
    "css/a.css": ":root{--celeste:#008eaa}",
    "media/f1.woff2": "uno",
    "media/f2.woff2": "dos",
    "media/f3.woff2": "tres",
    "media/logo.png": "png",
  });
  try {
    assert.deepEqual(comprobarBuild(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("comprobarBuild: avisa si falta --celeste, faltan fuentes o el logo", () => {
  const dir = proyectoFalso({
    "css/a.css": "body{color:red}",
    "media/f1.woff2": "uno",
    "media/f2.woff2": "uno",
  });
  try {
    const r = comprobarBuild(dir).join("\n");
    assert.match(r, /--celeste/);
    assert.match(r, /woff2/);
    assert.match(r, /png/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("leerOrigen: por defecto pack (el asset del Release); archive sigue disponible", () => {
  assert.equal(leerOrigen(["node", "x"]), "pack");
  assert.equal(leerOrigen(["node", "x", "--sin-git"]), "pack");
  assert.equal(leerOrigen(["node", "x", "--origen", "archive"]), "archive");
  assert.equal(leerOrigen(["node", "x", "--origen=archive"]), "archive");
  assert.equal(leerOrigen(["node", "x", "--origen", "pack"]), "pack");
  assert.throws(() => leerOrigen(["node", "x", "--origen", "git"]), /archive.*pack/);
});

test("imagenesDeHtml: devuelve el src de cada <img> (null si no tiene) y desescapa &amp;", () => {
  const html = `<main><img alt="a" src="/_next/static/media/a.1.png" width="77"/>
    <IMG src='/b.png?x=1&amp;y=2'><img alt="sin src" width="77" height="36"/><img data-src="x" srcset="y"/>
    <p>img src="no-es-una-etiqueta"</p></main>`;
  assert.deepEqual(imagenesDeHtml(html), ["/_next/static/media/a.1.png", "/b.png?x=1&y=2", null, null]);
  assert.deepEqual(imagenesDeHtml("<p>sin imágenes</p>"), []);
});

const MEDIA = "/_next/static/media/";

test("comprobarImagenes: sin problemas si cada logo apunta a un png que salió en .next/static/media", () => {
  const dir = proyectoFalso({ "media/logo-fyo-color.0a1b.png": "png", "media/logo-fyo-blanco.2c3d.png": "png" });
  try {
    const html = `<img src="${MEDIA}logo-fyo-color.0a1b.png" alt="fyo"/><img src="${MEDIA}logo-fyo-blanco.2c3d.png" alt="fyo"/>`;
    assert.deepEqual(comprobarImagenes(html, dir, 2), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("comprobarImagenes: detecta el <img> sin src (logo.src con Turbopack), vacío, 'undefined' y rutas raras", () => {
  const dir = proyectoFalso({ "media/ok.png": "png" });
  try {
    const r = comprobarImagenes(
      `<img alt="a"/><img src=""/><img src="undefined"/><img src="/logo.png"/><img src="${MEDIA}ok.webp"/><img src="${MEDIA}falta.png"/><img src="${MEDIA}ok.png"/>`,
      dir,
      2,
    );
    assert.equal(r.length, 6, r.join("\n"));
    const t = r.join("\n");
    assert.match(t, /sin src/);
    assert.match(t, /vacío/);
    assert.match(t, /undefined/);
    assert.match(t, /\/logo\.png.*\/_next\/static\/media\//);
    assert.match(t, /ok\.webp.*\.png/);
    assert.match(t, /falta\.png.*no existe/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("comprobarImagenes: avisa si la página trae menos imágenes de las esperadas", () => {
  const dir = proyectoFalso({ "media/ok.png": "png" });
  try {
    assert.match(comprobarImagenes(`<img src="${MEDIA}ok.png"/>`, dir, 2).join("\n"), /se esperaban 2.*hay 1/);
    assert.match(comprobarImagenes("", dir, 2).join("\n"), /se esperaban 2.*hay 0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
