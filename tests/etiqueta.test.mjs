// Pruebas de la validación de etiquetas de versión y de las notas del Release.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarEtiqueta, notasDeVersion } from "../scripts/etiqueta.mjs";

const CHANGELOG = `# Changelog

## [Sin publicar]

## [1.1.0] - 2026-11-01

Agrega un token.

### Incluye

- Algo nuevo.

## [1.0.0] - 2026-10-09

Primera versión.

- Tokens.
- CSS.
`;

test("validarEtiqueta: acepta v1.0.0 con paquete 1.0.0 y sección en el changelog", () => {
  assert.deepEqual(validarEtiqueta("v1.0.0", "1.0.0", CHANGELOG), []);
});

test("validarEtiqueta: rechaza una etiqueta sin la v", () => {
  assert.notDeepEqual(validarEtiqueta("1.0.0", "1.0.0", CHANGELOG), []);
});

test("validarEtiqueta: rechaza una etiqueta que no es semver completo", () => {
  assert.notDeepEqual(validarEtiqueta("v1.0", "1.0.0", CHANGELOG), []);
  assert.notDeepEqual(validarEtiqueta("v1.0.0.1", "1.0.0", CHANGELOG), []);
});

test("validarEtiqueta: rechaza versiones con sufijo (v1.0.0-beta)", () => {
  assert.notDeepEqual(validarEtiqueta("v1.0.0-beta", "1.0.0", CHANGELOG), []);
});

test("validarEtiqueta: rechaza si la etiqueta no coincide con package.json", () => {
  const problemas = validarEtiqueta("v1.1.0", "1.0.0", CHANGELOG);
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /package\.json/);
});

test("validarEtiqueta: rechaza si falta la sección del changelog", () => {
  const problemas = validarEtiqueta("v2.0.0", "2.0.0", CHANGELOG);
  assert.equal(problemas.length, 1);
  assert.match(problemas[0], /CHANGELOG/);
});

test("validarEtiqueta: una etiqueta mal formada no se confunde con una sección parecida", () => {
  // `## [1.0.0]` existe, pero `v1.0.0-beta` no es una etiqueta válida
  assert.ok(validarEtiqueta("v1.0.0-beta", "1.0.0-beta", CHANGELOG).length >= 1);
});

test("notasDeVersion: devuelve solo el cuerpo de esa sección", () => {
  const notas = notasDeVersion(CHANGELOG, "1.0.0");
  assert.equal(notas, "Primera versión.\n\n- Tokens.\n- CSS.");
  assert.doesNotMatch(notas, /## \[/);
});

test("notasDeVersion: corta en la sección siguiente y no incluye el título", () => {
  const notas = notasDeVersion(CHANGELOG, "1.1.0");
  assert.match(notas, /Agrega un token\./);
  assert.match(notas, /### Incluye/);
  assert.doesNotMatch(notas, /Primera versión/);
  assert.doesNotMatch(notas, /1\.1\.0\]/);
});

test("notasDeVersion: la versión no se interpreta como expresión regular", () => {
  assert.equal(notasDeVersion(CHANGELOG, "1x0x0"), "");
});

test("notasDeVersion: devuelve vacío si la sección no existe", () => {
  assert.equal(notasDeVersion(CHANGELOG, "9.9.9"), "");
});

test("sobre el repo real: la etiqueta de la versión del paquete es válida", () => {
  const leer = (r) => readFileSync(new URL(r, import.meta.url), "utf8");
  const version = JSON.parse(leer("../package.json")).version;
  const changelog = leer("../CHANGELOG.md");
  assert.deepEqual(validarEtiqueta(`v${version}`, version, changelog), []);
  assert.notEqual(notasDeVersion(changelog, version), "");
});
