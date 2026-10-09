# Changelog

Todos los cambios del paquete. Sigue [versionado semántico](https://semver.org/lang/es/): agregar es menor; renombrar, quitar o cambiar el significado de un token o una clase es mayor; un cambio de valor de marca es menor y queda anotado acá.

## [Sin publicar]

## [1.0.1] - 2026-10-10

Parche de documentación y de verificación: el CSS, las fuentes y los recursos de marca no cambian.

### Corregido

- **Logos con Turbopack**: con Next 16 (Turbopack por defecto) una imagen importada desde `node_modules` llega como la URL (un `string`), no como `StaticImageData`, así que `logo.src` daba `undefined` y el logo salía roto sin que `tsc` ni `next build` lo detectaran. El README y la skill `fyo-diseno` documentan ahora el helper `urlImagen(imagen)`, que acepta las dos formas, con sus pruebas; el encabezado usa `urlImagen(logoColor)` con `width={77} height={36}`.
- **Menú sin scroll de página**: el patrón del menú ya no recomienda `scrollIntoView`, que además de la fila del menú desplazaba la ventana (y rompía la restauración del scroll en el celular). Ahora desplaza solo la fila, con el helper `desplazamientoParaVer` y sus pruebas.
- **Instalación desde el Release**: la URL recomendada es el asset del Release (`https://github.com/dvergel-hash/fyo-ui/releases/download/vX.Y.Z/fyo-ui-X.Y.Z.tgz`, el tarball de `npm pack`) y no el archivo de etiqueta que arma GitHub, cuyos bytes pueden cambiar y romper la integridad del lockfile. El README lista los hosts que tiene que alcanzar el build (`github.com`, `release-assets.githubusercontent.com` y `registry.npmjs.org`).
- La skill `fyo-diseno` (versión 1.0.1 del plugin) suma a su lista de control que los logos importados se resuelvan a una URL en Turbopack y que el menú no mueva la página.

### Agregado

- **La prueba de instalación verifica imágenes**: instala por defecto el tarball de `npm pack` (el asset del Release; `--origen archive` sigue disponible), arma una página con los dos logos importados de `fyo-ui/marca/` y pasados por `urlImagen`, y después de `next build` comprueba en el HTML prerenderizado que cada `<img>` tenga un `src` real bajo `/_next/static/media/`, terminado en `.png` y con el archivo en el build.

## [1.0.0] - 2026-10-09

Primera versión: el diseño de fyo extraído de la app de presupuesto de infraestructura, con los mismos nombres de variables y de clases.

### Incluye

- **Tokens** (`css/tokens.css`): colores de marca, superficies, texto, acento, estados (rojo, amarillo y verde), tipografía, espaciado, radios, altura de controles y sombra, cada uno con su versión para modo oscuro.
- **Poppins** 400, 500 y 600 (`fonts/`), con `@font-face` de rutas relativas y `font-display: swap`.
- **CSS base** (`css/base.css`): reset, tipografía, tablas, formularios y botones, foco visible, movimiento reducido y utilidades.
- **Componentes** (`css/componentes.css`): encabezado y navegación, tarjetas, avisos, alertas, insignias de nivel, paneles, visor de PDF y login.
- **Marca** (`marca/`): logos de color y blancos, fondo de marca y favicon.
- **Paquete npm** con `exports` (`fyo-ui/css/*`, `fyo-ui/fonts/*`, `fyo-ui/marca/*`), sin dependencias, para instalar desde el tarball de una etiqueta (sin `git`).
- **Verificaciones**: contraste WCAG de los tokens en claro y oscuro, variables e imports del CSS, demo visual en Chromium, README completo e instalación en un proyecto Next.js.
- **Demo** (`demo/index.html`): catálogo de todos los componentes.
