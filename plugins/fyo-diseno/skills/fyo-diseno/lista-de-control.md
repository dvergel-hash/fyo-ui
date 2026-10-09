# Lista de control antes de dar una pantalla por terminada

Cada casilla se puede verificar mirando el código o la pantalla. Están agrupadas por los mismos 7 puntos que usa la skill `revision-de-diseno`, más marca y accesibilidad. Si una no se cumple, la pantalla no está terminada.

## 1. Colores

- [ ] Ningún color escrito a mano en el CSS de la app: `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" app.css` solo encuentra comentarios (o nada).
- [ ] El celeste `--celeste` aparece solo en detalles (filetes, subrayados, marcas); textos, enlaces y botones usan `--acento`.
- [ ] Un único color interactivo (`--acento`); no hay botones de otros colores «para destacar».
- [ ] Los colores de la paleta complementaria, si aparecen, ocupan mucho menos que el celeste y los neutros (manual, pág. 24).
- [ ] Rojo, amarillo y verde solo significan estado (error/excedido, aviso, ok), siempre con texto.

## 2. Tipografía

- [ ] Solo Poppins, heredada de `body` (ningún `font-family` nuevo).
- [ ] Solo los tamaños `--texto-xs` a `--texto-xl` y los pesos 400/500/600 (ningún `font-weight: 700` ni `bold`).
- [ ] Un `h1` por pantalla; los `h2` de sección con `.seccion` (o dentro de `.panel`).
- [ ] Números en columnas y tarjetas con cifras tabulares (`.num`, `.monto`).

## 3. Espaciado

- [ ] Todo `margin`, `padding` y `gap` usa `--espacio-1` a `--espacio-6` (nada de 10, 15, 20 o 30 px).
- [ ] Más aire entre secciones (`--espacio-5`) que dentro de un grupo (`--espacio-2`/`--espacio-3`): los grupos se leen como grupos.
- [ ] Campos, selects y botones de una misma fila con la misma altura (`--alto-control`).
- [ ] Sin desborde horizontal a 1280 px ni a 375 px con el contenido real más largo.

## 4. Jerarquía

- [ ] Hay un elemento protagonista por pantalla (el número, la tabla o la acción principal) y se reconoce en dos segundos.
- [ ] Un solo botón primario por zona; el resto `button.secundario`.
- [ ] Lo secundario está en `--tenue` y más chico; no compite con lo principal.
- [ ] Las tablas tienen la columna que identifica la fila primero y las de baja prioridad ocultas en pantallas chicas.

## 5. Textos

- [ ] Español rioplatense con voseo, en todos los textos («Ingresá», «Cargalo»).
- [ ] Botones con verbos concretos («Guardar compra», «Generar compras»), no «Aceptar» u «OK».
- [ ] Mensajes claros y sintéticos (manual, pág. 9): qué pasó y qué hacer, sin jerga técnica ni chistes.
- [ ] Formato es-AR: `$ 1.234.567,89`, `US$ 1.234,56`, fechas `dd/mm/aaaa`, `—` cuando no hay dato.
- [ ] Sin textos de relleno («Lorem», «Bienvenido a tu dashboard», «Gestioná todo en un solo lugar»).

## 6. Estados

- [ ] Existe `loading.tsx` (o un estado de carga visible) en cada ruta que busca datos.
- [ ] Existe `error.tsx` con mensaje humano y botón «Reintentar»; existe `not-found.tsx` (y se usa `notFound()` cuando un id no existe).
- [ ] El estado vacío dice qué falta y ofrece la acción que lo resuelve.
- [ ] Los botones de envío se deshabilitan y cambian el texto mientras la acción está pendiente («Guardando…»).
- [ ] Error y confirmación de formularios en `role="alert"` / `role="status"`, con `.error` / `.ok`.

## 7. Detalles que delatan a una IA

- [ ] Sin degradés violeta/azul, sombras grandes, bordes muy redondeados ni efectos «glass» ajenos a la marca.
- [ ] Sin emojis decorativos en títulos o botones, ni íconos que no agregan información.
- [ ] Sin tarjetas de métricas inventadas ni datos de ejemplo en producción.
- [ ] Sin textos en inglés mezclados («Dashboard», «Submit», «Loading…»).
- [ ] Todo se ve igual de cuidado en modo oscuro (`prefers-color-scheme: dark`).

## Marca

- [ ] El logo es un archivo de `fyo-ui/marca/`, sin recolorear, rotar, distorsionar ni recortar (manual, pág. 19): color en claro, blanco en oscuro y sobre el fondo de marca (pág. 17).
- [ ] El logo respeta el mínimo digital de 70 px y su área de protección (págs. 14–15).
- [ ] No se agregó el tagline a la app sin que lo pidan (pág. 21: las apps no figuran entre los usos permitidos).
- [ ] Si hay gráficos, llevan el logo de fyo como marca de agua y usan los colores institucionales (pág. 44).

## Accesibilidad

- [ ] Contraste ≥ 4,5:1 en texto y ≥ 3:1 en bordes de campos y foco, en claro y oscuro (los tokens ya lo cumplen; los colores propios hay que medirlos).
- [ ] Foco visible en todo lo interactivo (no se pisó `:focus-visible`); se puede usar todo con teclado.
- [ ] Toda animación o transición propia está dentro de `@media (prefers-reduced-motion: no-preference)`.
- [ ] Cada campo tiene `label`; cada imagen, `alt`; cada tabla desplazable, `tabindex="0"`, `role="region"` y `aria-label`.
- [ ] La sección activa del menú lleva `aria-current="page"`.
