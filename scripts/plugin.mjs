// Verificación del marketplace de Claude Code y de sus plugins (.claude-plugin/marketplace.json y plugins/…):
// esquema mínimo de los manifiestos, frontmatter de las skills, enlaces relativos y ausencia de secretos.
// Uso: node scripts/plugin.mjs  (sale con código 1 si encuentra algún problema).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { esEjecucionDirecta } from "./ejecucion.mjs";

const NOMBRE_MARKETPLACE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const MAX_DESCRIPCION = 1024;
const MAX_LINEAS_SKILL = 500;
const SECRETOS = [/(api[_-]?key|secret|token)\s*[:=]\s*\S{12,}/i, /sk-ant-/, /BEGIN [A-Z ]*PRIVATE KEY/];

const esObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const barras = (ruta) => ruta.split("\\").join("/");

/** Todos los archivos (rutas absolutas) debajo de `dir`, recursivo. */
function archivos(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : [join(dir, e.name)],
  );
}

function leerJson(ruta, problemas, etiqueta) {
  if (!existsSync(ruta)) {
    problemas.push(`${etiqueta}: no existe`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    problemas.push(`${etiqueta}: no es JSON válido (${e.message})`);
    return null;
  }
}

/**
 * Frontmatter YAML simple: `clave: valor`, comillas, bloques `>`/`|` y escalares planos con continuación
 * indentada. null si el archivo no empieza con `---`.
 */
export function frontmatter(texto) {
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lineas[0] !== "---") return null;
  const fin = lineas.indexOf("---", 1);
  if (fin < 0) return null;
  const datos = {};
  for (let i = 1; i < fin; i++) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lineas[i]);
    if (!m) continue;
    let valor = m[2].trim();
    if (/^[>|][-+]?$/.test(valor)) {
      const bloque = [];
      while (i + 1 < fin && /^\s+\S/.test(lineas[i + 1])) bloque.push(lineas[++i].trim());
      valor = bloque.join(valor.startsWith(">") ? " " : "\n");
    } else if (/^(["']).*\1$/.test(valor)) {
      valor = valor.slice(1, -1);
    } else {
      // Escalar plano en varias líneas: las líneas indentadas que siguen continúan el valor (unidas con espacio).
      while (i + 1 < fin && /^\s+\S/.test(lineas[i + 1])) valor = `${valor} ${lineas[++i].trim()}`.trim();
    }
    datos[m[1]] = valor;
  }
  return datos;
}

/** Destinos de los enlaces Markdown relativos de un texto (sin bloques ni fragmentos de código). */
export function enlacesRelativos(markdown) {
  const sinCodigo = markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");
  const destinos = [];
  for (const m of sinCodigo.matchAll(/\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    const destino = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(destino) || destino.startsWith("#") || destino.startsWith("/")) continue;
    const sinAncla = destino.split("#")[0];
    if (sinAncla) destinos.push(decodeURIComponent(sinAncla));
  }
  return destinos;
}

