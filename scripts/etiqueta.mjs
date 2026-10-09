// Validación de la etiqueta de versión antes de publicar un Release, y notas del Release.
// Uso: node scripts/etiqueta.mjs vX.Y.Z [--notas <archivo>]
//   Valida la etiqueta contra package.json y CHANGELOG.md; imprime los problemas y sale con 1 si hay alguno.
//   Con --notas escribe en <archivo> el texto de la sección del CHANGELOG (el cuerpo del Release).
import { readFileSync, writeFileSync } from "node:fs";
import { esEjecucionDirecta } from "./ejecucion.mjs";

const ETIQUETA = /^v(\d+\.\d+\.\d+)$/;

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Problemas de la etiqueta (lista vacía si se puede publicar). */
export function validarEtiqueta(etiqueta, versionPaquete, changelog) {
  const m = ETIQUETA.exec(etiqueta);
  if (!m) return [`La etiqueta "${etiqueta}" no es válida: tiene que ser "v" + versión exacta X.Y.Z (por ejemplo v1.0.0).`];
  const version = m[1];
  const problemas = [];
  if (version !== versionPaquete) {
    problemas.push(`La etiqueta ${etiqueta} no coincide con la versión de package.json (${versionPaquete}).`);
  }
  if (!new RegExp(`^## \\[${escapar(version)}\\]`, "m").test(changelog)) {
    problemas.push(`Falta la sección "## [${version}]" en CHANGELOG.md.`);
  }
  return problemas;
}

/** Cuerpo de la sección `## [version]` del changelog, sin el título y sin la sección siguiente ("" si no existe). */
export function notasDeVersion(changelog, version) {
  const lineas = changelog.replace(/\r\n/g, "\n").split("\n");
  const titulo = new RegExp(`^## \\[${escapar(version)}\\]`);
  const inicio = lineas.findIndex((l) => titulo.test(l));
  if (inicio === -1) return "";
  let fin = lineas.findIndex((l, i) => i > inicio && /^## /.test(l));
  if (fin === -1) fin = lineas.length;
  return lineas.slice(inicio + 1, fin).join("\n").trim();
}

if (esEjecucionDirecta(import.meta.url, process.argv[1])) {
  const args = process.argv.slice(2);
  const etiqueta = args[0];
  const i = args.indexOf("--notas");
  const archivoNotas = i === -1 ? null : args[i + 1];
  if (!etiqueta || etiqueta.startsWith("--") || (i !== -1 && !archivoNotas)) {
    console.error("Uso: node scripts/etiqueta.mjs vX.Y.Z [--notas <archivo>]");
    process.exit(1);
  }
  const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
  const version = JSON.parse(leer("../package.json")).version;
  const changelog = leer("../CHANGELOG.md");
  const problemas = validarEtiqueta(etiqueta, version, changelog);
  if (problemas.length) {
    for (const p of problemas) console.error(`- ${p}`);
    process.exit(1);
  }
  if (archivoNotas) {
    const notas = notasDeVersion(changelog, version);
    if (!notas) {
      console.error(`- La sección [${version}] del CHANGELOG.md está vacía.`);
      process.exit(1);
    }
    writeFileSync(archivoNotas, notas + "\n");
  }
  console.log(`Etiqueta ${etiqueta} válida.`);
}
