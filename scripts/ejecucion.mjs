// ¿El módulo se está ejecutando directamente (`node scripts/x.mjs`) o lo importó otro módulo (una prueba)?
// Compara las rutas reales: así funciona también a través de un enlace simbólico, con otra capitalización
// de la unidad en Windows o con una ruta relativa.
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const real = (ruta) => {
  try {
    return realpathSync.native(ruta);
  } catch {
    return resolve(ruta);
  }
};

/** true si `argv1` (normalmente `process.argv[1]`) apunta al mismo archivo que `importMetaUrl`. */
export function esEjecucionDirecta(importMetaUrl, argv1) {
  if (!argv1) return false;
  const a = real(fileURLToPath(importMetaUrl));
  const b = real(argv1);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
