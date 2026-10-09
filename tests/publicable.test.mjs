// El repositorio es público: ningún archivo versionado puede tener rutas de la máquina del dueño,
// direcciones IP internas, hostnames internos de fyo ni cadenas con forma de secreto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const BINARIOS = new Set([".png", ".webp", ".ico", ".woff2", ".woff", ".pdf", ".jpg", ".jpeg", ".gif"]);
const OCTETO = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";

// Los patrones se arman por partes para que este archivo no se denuncie a sí mismo.
export const PROHIBIDOS = [
  { motivo: "ruta de Windows de un usuario", re: new RegExp(["C:", "\\\\", "Users"].join(""), "i") },
  { motivo: "ruta de un usuario (Git Bash)", re: new RegExp(["/c/", "Users"].join(""), "i") },
  { motivo: "directorio temporal de una sesión", re: new RegExp(["scratch", "pad"].join(""), "i") },
  { motivo: "ruta a Descargas", re: new RegExp(["Downloads", "\\\\"].join("")) },
  { motivo: "dirección IPv4", re: new RegExp(`(?<![\\w.])(${OCTETO}\\.){3}${OCTETO}(?![\\d.])`, "g"), permitidas: ["127.0.0.1", "0.0.0.0"] },
  { motivo: "hostname interno de fyo", re: new RegExp(["[\\w-]+\\.", "fyo", "\\.com"].join(""), "i") },
  { motivo: "clave de Anthropic", re: new RegExp(["sk-", "ant-", "[\\w-]{8,}"].join("")) },
  { motivo: "token de GitHub", re: new RegExp(["gh", "p_", "[A-Za-z0-9]{20,}"].join("")) },
  { motivo: "clave privada", re: new RegExp(["-----BEGIN ", "[A-Z ]*", "PRIVATE KEY-----"].join("")) },
];

/** Problemas `archivo:línea: motivo` de un texto. */
export function problemasDe(archivo, texto) {
  const problemas = [];
  texto.split(/\r?\n/).forEach((linea, i) => {
    for (const p of PROHIBIDOS) {
      const coincidencias = p.re.global ? [...linea.matchAll(p.re)].map((m) => m[0]) : p.re.test(linea) ? [linea] : [];
      if (coincidencias.some((c) => !(p.permitidas ?? []).includes(c))) problemas.push(`${archivo}:${i + 1}: ${p.motivo}`);
    }
  });
  return problemas;
}

test("problemasDe detecta cada patrón y deja pasar lo legítimo", () => {
  const raros = [
    ["C:", "\\Users\\alguien\\x"].join(""),
    ["/c/", "Users/alguien"].join(""),
    ["scratch", "pad/pdf"].join(""),
    ["Downloads", "\\manual.pdf"].join(""),
    ["servidor 10", "1", "2", "3"].join("."),
    ["intra.", "fyo.com"].join(""),
    ["sk-", "ant-api03-abcdefgh"].join(""),
    ["gh", "p_abcdefghijklmnopqrstuvwxyz"].join(""),
    ["-----BEGIN ", "RSA PRIVATE KEY-----"].join(""),
  ];
  for (const r of raros) assert.equal(problemasDe("x", r).length, 1, r);
  for (const ok of ["http://127.0.0.1:3000", "0.0.0.0", "$ 40.000.000.000,00", "$ 123.456.789.012,34", "v1.0.0", "v1.0.0.1", "la cadena BEGIN PRIVATE KEY en prosa", "dvergel-hash/fyo-ui"]) {
    assert.deepEqual(problemasDe("x", ok), [], ok);
  }
});

test("ningún archivo versionado tiene rutas internas, IPs, hostnames internos ni secretos", (t) => {
  let archivos;
  try {
    archivos = execFileSync("git", ["ls-files", "-z"], { cwd: RAIZ, encoding: "utf8" }).split("\0").filter(Boolean);
  } catch {
    t.skip("git no está disponible: no hay lista de archivos versionados");
    return;
  }
  const problemas = archivos
    .filter((a) => !BINARIOS.has(extname(a).toLowerCase()))
    .flatMap((a) => {
      try {
        return problemasDe(a, readFileSync(join(RAIZ, a), "utf8"));
      } catch {
        return []; // borrado en la copia de trabajo
      }
    });
  assert.deepEqual(problemas, [], `Archivos que no se pueden publicar:\n${problemas.join("\n")}`);
});