function validarSkills(dirPlugin, raiz, problemas) {
  const dirSkills = join(dirPlugin, "skills");
  if (!existsSync(dirSkills)) return;
  for (const e of readdirSync(dirSkills, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dirSkill = join(dirSkills, e.name);
    const rutaSkill = join(dirSkill, "SKILL.md");
    const etiqueta = barras(relative(raiz, rutaSkill));
    if (!existsSync(rutaSkill)) {
      problemas.push(`${etiqueta}: no existe`);
      continue;
    }
    const texto = readFileSync(rutaSkill, "utf8");
    const datos = frontmatter(texto);
    if (!datos) {
      problemas.push(`${etiqueta}: debe empezar con --- (frontmatter YAML con name y description)`);
    } else {
      if (datos.name !== undefined && datos.name !== e.name) {
        problemas.push(`${etiqueta}: name "${datos.name}" no coincide con el directorio "${e.name}"`);
      }
      const descripcion = datos.description ?? "";
      if (!descripcion) problemas.push(`${etiqueta}: falta description`);
      else if (descripcion.length > MAX_DESCRIPCION) {
        problemas.push(`${etiqueta}: description tiene ${descripcion.length} caracteres (máximo ${MAX_DESCRIPCION})`);
      }
    }
    const lineas = texto.split(/\r?\n/).length - (texto.endsWith("\n") ? 1 : 0);
    if (lineas > MAX_LINEAS_SKILL) problemas.push(`${etiqueta}: tiene ${lineas} líneas (máximo ${MAX_LINEAS_SKILL})`);

    for (const md of archivos(dirSkill).filter((a) => a.endsWith(".md"))) {
      for (const destino of enlacesRelativos(readFileSync(md, "utf8"))) {
        if (!existsSync(resolve(dirname(md), destino))) {
          problemas.push(`${barras(relative(raiz, md))}: enlace roto a ${destino}`);
        }
      }
    }
  }
}

function buscarSecretos(rutas, raiz, problemas) {
  for (const ruta of rutas) {
    const texto = readFileSync(ruta, "utf8");
    if (SECRETOS.some((re) => re.test(texto))) {
      problemas.push(`${barras(relative(raiz, ruta))}: contiene algo que parece un secreto`);
    }
  }
}

/** Problemas del marketplace de `raiz` y de cada plugin que publica (vacío = todo bien). */
export function validarPlugin(raiz) {
  const problemas = [];
  const rutaMarketplace = join(raiz, ".claude-plugin", "marketplace.json");
  const marketplace = leerJson(rutaMarketplace, problemas, "marketplace.json");
  if (!marketplace) return problemas;
  if (!esObjeto(marketplace)) return [...problemas, "marketplace.json: debe ser un objeto"];

  const { name } = marketplace;
  if (typeof name !== "string" || !NOMBRE_MARKETPLACE.test(name) || name.includes("..")) {
    problemas.push(`marketplace.json: name del marketplace inválido (${JSON.stringify(name)}): letras, dígitos, . _ -, sin ..`);
  }
  if (!esObjeto(marketplace.owner) || typeof marketplace.owner.name !== "string" || !marketplace.owner.name) {
    problemas.push("marketplace.json: falta owner.name (owner debe ser un objeto con name)");
  }
  if (!Array.isArray(marketplace.plugins)) {
    problemas.push("marketplace.json: plugins debe ser un arreglo");
    return problemas;
  }
  buscarSecretos([rutaMarketplace], raiz, problemas);

  for (const [i, entrada] of marketplace.plugins.entries()) {
    const quien = `marketplace.json: plugins[${i}]`;
    if (!esObjeto(entrada) || typeof entrada.name !== "string" || !entrada.name) {
      problemas.push(`${quien}: falta name`);
      continue;
    }
    const { source } = entrada;
    if (typeof source !== "string") {
      problemas.push(`${quien} (${entrada.name}): source debe ser una ruta relativa`);
      continue;
    }
    if (!source.startsWith("./")) {
      problemas.push(`${quien} (${entrada.name}): source "${source}" debe empezar con ./`);
      continue;
    }
    if (source.split(/[\\/]/).includes("..")) {
      problemas.push(`${quien} (${entrada.name}): source "${source}" no puede tener ..`);
      continue;
    }
    if (entrada.version !== undefined) {
      problemas.push(`${quien} (${entrada.name}): no declares version en el marketplace, va solo en plugin.json`);
    }
    const dirPlugin = join(raiz, source);
    if (!existsSync(dirPlugin) || !statSync(dirPlugin).isDirectory()) {
      problemas.push(`${quien} (${entrada.name}): source "${source}" no existe`);
      continue;
    }

    const etiqueta = barras(relative(raiz, join(dirPlugin, ".claude-plugin", "plugin.json")));
    const plugin = leerJson(join(dirPlugin, ".claude-plugin", "plugin.json"), problemas, etiqueta);
    if (esObjeto(plugin)) {
      if (typeof plugin.name !== "string" || !KEBAB.test(plugin.name) || /^(claude|anthropic)-/.test(plugin.name)) {
        problemas.push(`${etiqueta}: name ${JSON.stringify(plugin.name)} no es kebab-case válido (ni claude-/anthropic-)`);
      }
      if (plugin.name !== entrada.name) {
        problemas.push(`${etiqueta}: name "${plugin.name}" no coincide con el del marketplace "${entrada.name}"`);
      }
      if (typeof plugin.version !== "string" || !SEMVER.test(plugin.version)) {
        problemas.push(`${etiqueta}: version ${JSON.stringify(plugin.version)} debe ser semver (x.y.z)`);
      }
    } else if (plugin !== null) {
      problemas.push(`${etiqueta}: debe ser un objeto`);
    }

    validarSkills(dirPlugin, raiz, problemas);
    buscarSecretos(archivos(dirPlugin), raiz, problemas);
  }
  return problemas;
}

if (esEjecucionDirecta(import.meta.url, process.argv[1])) {
  const raiz = fileURLToPath(new URL("..", import.meta.url));
  const problemas = validarPlugin(raiz);
  for (const p of problemas) console.log(`- ${p}`);
  console.log(problemas.length ? `\n${problemas.length} problema(s) en el marketplace o el plugin.` : "Marketplace y plugin válidos.");
  process.exit(problemas.length ? 1 : 0);
}
