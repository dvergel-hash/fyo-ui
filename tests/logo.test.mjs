// El logo respeta el manual de marca: tamaño mínimo digital de 70 px (pág. 14) y área de protección
// igual a la letra «o» del logotipo alrededor del logo (pág. 15). Se leen los valores del CSS
// (resolviendo var() y calc() con css/tokens.css) y las dimensiones reales de los PNG.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const MINIMO_DIGITAL = 70;
// Ancho de la «o» medido en los PNG del logo: 28 de las 119 columnas (logo-fyo-color.png y logo-fyo-blanco.png).
const O_RELATIVA_AL_ANCHO = 28 / 119;
const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url));
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Ancho y alto intrínsecos de un PNG (cabecera IHDR). */
function dimensionesPng(ruta) {
  const b = leer(ruta);
  assert.equal(b.toString("ascii", 12, 16), "IHDR", `${ruta} no es un PNG válido`);
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

/** Tokens del :root claro de tokens.css (crudos). */
const TOKENS = (() => {
  const css = sinComentarios(leer("../css/tokens.css").toString("utf8"));
  const raiz = /:root\s*\{([^}]*)\}/.exec(css)[1];
  return new Map([...raiz.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
})();

/** Un valor CSS de longitud (px, var(), calc() simple) a px. */
function aPx(valor) {
  let v = valor.trim();
  for (let i = 0; i < 10 && /var\(/.test(v); i++) {
    v = v.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, t) => {
      assert.ok(TOKENS.has(t), `falta el token ${t} en tokens.css`);
      return TOKENS.get(t);
    });
  }
  const expresion = v.replace(/^calc\((.*)\)$/, "$1").replace(/(\d+(?:\.\d+)?)px/g, "$1");
  assert.match(expresion, /^[\d.\s*+\-/()]+$/, `no sé convertir a px: ${valor}`);
  return Function(`return (${expresion});`)();
}

/** Valores en px de un shorthand de 1 a 4 valores → [arriba, derecha, abajo, izquierda]. */
function cuatroLados(valor) {
  const partes = valor.match(/calc\([^)]*\)|var\([^)]*\)|\S+/g).map(aPx);
  const [a, d = a, b = a, i = d] = partes;
  return [a, d, b, i];
}

/** Declaraciones de cada regla (también dentro de @media) cuyo selector es exactamente `selector`. */
function reglas(archivo, selector) {
  const css = sinComentarios(leer(archivo).toString("utf8"));
  const encontradas = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!m[1].split(",").map((s) => s.trim()).includes(selector)) continue;
    encontradas.push(new Map([...m[2].matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].map((d) => [d[1], d[2].trim()])));
  }
  assert.ok(encontradas.length, `no encontré la regla ${selector} en ${archivo}`);
  return encontradas;
}

/** Reglas con su contexto: `media` es la condición del @media que las contiene (o null si están afuera). */
function reglasConMedia(archivo) {
  const css = sinComentarios(leer(archivo).toString("utf8"));
  const salida = [];
  let i = 0;
  const leerBloque = (media) => {
    while (i < css.length) {
      const abre = css.indexOf("{", i);
      const cierra = css.indexOf("}", i);
      if (cierra !== -1 && (abre === -1 || cierra < abre)) { i = cierra + 1; return; }
      if (abre === -1) { i = css.length; return; }
      const cabeza = css.slice(i, abre).trim();
      i = abre + 1;
      if (cabeza.startsWith("@media")) {
        leerBloque(cabeza.replace(/^@media\s*/, ""));
      } else {
        const fin = css.indexOf("}", i);
        const cuerpo = css.slice(i, fin);
        i = fin + 1;
        const decl = new Map([...cuerpo.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].map((d) => [d[1], d[2].trim()]));
        for (const s of cabeza.split(",")) salida.push({ media, selector: s.trim(), decl });
      }
    }
  };
  leerBloque(null);
  return salida;
}

