// Pruebas del validador del marketplace y del plugin fyo-diseno (scripts/plugin.mjs):
// casos rotos sobre directorios temporales, un plugin mínimo válido y el repositorio real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validarPlugin, frontmatter } from "../scripts/plugin.mjs";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

const MARKETPLACE = {
  name: "mi-marketplace",
  owner: { name: "Equipo" },
  description: "Marketplace de prueba",
  plugins: [{ name: "mi-plugin", source: "./plugins/mi-plugin", description: "Plugin de prueba" }],
};
const PLUGIN = { name: "mi-plugin", version: "1.0.0", description: "Plugin de prueba" };
const SKILL = `---
name: mi-skill
description: Usala cuando haya que probar el validador.
---

# Mi skill

Leé [la referencia](referencia.md) antes de empezar.
`;

/** Arma un marketplace mínimo válido en un directorio temporal; `cambios` permite romperlo. */
function armar(cambios = {}) {
  const raiz = mkdtempSync(join(tmpdir(), "plugin-"));
  const escribir = (ruta, contenido) => {
    const destino = join(raiz, ruta);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, typeof contenido === "string" ? contenido : JSON.stringify(contenido, null, 2));
  };
  escribir(".claude-plugin/marketplace.json", cambios.marketplace ?? MARKETPLACE);
  escribir("plugins/mi-plugin/.claude-plugin/plugin.json", cambios.plugin ?? PLUGIN);
  escribir(`plugins/mi-plugin/skills/${cambios.dirSkill ?? "mi-skill"}/SKILL.md`, cambios.skill ?? SKILL);
  escribir(`plugins/mi-plugin/skills/${cambios.dirSkill ?? "mi-skill"}/referencia.md`, cambios.referencia ?? "# Referencia\n");
  for (const [ruta, contenido] of Object.entries(cambios.extra ?? {})) escribir(ruta, contenido);
  return raiz;
}

