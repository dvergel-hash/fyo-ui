// Pruebas de las partes puras de la verificación de instalación (sin red ni Next).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { crearStubGit, pathConStubGit, comprobarBuild, comprobarPaqueteInstalado } from "../scripts/instalacion.mjs";

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
