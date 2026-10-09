// Pruebas de la guarda de CLI de los scripts: esEjecucionDirecta compara rutas reales.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { esEjecucionDirecta } from "../scripts/ejecucion.mjs";

const SCRIPT = fileURLToPath(new URL("../scripts/plugin.mjs", import.meta.url));
const URL_SCRIPT = pathToFileURL(SCRIPT).href;

test("sin argv[1] (REPL, -e) no es ejecución directa", () => {
  assert.equal(esEjecucionDirecta(URL_SCRIPT, undefined), false);
  assert.equal(esEjecucionDirecta(URL_SCRIPT, ""), false);
});

test("la misma ruta, una ruta relativa y otra ruta distinta", () => {
  assert.equal(esEjecucionDirecta(URL_SCRIPT, SCRIPT), true);
  assert.equal(esEjecucionDirecta(URL_SCRIPT, relative(process.cwd(), SCRIPT)), true);
  assert.equal(esEjecucionDirecta(URL_SCRIPT, fileURLToPath(new URL("../scripts/readme.mjs", import.meta.url))), false);
});

test("en Windows, otra capitalización de la ruta es el mismo archivo", { skip: process.platform !== "win32" }, () => {
  assert.equal(esEjecucionDirecta(URL_SCRIPT, SCRIPT.toUpperCase()), true);
  assert.equal(esEjecucionDirecta(URL_SCRIPT, SCRIPT.toLowerCase()), true);
});

test("ejecutar un script a través de un enlace (symlink o junction de Windows) corre la CLI", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "enlace-"));
  try {
    // Un enlace al directorio scripts/: en Windows una junction no necesita privilegios.
    const enlaceDir = join(dir, "scripts");
    try {
      symlinkSync(dirname(SCRIPT), enlaceDir, process.platform === "win32" ? "junction" : "dir");
    } catch {
      t.skip("este sistema no permite crear enlaces");
      return;
    }
    const enlace = join(enlaceDir, "plugin.mjs");
    assert.equal(esEjecucionDirecta(URL_SCRIPT, enlace), true);
    const salida = execFileSync(process.execPath, [enlace], { encoding: "utf8" });
    assert.match(salida, /Marketplace y plugin válidos/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