/** Declaraciones de `selector` dentro de `@media <media>` (todas las reglas que coinciden, combinadas). */
function enMedia(archivo, media, selector) {
  const decl = new Map();
  for (const r of reglasConMedia(archivo)) {
    if (r.media === media && r.selector === selector) for (const [k, v] of r.decl) decl.set(k, v);
  }
  assert.ok(decl.size, `no encontré ${selector} dentro de @media ${media} en ${archivo}`);
  return decl;
}

const COMPONENTES = "../css/componentes.css";
const CHICAS = "(max-width: 600px)";
const MEDIANAS = "(max-width: 960px)";
const altoLogoEncabezado = () => aPx(reglas(COMPONENTES, ".marca img")[0].get("height"));
const anchoLogoEncabezado = () => {
  const { ancho, alto } = dimensionesPng("../marca/logo-fyo-color.png");
  return (altoLogoEncabezado() * ancho) / alto;
};

for (const logo of ["logo-fyo-color.png", "logo-fyo-blanco.png"]) {
  test(`el logo del encabezado (${logo}) se ve con al menos ${MINIMO_DIGITAL} px de ancho`, () => {
    const { ancho, alto } = dimensionesPng(`../marca/${logo}`);
    const anchoRenderizado = (altoLogoEncabezado() * ancho) / alto;
    assert.ok(
      anchoRenderizado >= MINIMO_DIGITAL,
      `.marca img da ${anchoRenderizado.toFixed(1)} px de ancho con ${logo} (${ancho}×${alto}); el mínimo del manual es ${MINIMO_DIGITAL} px`,
    );
  });
}

test("la demo y el README declaran el logo del encabezado con el alto del CSS y su ancho proporcional", () => {
  const alto = altoLogoEncabezado();
  const anchoEsperado = Math.round(anchoLogoEncabezado());
  for (const archivo of ["../demo/index.html", "../README.md"]) {
    const texto = leer(archivo).toString("utf8");
    const img = /<img src="[^"]*logo-fyo-color\.png" alt="fyo" width="(\d+)" height="(\d+)">/.exec(texto);
    assert.ok(img, `${archivo}: no encontré el <img> del logo del encabezado`);
    assert.deepEqual([Number(img[1]), Number(img[2])], [anchoEsperado, alto], archivo);
  }
});

test("--proteccion-logo cubre al menos el ancho de la «o» del logo del encabezado (pág. 15)", () => {
  assert.ok(TOKENS.has("--proteccion-logo"), "falta el token --proteccion-logo");
  const proteccion = aPx("var(--proteccion-logo)");
  const anchoO = anchoLogoEncabezado() * O_RELATIVA_AL_ANCHO;
  assert.ok(proteccion >= anchoO, `--proteccion-logo = ${proteccion} px y la «o» mide ${anchoO.toFixed(1)} px`);
  assert.equal(reglas(COMPONENTES, ".marca img")[0].get("height"), "var(--logo-alto-encabezado)");
});

test("encabezado: el logo tiene el área de protección arriba, abajo, a la izquierda y hasta el separador, en todos los anchos", () => {
  const proteccion = aPx("var(--proteccion-logo)");
  for (const r of reglas(COMPONENTES, ".encabezado")) {
    if (r.has("padding")) {
      const [arriba, , abajo, izquierda] = cuatroLados(r.get("padding"));
      for (const [lado, px] of [["arriba", arriba], ["abajo", abajo], ["izquierda", izquierda]]) {
        assert.ok(px >= proteccion, `.encabezado padding ${lado} = ${px} px (< ${proteccion} px): ${r.get("padding")}`);
      }
    }
    if (r.has("gap")) {
      const fila = aPx(r.get("gap").match(/calc\([^)]*\)|var\([^)]*\)|\S+/g)[0]);
      assert.ok(fila >= proteccion, `.encabezado gap entre filas = ${fila} px (< ${proteccion} px)`);
    }
  }
  for (const r of reglas(COMPONENTES, ".marca")) {
    if (r.has("gap")) assert.ok(aPx(r.get("gap")) >= proteccion, `.marca gap (logo → separador) = ${r.get("gap")}`);
  }
  assert.ok(reglas(COMPONENTES, ".marca").some((r) => r.has("gap")), ".marca debe separar el logo del nombre del producto");
});