/** Valida un caso armado y borra el directorio temporal. */
function validar(cambios) {
  const raiz = armar(cambios);
  try {
    return validarPlugin(raiz);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

/** Exige exactamente un problema y que su texto diga lo esperado. */
function unProblema(problemas, patron) {
  assert.equal(problemas.length, 1, `se esperaba un problema y hubo ${problemas.length}: ${problemas.join(" | ")}`);
  assert.match(problemas[0], patron);
}

test("un marketplace con un plugin mínimo válido no tiene problemas", () => {
  assert.deepEqual(validar(), []);
});

test("marketplace sin owner", () => {
  const { owner, ...sinOwner } = MARKETPLACE;
  unProblema(validar({ marketplace: sinOwner }), /owner/);
});

test("marketplace con un name inválido", () => {
  unProblema(validar({ marketplace: { ...MARKETPLACE, name: "mi..marketplace" } }), /name.*marketplace/i);
});

test("source que no empieza con ./", () => {
  const marketplace = { ...MARKETPLACE, plugins: [{ name: "mi-plugin", source: "plugins/mi-plugin" }] };
  unProblema(validar({ marketplace }), /source.*\.\//);
});

test("source con ..", () => {
  const marketplace = { ...MARKETPLACE, plugins: [{ name: "mi-plugin", source: "./plugins/../plugins/mi-plugin" }] };
  unProblema(validar({ marketplace }), /source.*\.\./);
});

test("source que apunta a un directorio que no existe", () => {
  const marketplace = { ...MARKETPLACE, plugins: [{ name: "mi-plugin", source: "./plugins/otro" }] };
  unProblema(validar({ marketplace }), /no existe/);
});

test("versión en el marketplace y en plugin.json", () => {
  const marketplace = { ...MARKETPLACE, plugins: [{ ...MARKETPLACE.plugins[0], version: "1.0.0" }] };
  unProblema(validar({ marketplace }), /version.*plugin\.json/);
});

test("plugin.json sin versión semver", () => {
  unProblema(validar({ plugin: { ...PLUGIN, version: "1.0" } }), /version.*semver/);
});

test("name distinto entre el marketplace y plugin.json", () => {
  unProblema(validar({ plugin: { ...PLUGIN, name: "otro-plugin" } }), /otro-plugin.*mi-plugin|mi-plugin.*otro-plugin/);
});

test("name de plugin.json que no es kebab-case", () => {
  const marketplace = { ...MARKETPLACE, plugins: [{ name: "Mi_Plugin", source: "./plugins/mi-plugin" }] };
  const problemas = validar({ marketplace, plugin: { ...PLUGIN, name: "Mi_Plugin" } });
  unProblema(problemas, /kebab/);
});

test("skill con name distinto del directorio", () => {
  unProblema(validar({ skill: SKILL.replace("name: mi-skill", "name: otra-skill") }), /otra-skill.*mi-skill|mi-skill.*otra-skill/);
});

test("skill sin description", () => {
  unProblema(validar({ skill: SKILL.replace(/^description:.*\n/m, "") }), /description/);
});

test("skill con description de más de 1.024 caracteres", () => {
  unProblema(validar({ skill: SKILL.replace(/^description:.*$/m, `description: ${"a".repeat(1025)}`) }), /description.*1024/);
});

test("SKILL.md que no empieza con ---", () => {
  unProblema(validar({ skill: "# Sin frontmatter\n" }), /---/);
});

test("SKILL.md de más de 500 líneas", () => {
  unProblema(validar({ skill: SKILL + "línea\n".repeat(500) }), /500/);
});

test("enlace relativo roto en SKILL.md", () => {
  unProblema(validar({ skill: SKILL.replace("referencia.md", "no-existe.md") }), /no-existe\.md/);
});

test("enlace relativo roto en un archivo de referencia", () => {
  unProblema(validar({ referencia: "Ver [patrones](patrones.md).\n" }), /patrones\.md/);
});

test("los enlaces externos, a anclas y dentro de bloques de código no se validan", () => {
  const referencia = "Ver [docs](https://example.com) y [arriba](#referencia).\n\n```js\nconst x = a[0](b);\n```\n";
  assert.deepEqual(validar({ referencia }), []);
});

test("description en varias líneas (escalar plano YAML con continuación indentada) se lee completa", () => {
  const skill = SKILL.replace(/^description:.*$/m, "description: Usala cuando haya\n  que probar el validador.");
  assert.deepEqual(validar({ skill }), []);
  const larga = SKILL.replace(/^description:.*$/m, `description: inicio\n  ${"a".repeat(1030)}`);
  unProblema(validar({ skill: larga }), /description.*1024/);
});

test("frontmatter: el escalar plano multilínea se une con espacios", () => {
  const datos = frontmatter("---\nname: x\ndescription: una\n  dos\n  tres\notra: y\n---\n");
  assert.equal(datos.description, "una dos tres");
  assert.equal(datos.otra, "y");
});

test("un secreto falso sk-ant-… en un archivo del plugin", () => {
  // Armado por partes para que este archivo no parezca contener un secreto (tests/publicable.test.mjs).
  unProblema(validar({ referencia: `clave ${"sk-"}ant-api03-abcdefghijklmnop\n` }), /secreto/);
});

test("una asignación de api_key con un valor largo", () => {
  unProblema(validar({ referencia: "api_key = abcdefghijklmnopqrstuvwx\n" }), /secreto/);
});

test("el marketplace y el plugin reales del repositorio son válidos", () => {
  assert.deepEqual(validarPlugin(RAIZ), []);
});

test("el marketplace real publica fyo-diseno desde ./plugins/fyo-diseno, con versión solo en plugin.json", () => {
  const marketplace = JSON.parse(readFileSync(join(RAIZ, ".claude-plugin/marketplace.json"), "utf8"));
  const plugin = JSON.parse(readFileSync(join(RAIZ, "plugins/fyo-diseno/.claude-plugin/plugin.json"), "utf8"));
  assert.equal(marketplace.name, "fyo-plugins");
  assert.equal(marketplace.owner.name, "FYO Infraestructura");
  assert.deepEqual(marketplace.plugins.map((p) => [p.name, p.source]), [["fyo-diseno", "./plugins/fyo-diseno"]]);
  assert.equal(marketplace.plugins[0].version, undefined);
  assert.equal(plugin.name, "fyo-diseno");
  assert.equal(plugin.version, "1.0.1");
  assert.equal(plugin.license, "MIT");
});

test("el patrón del encabezado en patrones-next.md declara el logo con al menos 70 px de ancho (manual, pág. 14)", () => {
  const patrones = readFileSync(join(RAIZ, "plugins/fyo-diseno/skills/fyo-diseno/patrones-next.md"), "utf8");
  const img = /<img src=\{urlImagen\(logoColor\)\} alt="fyo" width=\{(\d+)\} height=\{(\d+)\} \/>/.exec(patrones);
  assert.ok(img, "no encontré el <img> del logo en el patrón del encabezado");
  assert.ok(Number(img[1]) >= 70, `el logo del encabezado declara width=${img[1]}`);
});

test("revision-de-diseno tiene los siete puntos y las cuatro partes del formato de respuesta", () => {
  const skill = readFileSync(join(RAIZ, "plugins/fyo-diseno/skills/revision-de-diseno/SKILL.md"), "utf8");
  const puntos = ["Colores", "Tipografía", "Espaciado", "Jerarquía", "Textos", "Estados", "Detalles que delatan a una IA"];
  puntos.forEach((p, i) => assert.match(skill, new RegExp(`${i + 1}\\. \\*\\*${p}`), `falta el punto ${i + 1}: ${p}`));
  for (const parte of [
    /Primera impresión/,
    /Los 5 problemas que más la delatan/,
    /qué veo hoy, qué debería ver y por qué/,
    /Qué arreglo primero/,
  ]) {
    assert.match(skill, parte);
  }
  assert.match(skill, /no (cambi|toc)/i);
});
