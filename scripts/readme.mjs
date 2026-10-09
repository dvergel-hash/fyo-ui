// Verificación de documentación: todo token y toda clase del CSS debe estar documentado en el README,
// y los valores de la tabla de tokens deben coincidir con css/tokens.css.
// Uso: node scripts/readme.mjs  (sale con código 1 si hay algo sin documentar o desactualizado).
import { readFileSync } from "node:fs";
import { esEjecucionDirecta } from "./ejecucion.mjs";

const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Filas de la tabla de tokens del README (`| `--x` | `claro` | `oscuro` | uso |`). */
function filasDeTokens(readme) {
  const limpio = (t) => t.trim().replace(/^`|`$/g, "").replace(/\s+/g, " ");
  const filas = [];
  for (const m of readme.matchAll(/^\|\s*`(--[\w-]+)`\s*\|([^|\n]*)\|([^|\n]*)\|/gm)) {
    filas.push({ nombre: m[1], claro: limpio(m[2]), oscuro: limpio(m[3]) });
  }
  return filas;
}

/** Declaraciones `--x: valor` (crudas) del bloque claro y del bloque oscuro (@media) de tokens.css. */
function declaraciones(tokensCss) {
  const css = sinComentarios(tokensCss);
  const corte = css.indexOf("@media");
  const leer = (texto) => {
    const mapa = new Map();
    for (const m of texto.matchAll(/(?<![\w-])(--[\w-]+)\s*:\s*([^;]+);/g)) {
      mapa.set(m[1], m[2].trim().replace(/\s+/g, " "));
    }
    return mapa;
  };
  if (corte < 0) return { claro: leer(css), oscuro: new Map() };
  return { claro: leer(css.slice(0, corte)), oscuro: leer(css.slice(corte)) };
}

/** Tokens declarados en el CSS que no tienen una fila en la tabla del README (ordenados, sin repetir). */
export function tokensSinDocumentar(tokensCss, readme) {
  const enTabla = new Set(filasDeTokens(readme).map((f) => f.nombre));
  const { claro, oscuro } = declaraciones(tokensCss);
  return [...new Set([...claro.keys(), ...oscuro.keys()])].filter((t) => !enTabla.has(t)).sort();
}

/** Diferencias entre los valores claro/oscuro de la tabla del README y los de tokens.css. */
export function valoresDesactualizados(tokensCss, readme) {
  const { claro, oscuro } = declaraciones(tokensCss);
  const problemas = [];
  for (const f of filasDeTokens(readme)) {
    if (!claro.has(f.nombre)) {
      problemas.push(`${f.nombre}: está en el README pero no en tokens.css`);
      continue;
    }
    const esperadoClaro = claro.get(f.nombre);
    const esperadoOscuro = oscuro.get(f.nombre) ?? "igual";
    if (f.claro !== esperadoClaro) problemas.push(`${f.nombre}: claro dice "${f.claro}" y tokens.css "${esperadoClaro}"`);
    if (f.oscuro !== esperadoOscuro) problemas.push(`${f.nombre}: oscuro dice "${f.oscuro}" y tokens.css "${esperadoOscuro}"`);
  }
  return problemas;
}

/** Nombres de clase usados en los selectores del CSS (sin el punto). */
function clasesDeSelectores(css) {
  const clases = new Set();
  // Solo el texto que precede a cada `{` (selectores y preámbulos de @media): los valores de las
  // declaraciones (`url(x.webp)`, `.5s`) quedan afuera porque terminan en `;` o `}` antes del siguiente `{`.
  for (const m of sinComentarios(css).matchAll(/[^{}]*\{/g)) {
    const selector = m[0].replace(/"[^"]*"|'[^']*'/g, "");
    for (const c of selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) clases.add(c[1]);
  }
  return clases;
}

/** Clases de los selectores del CSS que no aparecen como `.clase` en el README (ordenadas). */
export function clasesSinDocumentar(css, readme) {
  return [...clasesDeSelectores(css)]
    .filter((c) => !new RegExp(`(?<![\\w-])\\.${escapar(c)}(?![\\w-])`).test(readme))
    .sort();
}

if (esEjecucionDirecta(import.meta.url, process.argv[1])) {
  const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
  const readme = leer("../README.md");
  const tokensCss = leer("../css/tokens.css");
  const tokens = tokensSinDocumentar(tokensCss, readme);
  const valores = valoresDesactualizados(tokensCss, readme);
  const clases = clasesSinDocumentar(leer("../css/base.css") + "\n" + leer("../css/componentes.css"), readme);
  console.log(`Tokens sin fila en la tabla: ${tokens.join(", ") || "ninguno"}`);
  console.log(`Valores desactualizados: ${valores.join("; ") || "ninguno"}`);
  console.log(`Clases sin documentar: ${clases.map((c) => "." + c).join(", ") || "ninguna"}`);
  const ok = !tokens.length && !clases.length && !valores.length;
  console.log(ok ? "\nREADME completo y al día." : "\nFalta documentar o actualizar el README.");
  process.exit(ok ? 0 : 1);
}
