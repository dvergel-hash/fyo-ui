// Pruebas de los workflows de GitHub Actions. Sin dependencias de YAML: se comprueba el texto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/** Normaliza CRLF a LF: con core.autocrlf un clon nuevo en Windows escribe los YAML con CRLF. */
export const normalizar = (t) => t.replace(/\r\n/g, "\n");
const leer = (ruta) => normalizar(readFileSync(new URL(ruta, import.meta.url), "utf8"));
const ci = leer("../.github/workflows/ci.yml");
const release = leer("../.github/workflows/release.yml");

/** Lo que no son comentarios: así un comentario no engaña a las aserciones. */
const sinComentarios = (t) => t.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
const ciCod = sinComentarios(ci);
const releaseCod = sinComentarios(release);

test("los archivos son UTF-8 válido y el lector normaliza CRLF a LF", () => {
  for (const t of [ci, release]) {
    assert.ok(!t.includes(String.fromCharCode(0xfffd)));
    assert.ok(!t.includes("\r"));
  }
  assert.equal(normalizar("a:\r\n  b: 1\r\n"), "a:\n  b: 1\n");
});

test("ci: corre en pull_request y en push a main, nada más", () => {
  assert.match(ciCod, /^on:\n  pull_request:/m);
  assert.match(ciCod, /^  push:\n    branches: \[main\]/m);
  assert.doesNotMatch(ciCod, /workflow_dispatch|schedule:|tags:/);
});

test("ci: permisos mínimos (solo contents: read) y concurrencia por ref con cancelación", () => {
  assert.match(ciCod, /^permissions:\n  contents: read\n/m);
  assert.doesNotMatch(ciCod, /contents: write/);
  assert.match(ciCod, /concurrency:\n  group: .*github\.ref/);
  assert.match(ciCod, /cancel-in-progress: true/);
  assert.match(ciCod, /timeout-minutes: \d+/);
});

test("ci: instala, verifica y prueba la instalación con Node 22", () => {
  assert.match(ciCod, /node-version: 22/);
  assert.match(ciCod, /cache: npm/);
  assert.match(ciCod, /run: npm ci\b/);
  assert.match(ciCod, /run: npx playwright install --with-deps chromium/);
  assert.match(ciCod, /run: npm run verificar$/m);
  assert.match(ciCod, /run: npm run verificar:instalacion -- --sin-git$/m);
});

test("ci: sube demo-salida/ como artefacto aunque falle, con retención de 7 días", () => {
  assert.match(ciCod, /uses: actions\/upload-artifact@v\d+/);
  assert.match(ciCod, /if: always\(\)/);
  assert.match(ciCod, /path: demo-salida\//);
  assert.match(ciCod, /retention-days: 7/);
});

test("release: solo se dispara con el push de etiquetas v*.*.*", () => {
  assert.match(releaseCod, /^on:\n  push:\n    tags:\n      - "v\*\.\*\.\*"\n/m);
  assert.doesNotMatch(releaseCod, /pull_request|branches:|workflow_dispatch/);
});

test("release: contents: write solo en release, y CI nunca lo tiene", () => {
  assert.match(releaseCod, /^permissions:\n  contents: write\n/m);
  assert.doesNotMatch(releaseCod, /contents: read/);
  assert.ok(!/contents: write/.test(ciCod));
});

test("release: verifica, valida la etiqueta, empaqueta y crea el Release", () => {
  assert.match(releaseCod, /run: npm ci\b/);
  assert.match(releaseCod, /run: npx playwright install --with-deps chromium/);
  assert.match(releaseCod, /run: npm run verificar$/m);
  assert.match(releaseCod, /node scripts\/etiqueta\.mjs "\$GITHUB_REF_NAME"/);
  assert.match(releaseCod, /node scripts\/etiqueta\.mjs "\$GITHUB_REF_NAME" --notas /);
  assert.match(releaseCod, /npm pack/);
  assert.match(releaseCod, /git archive --format=tar\.gz --prefix="fyo-ui-/);
  assert.match(releaseCod, /gh release create "\$GITHUB_REF_NAME"/);
  assert.match(releaseCod, /--notes-file /);
});

test("release: la etiqueta se valida antes de instalar nada y todo va antes de crear el Release", () => {
  const i = (s) => releaseCod.indexOf(s);
  assert.ok(i("scripts/etiqueta.mjs") < i("npm ci"));
  assert.ok(i("--notas") < i("npm ci"));
  assert.ok(i("npm run verificar") < i("gh release create"));
  assert.ok(i("git archive") < i("gh release create"));
});

test("sin secretos: el único `secrets.` permitido es GITHUB_TOKEN", () => {
  for (const t of [ciCod, releaseCod]) {
    const usos = [...t.matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    assert.deepEqual(usos.filter((s) => s !== "GITHUB_TOKEN"), []);
  }
  assert.match(releaseCod, /GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.doesNotMatch(ciCod, /secrets\./);
});

test("todas las acciones llevan versión mayor fijada (@vN), sin ramas ni SHA flotantes", () => {
  for (const t of [ciCod, releaseCod]) {
    const acciones = [...t.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
    assert.ok(acciones.length >= 2);
    for (const a of acciones) assert.match(a, /^[\w.-]+\/[\w.-]+@v\d+$/, a);
  }
});
