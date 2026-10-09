// Verificación de contraste WCAG 2.x de los tokens de fyo-ui.
// Uso: node scripts/contraste.mjs  (sale con código 1 si algún par falla).
import { readFileSync } from "node:fs";
import { esEjecucionDirecta } from "./ejecucion.mjs";

// ---------------------------------------------------------------- parser

/** Devuelve un Map con las declaraciones `--nombre: valor` de un bloque. */
function declaraciones(cuerpo) {
  const mapa = new Map();
  for (const trozo of cuerpo.split(";")) {
    const i = trozo.indexOf(":");
    if (i === -1) continue;
    const nombre = trozo.slice(0, i).trim();
    if (!nombre.startsWith("--")) continue;
    mapa.set(nombre, trozo.slice(i + 1).trim());
  }
  return mapa;
}

/** Resuelve `var(--otro)` simples (con anidación y detección de ciclos). */
function resolver(mapa) {
  const salida = new Map();
  const resolverUno = (nombre, vistos) => {
    let valor = mapa.get(nombre);
    if (valor === undefined) return undefined;
    return valor.replace(/var\(\s*(--[\w-]+)\s*\)/g, (entero, otro) => {
      if (vistos.has(otro)) throw new Error(`Ciclo de var() en ${nombre}`);
      const r = resolverUno(otro, new Set([...vistos, otro]));
      return r === undefined ? entero : r;
    });
  };
  for (const nombre of mapa.keys()) salida.set(nombre, resolverUno(nombre, new Set([nombre])));
  return salida;
}

/** Extrae el cuerpo del primer `:root { … }` del texto dado. */
function cuerpoRoot(texto) {
  const m = /:root\s*\{([^}]*)\}/.exec(texto);
  return m ? m[1] : "";
}

/**
 * Parsea tokens.css: `:root` sin media → claro; `:root` dentro de
 * `@media (prefers-color-scheme: dark)` → oscuro (hereda lo no redefinido).
 */
export function leerTokens(css) {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Bloque @media oscuro: buscamos su apertura y balanceamos llaves.
  const apertura = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/.exec(sinComentarios);
  let textoOscuro = "";
  let textoClaro = sinComentarios;
  if (apertura) {
    let prof = 1;
    let i = apertura.index + apertura[0].length;
    const ini = i;
    for (; i < sinComentarios.length && prof > 0; i++) {
      if (sinComentarios[i] === "{") prof++;
      else if (sinComentarios[i] === "}") prof--;
    }
    textoOscuro = sinComentarios.slice(ini, i - 1);
    textoClaro = sinComentarios.slice(0, apertura.index) + sinComentarios.slice(i);
  }
  // Los @font-face no son :root; el primer :root restante es el claro.
  const bruto = declaraciones(cuerpoRoot(textoClaro));
  const brutoOscuro = new Map([...bruto, ...declaraciones(cuerpoRoot(textoOscuro))]);
  return { claro: resolver(bruto), oscuro: resolver(brutoOscuro) };
}

// ------------------------------------------------------------- contraste

function aRgb(color) {
  const c = String(color).trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(c);
  if (m) return [...m[1]].map((x) => parseInt(x + x, 16));
  m = /^#([0-9a-f]{6})$/.exec(c);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  if (/^#([0-9a-f]{4}|[0-9a-f]{8})$/.test(c) || /^(rgba|hsla)\(/.test(c)) {
    throw new Error(`Color con alfa no soportado: ${color} (usá #rgb o #rrggbb opacos)`);
  }
  throw new Error(`Color no soportado: ${color} (usá #rgb o #rrggbb)`);
}

function luminancia(color) {
  const [r, g, b] = aRgb(color).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores `#rgb` / `#rrggbb`. */
export function razonDeContraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ------------------------------------------------------------------ pares

const p = (texto, fondo, minimo) => ({ nombre: `${texto} sobre ${fondo}`, texto, fondo, minimo });

/** Pares clave: texto/fondo con 4,5:1; componentes y foco con 3:1. */
export const PARES = [
  p("--texto", "--fondo", 4.5),
  p("--texto", "--superficie", 4.5),
  p("--texto", "--cabecera-tabla", 4.5),
  p("--tenue", "--superficie", 4.5),
  p("--tenue", "--fondo", 4.5),
  p("--acento", "--superficie", 4.5),
  p("--acento", "--fondo", 4.5),
  p("--sobre-acento", "--acento", 4.5),
  p("--sobre-acento", "--acento-hover", 4.5),
  p("--rojo-texto", "--rojo-fondo", 4.5),
  p("--amarillo-texto", "--amarillo-fondo", 4.5),
  p("--verde-texto", "--verde-fondo", 4.5),
  p("--gris-texto", "--gris-fondo", 4.5),
  p("--error", "--superficie", 4.5),
  p("--ok", "--superficie", 4.5),
  p("--borde-control", "--superficie", 3),
  { ...p("--acento", "--superficie", 3), nombre: "--acento sobre --superficie (anillo de foco)" },
];

/** Verifica todos los pares en ambos temas. */
export function verificar(css, pares = PARES) {
  const { claro, oscuro } = leerTokens(css);
  const resultados = [];
  for (const [tema, tokens] of [["claro", claro], ["oscuro", oscuro]]) {
    for (const par of pares) {
      const texto = tokens.get(par.texto);
      const fondo = tokens.get(par.fondo);
      if (texto === undefined || fondo === undefined) {
        throw new Error(`Falta el token ${texto === undefined ? par.texto : par.fondo} en el tema ${tema}`);
      }
      for (const [token, valor] of [[par.texto, texto], [par.fondo, fondo]]) {
        const sinResolver = /var\(\s*(--[\w-]+)/.exec(valor);
        if (sinResolver) throw new Error(`Falta el token ${sinResolver[1]} (lo usa ${token} en el tema ${tema})`);
      }
      const ratio = razonDeContraste(texto, fondo);
      resultados.push({ tema, nombre: par.nombre, ratio, minimo: par.minimo, ok: ratio >= par.minimo });
    }
  }
  return { ok: resultados.every((r) => r.ok), resultados };
}

// -------------------------------------------------------------------- CLI

if (esEjecucionDirecta(import.meta.url, process.argv[1])) {
  const ruta = new URL("../css/tokens.css", import.meta.url);
  const { ok, resultados } = verificar(readFileSync(ruta, "utf8"));
  for (const r of resultados) {
    console.log(
      `${r.ok ? "OK  " : "FALLA"}  ${r.tema.padEnd(6)}  ${r.ratio.toFixed(2).padStart(6)}  (mín ${r.minimo})  ${r.nombre}`,
    );
  }
  console.log(ok ? "\nTodos los pares cumplen." : "\nHay pares que no cumplen.");
  process.exit(ok ? 0 : 1);
}
