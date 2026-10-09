// Prueba de instalación: arma un proyecto Next.js mínimo FUERA del repo, instala fyo-ui como lo hará
// un consumidor, corre `next build` y verifica que salieron el CSS y las fuentes.
// Uso: node scripts/instalacion.mjs [--origen archive|pack] [--sin-git]
//   --origen archive  (por defecto) instala `git archive HEAD` con la carpeta fyo-ui-<versión>/, que es
//                     lo que produce el tarball de etiqueta de GitHub y lo que documenta el README.
//                     Refleja lo COMMITEADO en HEAD (.gitattributes incluido).
//   --origen pack     instala el tarball de `npm pack` (aplica el campo "files" de package.json).
//   --sin-git         pone al frente del PATH un `git` de mentira que falla: cualquier intento de usar
//                     git rompe la instalación, como en las imágenes node:22-slim (el resto del PATH
//                     queda intacto: sh, coreutils y node siguen andando).
// Sale con código 1 y un mensaje claro ante cualquier falla. Lleva varios minutos: es solo para CI
// (y para correrla a mano antes de etiquetar una versión).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { esEjecucionDirecta } from "./ejecucion.mjs";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const MARCA_STUB = "git-de-mentira-de-fyo-ui";

/** Crea en `dir` un `git` que siempre falla (script sh en POSIX, `git.cmd` en Windows). Devuelve su ruta. */
export function crearStubGit(dir, plataforma = process.platform) {
  const mensaje = `${MARCA_STUB}: git no está disponible en este entorno (prueba --sin-git)`;
  if (plataforma === "win32") {
    const ruta = join(dir, "git.cmd");
    writeFileSync(ruta, `@echo off\r\necho ${mensaje} 1>&2\r\nexit /b 1\r\n`);
    return ruta;
  }
  const ruta = join(dir, "git");
  writeFileSync(ruta, `#!/bin/sh\necho "${mensaje}" >&2\nexit 1\n`);
  chmodSync(ruta, 0o755);
  return ruta;
}

/** PATH con el directorio del stub al frente y todo lo demás intacto. */
export function pathConStubGit(path, dirStub, separador = delimiter) {
  return path ? dirStub + separador + path : dirStub;
}

function archivosDe(dir) {
  const salida = [];
  if (!existsSync(dir)) return salida;
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosDe(ruta));
    else salida.push(ruta);
  }
  return salida;
}

const SUELTOS = ["README.md", "CHANGELOG.md", "LICENSE", "package.json"];
const CARPETAS = ["css", "fonts", "marca"];

/** Revisa el contenido de node_modules/fyo-ui: solo los archivos del paquete. Devuelve los problemas. */
export function comprobarPaqueteInstalado(dir) {
  const rel = archivosDe(dir).map((f) => relative(dir, f).split("\\").join("/"));
  const problemas = [];
  const raros = rel.filter((a) => !CARPETAS.some((c) => a.startsWith(c + "/")) && !SUELTOS.includes(a));
  if (raros.length) problemas.push(`node_modules/fyo-ui trae archivos que no son del paquete: ${raros.join(", ")}`);
  for (const s of SUELTOS) if (!rel.includes(s)) problemas.push(`a node_modules/fyo-ui le falta ${s}`);
  for (const c of CARPETAS) if (!rel.some((a) => a.startsWith(c + "/"))) problemas.push(`a node_modules/fyo-ui le falta ${c}/`);
  return problemas;
}

/** Revisa la carpeta `.next/static` de un build. Devuelve la lista de problemas (vacía = bien). */
export function comprobarBuild(staticDir) {
  const problemas = [];
  const archivos = archivosDe(staticDir);
  if (!archivos.length) return [`no hay archivos en ${staticDir}: ¿falló el build?`];

  const css = archivos.filter((f) => f.endsWith(".css"));
  if (!css.some((f) => readFileSync(f, "utf8").includes("--celeste"))) {
    problemas.push(
      `ningún CSS de .next/static contiene --celeste (CSS encontrados: ${css.length}); ¿se importó fyo-ui/css/fyo.css?`,
    );
  }

  const fuentes = archivos.filter((f) => f.endsWith(".woff2"));
  const distintas = new Set(fuentes.map((f) => createHash("sha256").update(readFileSync(f)).digest("hex")));
  if (distintas.size < 3) {
    problemas.push(`se esperaban 3 woff2 de Poppins distintos en .next/static y hay ${distintas.size}`);
  }

  if (!archivos.some((f) => f.endsWith(".png"))) {
    problemas.push("no salió ningún png en .next/static: el logo de fyo-ui/marca/ no se empaquetó");
  }
  return problemas;
}

