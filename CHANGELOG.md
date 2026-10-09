# Changelog

Todos los cambios del paquete. Sigue [versionado semántico](https://semver.org/lang/es/): agregar es menor; renombrar, quitar o cambiar el significado de un token o una clase es mayor; un cambio de valor de marca es menor y queda anotado acá.

## [Sin publicar]

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
