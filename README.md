# fyo-ui

Estilos, tokens y recursos de marca de fyo en CSS plano. Sin framework, sin JavaScript, sin dependencias.

Con fyo-ui, cualquier app interna (Next.js, n8n, Odoo, HTML plano) se ve como fyo: Poppins, celeste de marca, modo claro y oscuro, y accesibilidad cuidada.

- **Tokens**: colores, tipografía, espaciado y radios como variables CSS (`--celeste`, `--acento`, `--espacio-4`…).
- **Componentes**: encabezado, tarjetas, tablas, formularios, avisos, alertas, insignias, paneles, visor de PDF y login.
- **Marca**: logos, favicon, fondo de marca y Poppins 400/500/600.

Para ver todo junto, abrí `demo/index.html` en un navegador (está en el repositorio, no en el paquete npm).

## Instalación

fyo-ui **no se publica en npm**: se instala desde el tarball adjunto (asset) a cada Release del repositorio. En el `package.json` de tu app:

```json
{
  "dependencies": {
    "fyo-ui": "https://github.com/dvergel-hash/fyo-ui/releases/download/v1.0.1/fyo-ui-1.0.1.tgz"
  }
}
```

La forma general es `https://github.com/dvergel-hash/fyo-ui/releases/download/vX.Y.Z/fyo-ui-X.Y.Z.tgz`. Ese archivo es el que arma `npm pack` al publicar el Release: trae **solo los archivos del paquete** (`css/`, `fonts/`, `marca/`, `README.md`, `CHANGELOG.md`, `LICENSE` y `package.json`) dentro de la carpeta `package/`, como cualquier paquete de npm.

Después, `npm install`. Para actualizar, cambiá la versión en los dos lugares de la URL (`v1.0.1/fyo-ui-1.0.1.tgz` → `v1.1.0/fyo-ui-1.1.0.tgz`) y volvé a instalar.

**Red del build.** La instalación tiene que llegar a `github.com` (responde con una redirección 302) y a `release-assets.githubusercontent.com` (donde está el archivo), además de `registry.npmjs.org` para el resto de las dependencias. Si construís detrás de un proxy o con una lista de hosts permitidos, habilitá los tres.

### Por qué el asset del Release y no `github:` ni el archivo de etiqueta

- **Sin `git`.** La forma `github:usuario/repo` (o `git+https://…`) hace que npm llame a `git`. Las imágenes `node:22-slim` con las que construimos las apps **no traen `git`**, y la instalación falla. El asset es un archivo HTTPS común: npm lo baja y lo descomprime, sin `git` ni credenciales.
- **Bytes estables.** El archivo de etiqueta que GitHub arma al vuelo (`…/archive/…/vX.Y.Z.tar.gz`) no garantiza que sus bytes sean siempre los mismos: si GitHub lo regenera, cambia el hash y la instalación falla con un error de integridad (`EINTEGRITY`) contra el `package-lock.json`. El asset es un archivo que se sube una sola vez y no cambia.
- **Versión exacta.** Queda fijado a una versión y el lockfile guarda su hash.

Requisitos: Node 22 o superior. El paquete no tiene dependencias.

## Uso

### Next.js (App Router)

Importá el CSS una sola vez, en el layout raíz, y los logos desde `fyo-ui/marca/…`:

```jsx
// app/layout.js
import "fyo-ui/css/fyo.css";

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

Los logos se importan como imágenes, pero **no leas `.src` directamente**: con Turbopack (el empaquetador por defecto de Next 16) una imagen importada desde `node_modules` llega como la URL (un `string`), no como `StaticImageData`, y leer `.src` da `undefined`: el `<img>` sale sin `src` y ni `tsc` ni `next build` lo detectan. Usá un helper que acepte las dos formas:

```ts
// app/formato.ts
/** URL de una imagen importada: con Turbopack es un string; con webpack, StaticImageData. */
export function urlImagen(imagen: string | { src: string }): string {
  return typeof imagen === "string" ? imagen : imagen.src;
}
```

```jsx
// En cualquier componente.
import logoColor from "fyo-ui/marca/logo-fyo-color.png";
import { urlImagen } from "@/app/formato";

