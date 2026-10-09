# Variables de `fyo-ui` y cuándo usar cada una

Todas viven en `fyo-ui/css/tokens.css`. El modo oscuro las redefine solo: **tu CSS usa `var(--x)` y nunca un hex**. Valores: claro / oscuro («igual» = no cambia). La tabla completa, siempre al día, está en el README del paquete.

## Marca

| Variable | Valor | Usala para | No la uses para |
|---|---|---|---|
| `--celeste` | `#008eaa` / igual | Filetes, subrayados, bordes destacados, marcas decorativas (la tarjeta ya lo usa arriba). | Texto, enlaces o fondo de un botón con texto blanco (3,9:1). |
| `--gris-marca` | `#97999b` / igual | Detalles decorativos neutros. | Texto. |
| `--fondo-marca` | `#0d4552` / `#062f38` | **[fyo-ui]** Base debajo del degradé de marca (`fondo-marca.webp`) en el login y otras superficies de marca. | Fondos de pantallas de trabajo. |

El manual (pág. 35) dice que la textura con degradado de la paleta se usa para todos los fondos de la plataforma. **[fyo-ui]** decide aplicarla en las superficies de marca (login, portadas) y dejar las pantallas de trabajo sobre neutros (`--fondo`, `--superficie`), porque detrás de tablas y formularios densos el degradado baja la legibilidad y el contraste medido de los tokens.
| `--velo` | `rgba(4, 22, 27, 0.66)` / `rgba(0, 8, 10, 0.72)` | `dialog::backdrop` de cualquier modal. | Superposiciones decorativas. |

## Superficies, texto y bordes

| Variable | Usala para |
|---|---|
| `--fondo` | Fondo de la página (`body`). |
| `--superficie` | Tarjetas, paneles, tablas, campos, encabezado y modales. |
| `--cabecera-tabla` | `thead` y `tfoot`. |
| `--resalte` | Hover de navegación y de botones secundarios; fila seleccionada. |
| `--texto` | Texto principal. |
| `--tenue` | Texto secundario: leyendas, etiquetas, ayudas, montos secundarios. Nunca para el dato principal. |
| `--borde` | Bordes de tarjetas, paneles y tablas; separadores. |
| `--borde-control` | Borde de inputs, selects y textareas (≥ 3:1). |

## Acento (interacción)

| Variable | Usala para |
|---|---|
| `--acento` | Enlaces, botón primario, anillo de foco, sección activa, casillas. **El único color interactivo.** |
| `--acento-hover` | Hover del acento. |
| `--sobre-acento` | Texto sobre un fondo `--acento`. |
| `--subrayado-activo` | Marca de la sección activa en la navegación. |

## Estados

| Variables | Usalas para |
|---|---|
| `--error`, `--ok` | Mensajes de error y de confirmación (`.error`, `.ok`). |
| `--rojo-fondo`, `--rojo-texto`, `--rojo-borde` | Nivel rojo: excedido, vencido, bloqueante (`.nivel-ROJO`, `.tarjeta.excedido`). |
| `--amarillo-fondo`, `--amarillo-texto`, `--amarillo-borde` | Nivel amarillo: aviso, falta un dato (`.aviso`, `.nivel-AMARILLO`). |
| `--verde-fondo`, `--verde-texto`, `--verde-borde` | Nivel verde: dentro de lo esperado (`.nivel-VERDE`). |
| `--gris-fondo`, `--gris-texto` | Estado neutro o sin nivel (insignias propias de tu app, «Programada», «Borrador»). |

Usá siempre el trío completo (fondo + texto + borde del mismo nivel) y acompañá el color con texto: el color solo no comunica.

## Tipografía

| Variable | Valor | Usala para |
|---|---|---|
| `--fuente` | Poppins + respaldo del sistema | Ya está en `body`; heredala. |
| `--texto-xs` | 0.75rem (12 px) | Insignias, notas, rótulos `.etiqueta`. |
| `--texto-sm` | 0.875rem (14 px) | Tablas, labels, ayudas, botones, navegación. |
| `--texto-md` | 1rem (16 px) | Cuerpo y campos. |
| `--texto-lg` | 1.25rem (20 px) | `h2`, el número protagonista de una tarjeta. |
| `--texto-xl` | 1.75rem (28 px) | `h1`, uno por pantalla. |
| `--peso-normal` / `--peso-medio` / `--peso-fuerte` | 400 / 500 / 600 | Cuerpo / labels, navegación, botones / títulos, números, `th`. |
| `--interlineado` / `--interlineado-titulo` | 1.5 / 1.25 | Cuerpo / títulos y números grandes. |

Cinco tamaños y tres pesos: si necesitás otro, el problema es la jerarquía, no la escala.

## Espaciado, radios y alturas

| Variable | Valor | Usala para |
|---|---|---|
| `--espacio-1` | 4 px | Entre un label y su campo; dentro de insignias. |
| `--espacio-2` | 8 px | Entre elementos de una misma fila o grupo. |
| `--espacio-3` | 12 px | Entre campos de un formulario; entre tarjetas. |
| `--espacio-4` | 16 px | Relleno de paneles y tarjetas; separación entre bloques chicos. |
| `--espacio-5` | 24 px | Entre secciones de una pantalla. |
| `--espacio-6` | 32 px | Relleno de la tarjeta de login; separaciones grandes. |
| `--radio-sm` | 4 px | Campos y botones. |
| `--radio-md` | 8 px | Tarjetas, paneles, tablas, avisos, modales. |
| `--radio-pill` | 999 px | Insignias. |
| `--alto-control` | 36 px | Altura de inputs, selects y botones (todos iguales en una fila). |
| `--logo-alto-encabezado` | 36 px | Alto del logo en el encabezado (≈ 76,5 px de ancho; mínimo digital del manual: 70 px, pág. 14). |
| `--proteccion-logo` | 18 px | Área de protección del logo (≈ la «o» del logotipo, pág. 15): espacio libre mínimo alrededor del logo. |
| `--sombra-tarjeta` | sutil / `none` | Tarjetas y paneles. No agregues sombras más fuertes. |

Ningún `margin`, `padding` o `gap` fuera de esta escala (nada de 10, 15, 20 o 30 px).
