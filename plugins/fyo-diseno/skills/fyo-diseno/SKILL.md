---
name: fyo-diseno
description: Usala siempre que crees o modifiques cualquier interfaz, pantalla, app, dashboard, tablero, formulario, login, tabla o página web de FYO (fyo), o cuando haya que aplicar la identidad de marca de fyo (celeste fyo, Poppins, logo, tono de voz) o usar el paquete de estilos fyo-ui. Explica cómo instalar e importar fyo-ui, las reglas del Manual de identidad de fyo que afectan a una pantalla, el procedimiento para diseñar con sus variables (colores, tipografía, espaciado, jerarquía, estados y accesibilidad), patrones de Next.js con código (menú con sección activa, login, tarjetas de resumen, cargando/vacío/error, tablas densas, modales con dialog) y la lista de control antes de dar una pantalla por terminada.
---

# Diseño con la identidad de fyo

Toda interfaz de fyo parte del paquete **`fyo-ui`** (CSS plano: variables, componentes, Poppins y logos) y respeta el **Manual de identidad** de fyo. Tu trabajo no es inventar un estilo: es usar bien el que ya existe.

## 1. Instalar y usar `fyo-ui`

En el `package.json` de la app, como tarball de una etiqueta (no `github:…`: las imágenes `node:22-slim` no traen `git`):

```json
{ "dependencies": { "fyo-ui": "https://github.com/dvergel-hash/fyo-ui/archive/refs/tags/v1.0.0.tar.gz" } }
```

- **Next.js**: `import "fyo-ui/css/fyo.css";` una sola vez, en `app/layout.tsx`. Logos importados como imágenes: `import logo from "fyo-ui/marca/logo-fyo-color.png"` (también `logo-fyo-blanco.png`, `logo-fyo-blanco-login.png`, `favicon.ico`, `fondo-marca.webp`).
- **HTML plano, n8n u Odoo**: copiá `css/`, `fonts/` y `marca/` como carpetas hermanas y enlazá `css/fyo.css`.
- Los elementos sin clase (`h1`–`h3`, `a`, `label`, `input`, `select`, `button`, `table`) ya salen con el estilo de fyo. Las clases (`.encabezado`, `.tarjeta`, `.panel`, `.aviso`, `.insignia`, `.tabla-contenedor`, `.login`…) están en el README del paquete y en `demo/index.html`.
- Los estilos propios de la app van en un CSS aparte, **solo con `var(--…)`**. Para actualizar la marca se cambia la etiqueta (`v1.0.0` → `v1.1.0`).

## 2. Reglas de marca (del manual)

Resumen completo, con página de origen: [manual-de-marca-resumen.md](manual-de-marca-resumen.md). Lo que más se rompe:

- **Celeste fyo `#008EAA`** (Pantone 3135C) es el color institucional (pág. 22). En pantalla va en **superficies y detalles** (`--celeste`: filetes, subrayados, marcas). Para texto, enlaces y botones usá su derivado accesible **`--acento`** (`#007A94` claro / `#00C1D4` oscuro): el celeste puro da 3,9:1 con blanco.
- **Paleta complementaria** (amarillo, naranja, rojo, magenta, violetas, verdes, celeste claro, azul): su uso **siempre menor** que el de los colores principales; es un acento (pág. 24).
- **Poppins** para todo (pág. 25). `fyo-ui` carga 400, 500 y 600: no uses otros pesos.
- **Logo** (pág. 19): NO cambiar el color, NO alterar la composición, NO distorsionar, NO cambiar la tipografía, NO rotar, NO suprimir elementos. Color sobre fondos claros, blanco sobre fondos oscuros (pág. 17); mínimo digital 70 px (pág. 14); área de protección igual a la «o» (pág. 15); versión web en escala de grises: gris K `#737373` (pág. 20).
- **Tagline** «Potenciamos tu valor»: solo en los usos que lista el manual (pág. 21): brochures, folletos, banners institucionales, aplicaciones de gran formato, comunicaciones dirigidas a audiencias clave, presentaciones, interior de piezas editoriales, tarjetas personales, papelería comercial, merchandising, comunicaciones donde se desconozca la marca y sitio web. No lo pongas en una app interna sin que lo pidan.
- **Tono de voz** (pág. 9): **claros, entusiastas, creíbles, inteligentes, sintéticos, simples**. En una interfaz: frases cortas, qué pasó y qué hacer, en español rioplatense con voseo.
- **Gráficos** (pág. 44): colores institucionales, combinaciones cuidadas y el logo de fyo como marca de agua.

## 3. Procedimiento para una pantalla

1. **Partí de las variables de `fyo-ui`**, nunca de valores sueltos. Tabla con el uso de cada una: [tokens.md](tokens.md).
2. **No inventes** colores, tamaños de letra, espacios, radios ni sombras fuera de las escalas: 5 tamaños (`--texto-xs`…`--texto-xl`), 3 pesos, 6 espacios (4–32 px), 3 radios. Si algo «no entra» en la escala, revisá la jerarquía.
3. **Jerarquía**: decidí cuál es el **único elemento protagonista** de la pantalla (el número, la tabla o la acción) y hacé que se vea primero. Un `h1`, un botón primario por zona, lo secundario en `--tenue`.
4. **Componentes del paquete primero**: si existe una clase (`.tarjeta`, `.panel`, `.aviso`, `.insignia`, `.tabla-contenedor`, `.formulario`, `.visor-pdf`), usala en lugar de crear otra. Patrones con código: [patrones-next.md](patrones-next.md).
5. **Estados siempre diseñados**: cargando (`loading.tsx`), vacío (qué falta y qué hacer), error (`error.tsx` con «Reintentar»), no encontrado (`not-found.tsx`), botón pendiente («Guardando…»). Una pantalla sin estos estados no está terminada.
6. **Textos**: verbos concretos en los botones, mensajes sintéticos, formato es-AR (`$ 1.234,56`, `dd/mm/aaaa`).
7. **Accesibilidad**: contraste ≥ 4,5:1 en texto y ≥ 3:1 en controles y foco (los tokens ya lo cumplen; medí cualquier color propio), foco visible (no pises `:focus-visible`), todo usable con teclado, `aria-current="page"` en la sección activa, transiciones solo dentro de `@media (prefers-reduced-motion: no-preference)`, insignias y estados con texto además del color.
8. **Probá con datos reales**: el texto más largo, el importe más grande, cero filas, en 1280 px y 375 px, en claro y oscuro.

## 4. Antes de terminar

Recorré [lista-de-control.md](lista-de-control.md) y marcá cada casilla. Si el pedido es revisar una app existente en lugar de construir, usá la skill `revision-de-diseno` (`/fyo-diseno:revision-de-diseno`).

## Referencias

- [manual-de-marca-resumen.md](manual-de-marca-resumen.md): colores (HEX, RGB, CMYK, Pantone), tipografía, logo y usos incorrectos, tagline, voz, recursos gráficos; con página del manual.
- [tokens.md](tokens.md): cada variable de `fyo-ui` y cuándo usarla.
- [patrones-next.md](patrones-next.md): menú con sección activa, login, tarjeta de resumen, estados, tablas densas, modal con `<dialog>`.
- [lista-de-control.md](lista-de-control.md): casillas verificables antes de dar una pantalla por terminada.
