// Pruebas de la verificación de contraste (WCAG 2.x) y del parser de tokens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  leerTokens,
  razonDeContraste,
  PARES,
  verificar,
} from "../scripts/contraste.mjs";

const cerca = (real, esperado, tolerancia) =>
  assert.ok(
    Math.abs(real - esperado) <= tolerancia,
    `se esperaba ~${esperado} y se midió ${real}`,
  );

test("razonDeContraste: negro sobre blanco es 21", () => {
  assert.equal(razonDeContraste("#000000", "#ffffff"), 21);
});

test("razonDeContraste: mismo color es 1", () => {
  assert.equal(razonDeContraste("#ffffff", "#ffffff"), 1);
});

test("razonDeContraste: el celeste puro no sirve para texto (~3,86)", () => {
  cerca(razonDeContraste("#008eaa", "#ffffff"), 3.86, 0.05);
  assert.ok(razonDeContraste("#008eaa", "#ffffff") < 4.5);
});

test("razonDeContraste: el acento accesible llega a 4,5", () => {
  assert.ok(razonDeContraste("#007a94", "#ffffff") >= 4.5);
});

test("razonDeContraste: acepta #rgb y es simétrica", () => {
  assert.equal(razonDeContraste("#000", "#fff"), 21);
  assert.equal(razonDeContraste("#fff", "#000"), 21);
});

test("razonDeContraste: un color con alfa lanza un error claro", () => {
  assert.throws(() => razonDeContraste("rgba(0,0,0,0.5)", "#ffffff"), /alfa|soporta/i);
  assert.throws(() => razonDeContraste("#00000080", "#ffffff"), /alfa|soporta/i);
});

const CSS_CHICO = `
/* comentario; con punto y coma */
:root {
  --a: #111111; --b: #222222;
  --c: var(--a);
}
@media (prefers-color-scheme: dark) {
  :root {
    --a: #eeeeee;
  }
}
`;

test("leerTokens: separa claro y oscuro, hereda y resuelve var()", () => {
  const { claro, oscuro } = leerTokens(CSS_CHICO);
  assert.equal(claro.get("--a"), "#111111");
  assert.equal(claro.get("--b"), "#222222");
  assert.equal(claro.get("--c"), "#111111");
  assert.equal(oscuro.get("--a"), "#eeeeee");
  assert.equal(oscuro.get("--b"), "#222222", "hereda lo no redefinido");
  assert.equal(oscuro.get("--c"), "#eeeeee", "var() se resuelve en el tema oscuro");
});

test("verificar: un par bajo el mínimo devuelve ok:false y lo señala", () => {
  const css = `
:root { --texto: #777777; --fondo: #888888; --superficie: #ffffff; }
`;
  const r = verificar(css, [
    { nombre: "malo", texto: "--texto", fondo: "--fondo", minimo: 4.5 },
    { nombre: "bueno", texto: "--texto", fondo: "--superficie", minimo: 3 },
  ]);
  assert.equal(r.ok, false);
  const malos = r.resultados.filter((x) => !x.ok);
  assert.ok(malos.length >= 1);
  assert.ok(malos.every((x) => x.nombre === "malo"));
  assert.ok(r.resultados.some((x) => x.nombre === "bueno" && x.ok));
});

test("verificar: un var(--x) que no se resuelve falla con «Falta el token --x»", () => {
  const css = ":root { --texto: var(--no-existe); --fondo: #ffffff; }";
  assert.throws(
    () => verificar(css, [{ nombre: "par", texto: "--texto", fondo: "--fondo", minimo: 4.5 }]),
    (e) => /Falta el token --no-existe/.test(e.message) && /--texto/.test(e.message),
  );
});

test("verificar: un var(--x) sin resolver en un token que no está en los pares no molesta", () => {
  const css = ":root { --texto: #000000; --fondo: #ffffff; --otro: var(--no-existe); }";
  const r = verificar(css, [{ nombre: "par", texto: "--texto", fondo: "--fondo", minimo: 4.5 }]);
  assert.equal(r.ok, true);
});

const esperados = [
  ["--texto", "--fondo", 4.5],
  ["--texto", "--superficie", 4.5],
  ["--texto", "--cabecera-tabla", 4.5],
  ["--tenue", "--superficie", 4.5],
  ["--tenue", "--fondo", 4.5],
  ["--acento", "--superficie", 4.5],
  ["--acento", "--fondo", 4.5],
  ["--sobre-acento", "--acento", 4.5],
  ["--sobre-acento", "--acento-hover", 4.5],
  ["--rojo-texto", "--rojo-fondo", 4.5],
  ["--amarillo-texto", "--amarillo-fondo", 4.5],
  ["--verde-texto", "--verde-fondo", 4.5],
  ["--gris-texto", "--gris-fondo", 4.5],
  ["--error", "--superficie", 4.5],
  ["--ok", "--superficie", 4.5],
  ["--borde-control", "--superficie", 3],
  ["--acento", "--superficie", 3],
];

test("PARES incluye todos los pares clave", () => {
  for (const [texto, fondo, minimo] of esperados) {
    assert.ok(
      PARES.some((p) => p.texto === texto && p.fondo === fondo && p.minimo === minimo),
      `falta el par ${texto} sobre ${fondo} (${minimo})`,
    );
  }
});

test("css/tokens.css real: todos los pares pasan en claro y oscuro", () => {
  const css = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8");
  const r = verificar(css);
  const fallos = r.resultados.filter((x) => !x.ok);
  assert.deepEqual(
    fallos.map((x) => `${x.tema} ${x.nombre}: ${x.ratio.toFixed(2)} < ${x.minimo}`),
    [],
  );
  assert.equal(r.ok, true);
  for (const tema of ["claro", "oscuro"]) {
    for (const [texto, fondo] of esperados) {
      assert.ok(
        r.resultados.some((x) => x.tema === tema && x.nombre.includes(texto) && x.nombre.includes(fondo)),
        `${tema}: falta ${texto} sobre ${fondo}`,
      );
    }
  }
});