// ---------------------------------------------------------------------------------------------

const PAGINA_LAYOUT = `import "fyo-ui/css/fyo.css";
import favicon from "fyo-ui/marca/favicon.ico";

export const metadata = {
  title: "Consumidor de fyo-ui",
  icons: { icon: favicon.src },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
`;

const PAGINA_INICIO = `import logo from "fyo-ui/marca/logo-fyo-color.png";

export default function Inicio() {
  return (
    <main className="contenido">
      <h1>Hola desde un proyecto que usa fyo-ui</h1>
      <img src={logo.src} width={logo.width} height={logo.height} alt="fyo" />
      <p className="leyenda">Si ves Poppins y el celeste de fyo, el paquete anda.</p>
    </main>
  );
}
`;

function fallar(mensaje) {
  console.error(`\nFALLÓ la prueba de instalación: ${mensaje}`);
  process.exitCode = 1;
}

function correr(titulo, comando, args, { cwd, env }) {
  console.log(`\n> ${titulo}`);
  // npm es un .cmd en Windows: se invoca por shell con una única cadena (los argumentos son fijos).
  // El resto (node con ruta que puede tener espacios) va directo, sin shell.
  const r = comando === "npm"
    ? spawnSync(["npm", ...args].join(" "), { cwd, env, stdio: "inherit", shell: true })
    : spawnSync(comando, args, { cwd, env, stdio: "inherit" });
  if (r.error) throw new Error(`${titulo}: no se pudo ejecutar (${r.error.message})`);
  if (r.status !== 0) throw new Error(`${titulo}: terminó con código ${r.status}`);
}

function leerOrigen(argv) {
  const i = argv.findIndex((a) => a === "--origen" || a.startsWith("--origen="));
  if (i < 0) return "archive";
  const valor = argv[i].includes("=") ? argv[i].split("=")[1] : argv[i + 1];
  if (valor !== "archive" && valor !== "pack") {
    throw new Error(`--origen debe ser "archive" o "pack" (se recibió ${JSON.stringify(valor)})`);
  }
  return valor;
}

/** Genera el tarball a instalar en `tmp` y devuelve su ruta. */
function generarTarball(origen, tmp) {
  if (origen === "pack") {
    console.log("> npm pack");
    const pack = spawnSync("npm pack --json --pack-destination " + JSON.stringify(tmp), { cwd: RAIZ, encoding: "utf8", shell: true });
    if (pack.status !== 0) throw new Error(`npm pack terminó con código ${pack.status}\n${pack.stderr}`);
    return join(tmp, JSON.parse(pack.stdout)[0].filename);
  }
  const version = JSON.parse(readFileSync(join(RAIZ, "package.json"), "utf8")).version;
  const sucio = spawnSync("git status --porcelain --untracked-files=no", { cwd: RAIZ, encoding: "utf8", shell: true });
  if (sucio.stdout?.trim()) {
    console.log("Aviso: hay cambios sin commitear; `git archive HEAD` prueba lo commiteado, no el árbol de trabajo.");
  }
  const destino = join(tmp, `fyo-ui-${version}.tar.gz`);
  console.log(`> git archive --format=tar.gz --prefix=fyo-ui-${version}/ HEAD`);
  const r = spawnSync("git", ["archive", "--format=tar.gz", `--prefix=fyo-ui-${version}/`, "-o", destino, "HEAD"], { cwd: RAIZ, encoding: "utf8" });
  if (r.error || r.status !== 0) throw new Error(`git archive falló: ${r.error?.message ?? r.stderr}`);
  return destino;
}