test("login: entre el logo blanco y la tarjeta hay al menos el ancho de su «o», también en pantallas chicas", () => {
  const { ancho, alto } = dimensionesPng("../marca/logo-fyo-blanco-login.png");
  const altoLogin = aPx(reglas(COMPONENTES, ".login-logo")[0].get("height"));
  const anchoO = ((altoLogin * ancho) / alto) * O_RELATIVA_AL_ANCHO;
  const gaps = reglas(COMPONENTES, ".login").filter((r) => r.has("gap")).map((r) => aPx(r.get("gap")));
  assert.ok(gaps.length, ".login debe fijar gap");
  for (const g of gaps) assert.ok(g >= anchoO, `.login gap = ${g} px y la «o» del logo del login mide ${anchoO.toFixed(1)} px`);
});

test("≤ 960 px: la navegación va en su propia fila, así que el aire de abajo del logo lo da la separación entre filas", () => {
  const proteccion = aPx("var(--proteccion-logo)");
  const nav = enMedia(COMPONENTES, MEDIANAS, ".encabezado nav");
  assert.equal(nav.get("order"), "3");
  assert.equal(nav.get("flex-basis"), "100%");
  const encabezado = enMedia(COMPONENTES, MEDIANAS, ".encabezado");
  assert.equal(encabezado.get("padding-bottom"), "var(--espacio-2)");
  // La separación entre filas sigue siendo el área de protección (la base y ningún @media la achica).
  for (const r of reglasConMedia(COMPONENTES).filter((x) => x.selector === ".encabezado")) {
    for (const prop of ["gap", "row-gap"]) {
      if (!r.decl.has(prop)) continue;
      const fila = aPx(r.decl.get(prop).match(/calc\([^)]*\)|var\([^)]*\)|\S+/g)[0]);
      assert.ok(fila >= proteccion, `.encabezado ${prop} = ${fila} px en ${r.media ?? "la base"}`);
    }
    if (r.decl.has("padding-top")) assert.ok(aPx(r.decl.get("padding-top")) >= proteccion, "padding-top");
    if (r.decl.has("padding-left")) assert.ok(aPx(r.decl.get("padding-left")) >= proteccion, "padding-left");
  }
});

test("≤ 600 px: sesión en la fila del logo (sin el nombre del producto) y navegación en una sola fila desplazable", () => {
  assert.equal(enMedia(COMPONENTES, CHICAS, ".marca-producto").get("display"), "none");
  const nav = enMedia(COMPONENTES, CHICAS, ".encabezado nav");
  assert.equal(nav.get("flex-wrap"), "nowrap");
  assert.equal(nav.get("overflow-x"), "auto");
  assert.equal(nav.get("scrollbar-width"), "none");
  const enlaces = enMedia(COMPONENTES, CHICAS, ".encabezado nav a");
  assert.equal(enlaces.get("white-space"), "nowrap");
  assert.ok(aPx(enlaces.get("min-height")) >= 36, "los enlaces mantienen 36 px de alto para tocarlos");
  // El nombre del usuario queda solo para lectores de pantalla (no display:none) para que la sesión entre en la fila.
  const usuario = enMedia(COMPONENTES, CHICAS, ".sesion > span");
  assert.equal(usuario.get("position"), "absolute");
  assert.equal(usuario.get("clip"), "rect(0 0 0 0)");
  // El botón de salir sigue a la vista: la sesión no se oculta.
  for (const r of reglasConMedia(COMPONENTES).filter((x) => x.selector.startsWith(".sesion"))) {
    assert.notEqual(r.decl.get("display"), "none", `${r.selector} no puede ocultarse`);
  }
});
