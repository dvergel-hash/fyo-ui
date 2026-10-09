// Verificación de variables, imports y selectores de dominio del CSS de fyo-ui.
// Uso: node scripts/variables.mjs  (sale con código 1 si algo falla).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { esEjecucionDirecta } from "./ejecucion.mjs";

/** Selectores de la app de presupuesto que no deben estar en el paquete. */
const DOMINIO = [
  "tabla-compras",
  "comprobantes",
  "acciones-fila",
  "fila-accion",
  "estado-PROGRAMADA",
  "estado-EJECUTADA",
  "estado-CANCELADA",
  "resumen-estados",
];

const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Nombres `--x` declarados en cualquier bloque. */
export function variablesDefinidas(css) {
  const nombres = new Set();
  for (const m of sinComentarios(css).matchAll(/(?<![\w-])(--[\w-]+)\s*:/g)) nombres.add(m[1]);
  return nombres;
}

/**
 * Nombres `--x` usados con `var(--x…)`. Por defecto cuenta todas; con
 * `{ conRespaldo: false }` ignora las que traen valor de respaldo.
 */
export function variablesUsadas(css, { conRespaldo = true } = {}) {
  const nombres = new Set();
  for (const m of sinComentarios(css).matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    if (m[2] && !conRespaldo) continue;
    nombres.add(m[1]);
  }
  return nombres;
}

/** Archivos `@import` (rutas relativas) de un CSS, resueltos; lanza si alguno no existe. */
export function resolverImports(rutaCss) {
  const texto = sinComentarios(readFileSync(rutaCss, "utf8"));
  const base = dirname(rutaCss);
  const archivos = [];
  for (const m of texto.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?/g)) {
    const destino = resolve(base, m[1]);
    if (!existsSync(destino)) {
      throw new Error(`@import roto en ${rutaCss}: no existe ${m[1]}`);
    }
    archivos.push(destino);
  }
  return archivos;
}

/** Recorre `dir/*.css` y verifica variables, imports y selectores de dominio. */
export function verificarVariables(dir) {
  const archivos = readdirSync(dir).filter((f) => f.endsWith(".css")).sort();
  const definidas = new Set();
  const usadas = new Set();
  const importsRotos = [];
  const dominio = new Set();
  for (const f of archivos) {
    const ruta = join(dir, f);
    const css = readFileSync(ruta, "utf8");
    for (const v of variablesDefinidas(css)) definidas.add(v);
    for (const v of variablesUsadas(css)) usadas.add(v);
    try {
      resolverImports(ruta);
    } catch (e) {
      importsRotos.push(e.message);
    }
    const limpio = sinComentarios(css);
    for (const termino of DOMINIO) if (limpio.includes(termino)) dominio.add(termino);
  }
  const sinDefinir = [...usadas].filter((v) => !definidas.has(v)).sort();
  const selectoresDeDominio = [...dominio].sort();
  return {
    ok: !sinDefinir.length && !importsRotos.length && !selectoresDeDominio.length,
    sinDefinir,
    importsRotos,
    selectoresDeDominio,
  };
}

if (esEjecucionDirecta(import.meta.url, process.argv[1])) {
  const dir = fileURLToPath(new URL("../css", import.meta.url));
  const r = verificarVariables(dir);
  console.log(`Variables usadas sin definir: ${r.sinDefinir.join(", ") || "ninguna"}`);
  console.log(`Imports rotos: ${r.importsRotos.join("; ") || "ninguno"}`);
  console.log(`Selectores de dominio: ${r.selectoresDeDominio.join(", ") || "ninguno"}`);
  console.log(r.ok ? "\nCSS verificado." : "\nHay problemas en el CSS.");
  process.exit(r.ok ? 0 : 1);
}