let tmpActual = null;
function limpiar(tmp) {
  if (!tmp) return;
  try {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch (e) {
    console.error(`Aviso: no se pudo borrar ${tmp}: ${e.message}`);
  }
}
for (const senal of ["SIGINT", "SIGTERM"]) {
  process.on(senal, () => {
    limpiar(tmpActual);
    process.exit(130);
  });
}

function ejecutar() {
  const sinGit = process.argv.includes("--sin-git");
  const inicio = Date.now();
  let tmp = null;
  try {
    const origen = leerOrigen(process.argv);
    tmp = tmpActual = mkdtempSync(join(tmpdir(), "fyo-ui-instalacion-"));
    const proyecto = join(tmp, "consumidor");

    // 1. Tarball a instalar (queda fuera del repo, en el temporal).
    const tarball = generarTarball(origen, tmp);
    console.log(`  origen: ${origen}; tarball: ${tarball} (${Math.round(statSync(tarball).size / 1024)} KB)`);

    // 2. Proyecto Next mínimo.
    mkdirSync(join(proyecto, "app"), { recursive: true });
    writeFileSync(join(proyecto, "package.json"), JSON.stringify({ name: "consumidor-fyo-ui", version: "0.0.0", private: true }, null, 2));
    writeFileSync(join(proyecto, "app", "layout.js"), PAGINA_LAYOUT);
    writeFileSync(join(proyecto, "app", "page.js"), PAGINA_INICIO);

    // 3. Entorno de la instalación Y del build (el mismo): con --sin-git, un `git` que falla va al frente del PATH.
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
    if (sinGit) {
      const dirStub = join(tmp, "stub-git");
      mkdirSync(dirStub);
      crearStubGit(dirStub);
      const clave = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
      env[clave] = pathConStubGit(env[clave] ?? "", dirStub);
      const g = spawnSync("git --version", { env, shell: true, encoding: "utf8" });
      if (g.status === 0 || !String(g.stderr).includes(MARCA_STUB)) {
        throw new Error("`git` no resuelve al stub que falla con este PATH; la prueba --sin-git no sería válida");
      }
      console.log("\n(--sin-git) `git --version` falla en el PATH de la instalación y del build.");
    }

    // 4. Instalar next, react, react-dom y fyo-ui desde el tarball.
    correr(
      "npm install next react react-dom <tarball de fyo-ui>",
      "npm",
      ["install", "--no-audit", "--no-fund", "--loglevel=error", "next", "react", "react-dom", process.platform === "win32" ? JSON.stringify(tarball) : tarball],
      { cwd: proyecto, env },
    );

    const dirInstalado = join(proyecto, "node_modules", "fyo-ui");
    const instalado = join(dirInstalado, "package.json");
    if (!existsSync(instalado)) throw new Error("npm install terminó pero no quedó node_modules/fyo-ui");
    console.log(`  fyo-ui instalado: v${JSON.parse(readFileSync(instalado, "utf8")).version}`);
    const sobrantes = comprobarPaqueteInstalado(dirInstalado);
    if (sobrantes.length) throw new Error("el paquete instalado no es el esperado:\n  - " + sobrantes.join("\n  - "));
    console.log("  contenido instalado: solo css/, fonts/, marca/, README, CHANGELOG, LICENSE y package.json.");

    // 5. Build.
    correr("next build", process.execPath, [join(proyecto, "node_modules", "next", "dist", "bin", "next"), "build"], { cwd: proyecto, env });

    // 6. Verificar la salida.
    const problemas = comprobarBuild(join(proyecto, ".next", "static"));
    if (problemas.length) throw new Error("el build no trae lo esperado:\n  - " + problemas.join("\n  - "));

    const segundos = Math.round((Date.now() - inicio) / 1000);
    console.log(`\nInstalación verificada en ${segundos} s: CSS con --celeste, tres woff2 de Poppins y el logo salieron en .next/static.`);
  } catch (e) {
    fallar(e.message);
  } finally {
    // Siempre limpiar el temporal (incluye el tarball, el stub y el proyecto).
    limpiar(tmp);
  }
}

if (esEjecucionDirecta(import.meta.url, process.argv[1])) ejecutar();