<img src={urlImagen(logoColor)} width={77} height={36} alt="fyo" />
```

Poné el ancho y el alto a mano (77 × 36 px es el tamaño del logo en `.encabezado`): con Turbopack la importación no trae `width` ni `height`. `next/image` es opcional; el `<img>` común alcanza.

Next copia las fuentes (`fonts/`) y las imágenes al build y reescribe las rutas del CSS. No hace falta `transpilePackages` ni ninguna configuración extra en `next.config`.

**Favicon.** Importalo y pasalo en `metadata`, también con `urlImagen`:

```jsx
// app/layout.js
import favicon from "fyo-ui/marca/favicon.ico";
import { urlImagen } from "@/app/formato";

export const metadata = { icons: { icon: urlImagen(favicon) } };
```

Si preferís la convención de Next, copiá `node_modules/fyo-ui/marca/favicon.ico` a `app/favicon.ico`.

**Rutas válidas.** La ruta canónica es `fyo-ui/css/fyo.css`. El paquete también declara `import "fyo-ui"` (apunta al mismo CSS), pero usá la ruta completa: es explícita y no depende de cómo cada herramienta resuelva `exports`. Las rutas `fyo-ui/css/*`, `fyo-ui/fonts/*`, `fyo-ui/marca/*` y `fyo-ui/package.json` están expuestas; cualquier otra no existe.

Podés importar archivos sueltos si no querés todo: `fyo-ui/css/tokens.css` (variables y fuentes), `fyo-ui/css/base.css` (reset, tipografía, tablas, formularios) y `fyo-ui/css/componentes.css`. `fyo.css` los importa en ese orden, y cada uno necesita los anteriores.

### n8n, Odoo y HTML plano

Copiá (o enlazá) la carpeta `css/` junto con `fonts/` y `marca/`, **manteniendo las tres carpetas hermanas**: el CSS busca las fuentes en `../fonts/` y el fondo de marca en `../marca/`.

```text
mi-sitio/
├── css/       (fyo.css, tokens.css, base.css, componentes.css)
├── fonts/     (Poppins 400, 500, 600)
└── marca/     (logos, favicon, fondo)
```

```html
<link rel="icon" href="marca/favicon.ico">
<link rel="stylesheet" href="css/fyo.css">
```

Si servís los archivos desde otra URL (por ejemplo, un formulario de n8n o un módulo de Odoo), copiá las tres carpetas completas a ese lugar y apuntá el `<link>` a `css/fyo.css`. Si movés `css/` sin `fonts/` y `marca/`, la tipografía vuelve a la del sistema y el login pierde el fondo.

## Variables (tokens)

Todos los valores viven en `css/tokens.css`, en un único `:root`. El modo oscuro redefine los tokens que cambian dentro de `@media (prefers-color-scheme: dark)`, así que **tus estilos usan `var(--token)` y el tema cambia solo**. «Igual» significa que el valor no cambia en oscuro.

Usá siempre variables, nunca los hex directos:

```css
.mi-caja {
  background: var(--superficie);
  color: var(--texto);
  border: 1px solid var(--borde);
  border-radius: var(--radio-md);
  padding: var(--espacio-4);
}
```

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--celeste` | `#008eaa` | igual | Celeste fyo del manual de marca. Decorativo: bordes, marcas, tarjetas. No sirve para texto ni para fondo de botón (3,9:1 con blanco). |
| `--gris-marca` | `#97999b` | igual | Gris secundario de la marca. Decorativo: no usar para texto. |
| `--fondo-marca` | `#0d4552` | `#062f38` | Color base bajo el degradé de marca (pantalla de login). |
| `--velo` | `rgba(4, 22, 27, 0.66)` | `rgba(0, 8, 10, 0.72)` | Fondo detrás de los modales (`::backdrop`). |
| `--fondo` | `#f4f7f8` | `#0b1a1f` | Fondo de la página. |
| `--superficie` | `#ffffff` | `#11252c` | Fondo de tarjetas, paneles, tablas, campos y encabezado. |
| `--cabecera-tabla` | `#eaf1f3` | `#17323a` | Fondo de `thead` y `tfoot`. |
| `--resalte` | `#edf7f9` | `#123f4a` | Fondo de hover en navegación y botones secundarios. |
| `--texto` | `#15252b` | `#e3eef1` | Texto principal. |
| `--tenue` | `#52646c` | `#9bb3ba` | Texto secundario: leyendas, etiquetas, ayudas. |
| `--borde` | `#d5dfe3` | `#24414a` | Bordes de tarjetas, paneles y tablas. |
| `--borde-control` | `#7b8f97` | `#5e8692` | Borde de campos de formulario (≥ 3:1 contra la superficie). |
| `--acento` | `#007a94` | `#00c1d4` | Color interactivo: enlaces, botón primario, anillo de foco. |
| `--acento-hover` | `#006a80` | `#5fd8e4` | Acento al pasar el mouse. |
| `--sobre-acento` | `#ffffff` | `#03222a` | Texto sobre un botón primario. |
| `--subrayado-activo` | `var(--celeste)` | `var(--acento)` | Marca de la sección activa en la navegación. |
| `--error` | `#b3261e` | `#ff9b94` | Texto de error. |
| `--ok` | `#1b7a3a` | `#9be2b0` | Texto de confirmación. |
| `--rojo-fondo` | `#fde8e6` | `#4a1a17` | Fondo del nivel rojo (insignia, tarjeta excedida). |
| `--rojo-texto` | `#8a1710` | `#ffb4ae` | Texto del nivel rojo. |
| `--rojo-borde` | `#b3261e` | `#ff9b94` | Borde del nivel rojo. |
| `--amarillo-fondo` | `#fff3cd` | `#3f3200` | Fondo del nivel amarillo (aviso, insignia). |
| `--amarillo-texto` | `#5c4400` | `#ffd970` | Texto del nivel amarillo. |
| `--amarillo-borde` | `#9a6b00` | `#d9a400` | Borde del nivel amarillo. |
| `--verde-fondo` | `#e1f3e6` | `#14391f` | Fondo del nivel verde (insignia). |
| `--verde-texto` | `#0f5a28` | `#9be2b0` | Texto del nivel verde. |
| `--verde-borde` | `#1b7a3a` | `#4fbf72` | Borde del nivel verde. |
| `--gris-fondo` | `#e8eaee` | `#2a313d` | Fondo neutro de estados sin nivel. |
| `--gris-texto` | `#3b4350` | `#c9d0db` | Texto sobre `--gris-fondo`. |
| `--fuente` | `"Poppins", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | igual | Familia tipográfica: Poppins, con respaldo del sistema. |
| `--texto-xs` | `0.75rem` | igual | Insignias y notas. |
| `--texto-sm` | `0.875rem` | igual | Tablas, etiquetas, ayudas, botones. |
| `--texto-md` | `1rem` | igual | Cuerpo. |
| `--texto-lg` | `1.25rem` | igual | `h2` e importes de tarjetas. |
| `--texto-xl` | `1.75rem` | igual | `h1`. |
| `--peso-normal` | `400` | igual | Peso 400. |
| `--peso-medio` | `500` | igual | Peso 500. |
| `--peso-fuerte` | `600` | igual | Peso 600 (negrita; no se carga el 700). |
| `--interlineado` | `1.5` | igual | Interlineado del cuerpo. |
| `--interlineado-titulo` | `1.25` | igual | Interlineado de títulos. |
| `--espacio-1` | `4px` | igual | Espaciado, escala de 4 px. |
| `--espacio-2` | `8px` | igual | Espaciado. |
| `--espacio-3` | `12px` | igual | Espaciado. |
| `--espacio-4` | `16px` | igual | Espaciado. |
| `--espacio-5` | `24px` | igual | Espaciado. |
| `--espacio-6` | `32px` | igual | Espaciado. |
| `--radio-sm` | `4px` | igual | Radio de campos y botones. |
| `--radio-md` | `8px` | igual | Radio de tarjetas, paneles, tablas, avisos y visor. |
| `--radio-pill` | `999px` | igual | Radio de insignias (píldora). |
| `--alto-control` | `36px` | igual | Altura común de campos, selects y botones. |
| `--logo-alto-encabezado` | `36px` | igual | Alto del logo en `.encabezado` (≈ 76,5 px de ancho; el manual de marca pide un mínimo digital de 70 px). |
| `--proteccion-logo` | `calc(var(--logo-alto-encabezado) * 0.5)` | igual | Área de protección del logo (18 px ≈ la «o» del logotipo): espacio libre alrededor del logo del encabezado. |
| `--sombra-tarjeta` | `0 1px 2px rgba(13, 69, 82, 0.06)` | `none` | Sombra de tarjetas y paneles (en oscuro no hay). |

`--subrayado-activo` es `var(--celeste)` en claro y `var(--acento)` en oscuro.

## Componentes

Cada componente es una clase (en español). El marcado de abajo es el mínimo que funciona; el catálogo completo, con contenido real, está en `demo/index.html`. Los elementos sin clase (`h1`–`h3`, `a`, `label`, `input`, `select`, `textarea`, `button`, `table`, `dl`) ya vienen estilados por `base.css`.

**Orden de la cascada:** `.error`, `.ok`, `.leyenda`, `.solo-lectores` y `:focus-visible` están en `base.css`, que se carga **antes** que `componentes.css`; si los combinás con una clase de componente de la misma especificidad, gana la del componente.

### Tipografía y utilidades

```html
<h1>Título de página</h1>
<h2 class="seccion">Título de sección</h2>
<h3>Subtítulo</h3>
<p class="etiqueta">Etiqueta</p>
<p class="leyenda">Nota o ayuda en tono tenue.</p>
<p class="error">Algo salió mal.</p>
<p class="ok">Listo.</p>
<span class="solo-lectores">Texto sólo para lectores de pantalla</span>
```

- `.seccion`: `h2` de sección (`h2.seccion`).
- `.etiqueta`: rótulo chico en mayúsculas. También lo aplica a `h2` dentro de `.tarjeta`.
- `.leyenda`: nota o ayuda en `--tenue`.
- `.error` y `.ok`: color de error y de confirmación.
- `.solo-lectores`: oculta visualmente, pero lo leen los lectores de pantalla.

### Formularios y botones

```html
<form class="formulario">
  <label>
    Concepto
    <input name="concepto" type="text">
  </label>
  <label>
    Moneda
    <select name="moneda"><option>ARS</option><option>USD</option></select>
  </label>
  <label>
    Monto
    <input name="monto" type="number" aria-describedby="ayuda-monto">
    <span id="ayuda-monto" class="leyenda">Sin separador de miles.</span>
  </label>
  <label class="casilla">
    <input name="inventario" type="checkbox">
    Afecta inventario
  </label>
  <div class="acciones-form">
    <button type="submit">Guardar</button>
    <button type="button" class="secundario">Cancelar</button>
    <button type="button" disabled>Guardando…</button>
  </div>
</form>
```

- `.formulario`: formulario en columna (`form.formulario`), ancho máximo 520 px.
- `.casilla`: etiqueta con casilla de verificación en línea.
- `.acciones-form`: fila de botones y mensajes al pie del formulario.
- `.secundario`: botón secundario (contorno) (`button.secundario`).
- Un `button` sin clase es el primario.

### Tablas

```html
<div class="tabla-contenedor" tabindex="0" role="region" aria-label="Compras del mes">
  <table>
    <thead>
      <tr><th scope="col">Concepto</th><th scope="col" class="num">Monto</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">Licencias de backup</th><td class="num">$ 1.250.000,00</td></tr>
    </tbody>
    <tfoot>
      <tr><th scope="row">Total</th><td class="num">$ 1.250.000,00</td></tr>
    </tfoot>
  </table>
</div>
```

- `.tabla-contenedor`: si la tabla no entra, se desplaza **dentro** del contenedor y la página no. Dale `tabindex="0"` para que se pueda recorrer con teclado.
- `.num`: alinea a la derecha con cifras tabulares (`td.num`, `th.num`).

### Lista de datos

```html
<dl class="datos">
  <div><dt>Mes</dt><dd>marzo</dd></div>
  <div><dt>Cotización</dt><dd>$ 1.075,00</dd></div>
</dl>
```

- `.datos`: pares término/valor en dos columnas (`dl.datos`).

### Encabezado y navegación

```html
<header class="encabezado">
  <a class="marca" href="/">
    <img src="marca/logo-fyo-color.png" alt="fyo" width="77" height="36">
    <span class="marca-producto">Presupuesto Infraestructura</span>
  </a>
  <nav aria-label="Principal">
    <a href="/" aria-current="page">Tablero</a>
    <a href="/compras">Compras</a>
  </nav>
  <div class="sesion">
    <span>mgarcia (editor)</span>
    <form><button type="submit" class="secundario">Cerrar sesión</button></form>
  </div>
</header>
<main class="contenido">…</main>
```

- `.encabezado`: barra superior (marca, navegación, sesión). En pantallas de hasta 960 px la navegación pasa a su propia fila; hasta 600 px queda en **una sola fila que se desplaza de costado** (sin barra visible, enlaces de 36 px de alto) y el encabezado mide unos 117 px. Deja `--proteccion-logo` libre arriba, a la izquierda y entre filas (área de protección del logo, manual de marca pág. 15); como la navegación queda debajo, el borde inferior baja a `--espacio-2` hasta 960 px. Si la sección activa puede quedar fuera de la vista en el celular, tu app puede desplazar **solo la fila del menú** (`nav.scrollTo({ left })`) con un helper como `desplazamientoParaVer` (código y pruebas en el patrón del encabezado de la skill `fyo-diseno`, `plugins/fyo-diseno/skills/fyo-diseno/patrones-next.md`). No uses `scrollIntoView`: además de la fila desplaza la ventana, y en el celular rompe la restauración del scroll al navegar.
- `.marca`: contenedor del logo (puede ser un enlace); el logo mide `--logo-alto-encabezado` de alto y queda a `--proteccion-logo` del nombre del producto. En modo oscuro usá el logo blanco (`logo-fyo-blanco.png`); con HTML plano alcanza un `<picture>` con `media="(prefers-color-scheme: dark)"`.
- `.marca-producto`: nombre del producto al lado del logo. Se oculta hasta 600 px, para que logo y sesión entren en una fila.
- `.sesion`: usuario y botón de salir. Hasta 600 px el texto del usuario (el `span` hijo) queda solo para lectores de pantalla y el botón sigue visible.
- `aria-current="page"` en el enlace de la sección activa lo subraya con `--subrayado-activo`.
- `.contenido`: contenedor central de la página (máximo 1200 px, con márgenes).

### Selector de mes y tarjetas

```html
<form class="selector-mes">
  <label>Mes <select name="mes"><option>marzo</option></select></label>
  <button type="submit" class="secundario">Ver</button>
</form>

<div class="tarjetas">
  <article class="tarjeta">
    <h2>Presupuestado</h2>
    <div class="monto">$ 184.250.000,00</div>
    <div class="monto-usd">US$ 171.395,35</div>
  </article>
  <article class="tarjeta excedido">
    <h2>Disponible</h2>
    <div class="monto">-$ 1.250.000,00</div>
    <p class="nota">Presupuesto excedido</p>
  </article>
</div>
```

- `.selector-mes`: formulario en línea para elegir un período.
- `.tarjetas`: grilla de tarjetas, se acomoda sola al ancho disponible.
- `.tarjeta`: tarjeta con filete celeste arriba; su `h2` toma el estilo de `.etiqueta`.
- `.monto`: importe principal, en grande y con cifras tabulares.
- `.monto-usd`: importe secundario, en tono tenue.
- `.nota`: aclaración chica dentro de una tarjeta `excedido`.
- `.excedido`: variante en rojo (`.tarjeta.excedido`).

### Avisos, alertas e insignias

```html
<p class="aviso" role="note">No hay tipo de cambio cargado. <a href="/config">Cargarlo</a></p>

<ul class="lista-alertas">
  <li class="alerta nivel-ROJO">
    <span class="insignia nivel-ROJO">ROJO</span>
    <span class="mensaje">La renovación supera lo presupuestado en un 32,4 %.</span>
    <span class="tipo">Desvío de monto</span>
  </li>
  <li class="alerta nivel-AMARILLO">…</li>
  <li class="alerta nivel-VERDE">…</li>
</ul>
```

- `.aviso`: caja amarilla para avisos generales.
- `.lista-alertas`: lista sin viñetas, una alerta debajo de otra.
- `.alerta`: fila con borde izquierdo de color según su nivel.
- `.mensaje`: texto principal de la alerta.
- `.tipo`: categoría de la alerta, en chico.
- `.insignia`: píldora de estado; lleva siempre el texto además del color.
- `.nivel-ROJO`, `.nivel-AMARILLO` y `.nivel-VERDE`: los tres niveles, válidos en `.alerta` y en `.insignia` (`.insignia.nivel-ROJO`).

Los estados propios de cada app (por ejemplo, «Programada» o «Ejecutada») **no** forman parte del paquete: definilos en tu app con los tokens `--gris-fondo`, `--verde-fondo`, etc.

### Paneles

```html
<div class="paneles-edicion">
  <section class="panel">
    <h2>Generar compras del mes</h2>
    <p>Crea una compra programada por cada ítem con presupuesto.</p>
    <button type="button">Generar</button>
  </section>
  <section class="panel apilado">…</section>
</div>

<div class="fila-formularios">
  <form><button type="submit">Enviar plan ahora</button></form>
  <form><button type="submit">Enviar cierre ahora</button></form>
</div>
```

- `.paneles-edicion`: grilla de paneles en columnas.
- `.panel`: caja con borde y sombra; su `h2` se ve como un título de sección.
- `.apilado`: separación superior para paneles puestos uno debajo del otro.
- `.fila-formularios`: formularios lado a lado, con salto de línea si no entran.

### Visor de PDF

```html
<button type="button" class="secundario" id="abrir">Ver comprobante</button>
<dialog class="visor-pdf" id="visor" aria-label="Visor de factura.pdf">
  <div class="visor-pdf-barra">
    <strong>factura.pdf</strong>
    <button type="button" class="secundario" id="cerrar">Cerrar</button>
  </div>
  <iframe class="visor-pdf-marco" title="Comprobante PDF: factura.pdf" src="/comprobantes/factura.pdf"></iframe>
</dialog>
<script>
  const visor = document.getElementById("visor");
  document.getElementById("abrir").onclick = () => visor.showModal();
  document.getElementById("cerrar").onclick = () => visor.close();
</script>
```

- `.visor-pdf`: `<dialog>` nativo, casi a pantalla completa; el fondo del modal usa `--velo`.
- `.visor-pdf-barra`: barra superior con título y acciones.
- `.visor-pdf-marco`: el `iframe` con el PDF, ocupa el resto del alto.

### Login

```html
<div class="login">
  <img class="login-logo" src="marca/logo-fyo-blanco-login.png" alt="fyo" width="119" height="56">
  <section class="login-tarjeta">
    <h1>Presupuesto Infraestructura</h1>
    <p>Ingresá con tu usuario y contraseña.</p>
    <form class="formulario-login">
      <label>Usuario <input name="usuario" type="text"></label>
      <label>Contraseña <input name="contrasena" type="password"></label>
      <p role="alert" class="error">Usuario o contraseña incorrectos.</p>
      <button type="submit">Ingresar</button>
    </form>
  </section>
</div>
```

- `.login`: pantalla completa con el fondo de marca (`marca/fondo-marca.webp` sobre `--fondo-marca`).
- `.login-logo`: logo blanco sobre el fondo.
- `.login-tarjeta`: tarjeta del formulario.
- `.formulario-login`: formulario con el espaciado del login.

## Versiones y compatibilidad

fyo-ui sigue [versionado semántico](https://semver.org/lang/es/). La API pública son **los nombres de los tokens y de las clases, y lo que significan**.

| Cambio | Versión |
|---|---|
| Agregar un token, una clase o un componente | menor (`1.1.0`) |
| Cambiar el valor de un token de marca (por ejemplo, un matiz del celeste) | menor, y se documenta en el `CHANGELOG` |
| Corregir un defecto sin cambiar nombres ni significado | parche (`1.0.1`) |
| Renombrar o quitar un token o una clase | mayor (`2.0.0`) |
| Cambiar lo que significa un token o una clase | mayor (`2.0.0`) |

Cada cambio queda en [`CHANGELOG.md`](CHANGELOG.md). Fijá siempre la versión exacta en la URL de tu `package.json` (`v1.0.1/fyo-ui-1.0.1.tgz`) y actualizala a propósito.

## Accesibilidad

Lo que el paquete garantiza, en modo claro **y** oscuro, y lo verifica `npm run verificar`:

- **Contraste de texto**: al menos **4,5:1** (WCAG 2.x) en todos los pares de texto y fondo del paquete: texto, texto tenue, enlaces, texto sobre el botón primario, niveles rojo/amarillo/verde y mensajes de error y de ok.
- **Controles y foco**: al menos **3:1** para el borde de los campos y para el anillo de foco.
- **Foco visible**: `:focus-visible` dibuja un anillo de 3 px con `--acento`. No lo saques.
- **Movimiento reducido**: las transiciones de botones y navegación solo se aplican con `prefers-reduced-motion: no-preference`.
- **No sólo color**: las insignias llevan siempre el texto del nivel.
- **Celeste de marca**: `--celeste` (`#008eaa`) da 3,9:1 sobre blanco, por eso es decorativo. Para texto y botones se usa `--acento`.

## Verificaciones

```bash
npm install                       # una vez: instala Playwright (solo para desarrollo)
npx playwright install chromium   # una vez: el navegador de la verificación visual

npm run verificar                 # pruebas, contraste, variables, demo, README y plugin
npm run verificar:instalacion     # instala el tarball en un proyecto Next y lo construye
```

`npm run verificar` corre, en orden: las pruebas (`npm test`), el contraste de los tokens, las variables y los `@import` del CSS, la demo en Chromium (1280 y 375 px, claro y oscuro), que el README documente todos los tokens y clases (`node scripts/readme.mjs`) y que el marketplace y el plugin de Claude Code sean válidos (`node scripts/plugin.mjs`).

`npm run verificar:instalacion` es la prueba de punta a punta: genera con `npm pack` el mismo tarball que se adjunta al Release (`fyo-ui-X.Y.Z.tgz`, a partir del árbol de trabajo), arma un proyecto Next.js **fuera del repo**, instala `next`, `react`, `react-dom` y ese tarball, comprueba que `node_modules/fyo-ui` tenga solo los archivos del paquete y corre `next build` (con Turbopack, el empaquetador por defecto). Después comprueba que salieron el CSS (con `--celeste`) y las tres fuentes, y que en la página prerenderizada (`.next/server/app/index.html`) los dos logos, importados de `fyo-ui/marca/` y pasados por `urlImagen`, tengan un `src` real: no vacío, sin `undefined`, bajo `/_next/static/media/`, terminado en `.png` y con el archivo en `.next/static/media/`. Tarda varios minutos y baja paquetes, por eso la corre el CI y no el `verificar` diario. Con `npm run verificar:instalacion -- --sin-git` pone al frente del `PATH` un `git` que falla (instalación y build), como si no existiera, igual que en `node:22-slim`. Con `-- --origen archive` instala `git archive HEAD` (lo **commiteado**, como el archivo de etiqueta de GitHub) en lugar del tarball de `npm pack`.

## Plugin de Claude Code

Este repositorio también es un marketplace de Claude Code (`fyo-plugins`) con el plugin **`fyo-diseno`**, para que las apps que se arman con Claude nazcan con la marca:

```text
/plugin marketplace add dvergel-hash/fyo-ui
/plugin install fyo-diseno@fyo-plugins
```

- **`/fyo-diseno:fyo-diseno`**: se activa al crear o modificar una interfaz; usa fyo-ui, las reglas del manual de marca, patrones de Next.js y una lista de control.
- **`/fyo-diseno:revision-de-diseno`**: diagnóstico de diseño de 7 puntos de una app existente (solo diagnostica, no cambia código).

El plugin vive en `plugins/fyo-diseno/` y no forma parte del paquete npm.

## Licencia y marca

- **Código y CSS**: licencia **MIT** (ver [`LICENSE`](LICENSE)).
- **Marca**: los logos, el fondo de marca y la identidad de fyo (carpeta `marca/` y el celeste de marca) son de **fyo** y no se rigen por la MIT: usalos para productos y comunicaciones de fyo.
- **Poppins**: tipografía bajo licencia **SIL Open Font License 1.1** (`fonts/OFL.txt`).
