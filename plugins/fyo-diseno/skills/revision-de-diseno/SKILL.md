---
name: revision-de-diseno
description: Usala cuando pidan revisar, auditar o criticar el diseño de una app, pantalla o sitio de FYO (fyo), preguntar «por qué se ve genérica», «por qué parece hecha por una IA», «qué le falta para verse profesional», o hacer un diagnóstico de diseño o de identidad de marca. Hace un diagnóstico de 7 puntos (colores, tipografía, espaciado, jerarquía, textos, estados y detalles que delatan a una IA) midiendo el código, con un formato fijo: primera impresión, los 5 problemas que más la delatan por impacto visual, qué se ve hoy y qué debería verse, y qué arreglar primero. Solo diagnostica: no cambia código hasta que se lo pidan. Toma como estándar el paquete fyo-ui y la skill fyo-diseno.
---

# Revisión de diseño de una app de fyo

Diagnosticás por qué una app se ve genérica o poco de fyo, con evidencia del código y de la pantalla. **Solo diagnosticás: no cambiás código, no creás archivos ni abrís PRs hasta que te lo pidan explícitamente.** Al final ofrecé hacer los arreglos.

El estándar contra el que comparás es el paquete `fyo-ui` (sus variables y clases) y la skill `fyo-diseno`: [tokens.md](../fyo-diseno/tokens.md), [manual-de-marca-resumen.md](../fyo-diseno/manual-de-marca-resumen.md), [patrones-next.md](../fyo-diseno/patrones-next.md) y [lista-de-control.md](../fyo-diseno/lista-de-control.md). Una regla de marca solo vale si está en el resumen del manual: no inventes reglas.

## Cómo medir antes de opinar

Primero ubicá el CSS de la app (`globals.css`, `*.module.css`, Tailwind en `className`, estilos en línea) y las pantallas (`app/**/page.tsx`). Después medí; cada problema que reportes tiene que traer un número o una ruta de archivo.

- **Colores distintos**: contá los valores de color escritos a mano. Más de unos pocos fuera de `var(--…)` es la primera señal.
  `rg -o --no-filename "#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)" -g "*.css" -g "*.tsx" | sort | uniq -c | sort -rn`
  Con Tailwind, contá también las clases de color: `rg -o --no-filename "\b(bg|text|border)-[a-z]+-[0-9]{2,3}\b" -g "*.tsx" | sort | uniq -c`.
- **Tamaños de letra distintos**: `rg -o --no-filename "font-size:\s*[^;]+" -g "*.css" | sort | uniq -c` (y `text-xs…text-5xl` en Tailwind). `fyo-ui` tiene 5; más de 6 es ruido.
- **Pesos**: `rg -n "font-weight:\s*(700|800|900|bold)|font-bold|font-extrabold"` (Poppins solo se carga en 400/500/600).
- **Escala de espaciado**: `rg -o --no-filename "(margin|padding|gap)[a-z-]*:\s*[^;]+" -g "*.css" | sort | uniq -c`. Todo debería ser `var(--espacio-N)` (4, 8, 12, 16, 24, 32 px); valores como 10, 15, 18, 20 o 30 px delatan espaciado a ojo.
- **Radios y sombras**: `rg -o --no-filename "(border-radius|box-shadow):\s*[^;]+" | sort | uniq -c`.
- **Estados**: `rg --files -g "loading.tsx" -g "error.tsx" -g "not-found.tsx"`; si no hay ninguno, es un problema seguro. Buscá también listas sin rama vacía (`.map(` sin un `length === 0` cerca) y botones de envío sin `disabled` mientras está pendiente.
- **Textos**: buscá inglés y relleno: `rg -n "Loading|Submit|Dashboard|Welcome|Lorem|Oops|Ups"`; verbos genéricos en botones («Aceptar», «OK», «Enviar»).
- **Marca**: ¿importa `fyo-ui/css/fyo.css`? ¿la fuente es Poppins? ¿el logo sale de `fyo-ui/marca/` y sin `filter`/`opacity`/recoloreo? ¿el celeste `#008eaa` se usa como color de texto o de botón con texto blanco?
- **La pantalla**: si podés abrir la app, mirala a 1280 px y 375 px, en claro y oscuro, con datos reales; si no, decí que el diagnóstico es solo por código.

## El diagnóstico: 7 puntos

1. **Colores**: ¿cuántos colores distintos hay y cuántos salen de las variables? ¿El celeste fyo está en detalles y `--acento` en lo interactivo? ¿La paleta complementaria se usa menos que la principal (manual, pág. 24)? ¿Hay colores de plantilla (violeta, índigo, azul de Tailwind)?
2. **Tipografía**: ¿Poppins en todo? ¿Cuántos tamaños y pesos? ¿Hay un `h1` claro y una escala que se repite, o cada pantalla inventa la suya?
3. **Espaciado**: ¿los espacios salen de una escala o están a ojo? ¿Se distinguen los grupos (poco aire adentro, más aire entre secciones)? ¿Los controles de una fila tienen la misma altura?
4. **Jerarquía**: ¿hay un protagonista por pantalla? ¿Cuántos botones primarios compiten? ¿Lo secundario se ve secundario? ¿Las tablas ordenan sus columnas por importancia?
5. **Textos**: ¿español rioplatense con voseo y tono de fyo (claros, sintéticos, simples; pág. 9)? ¿Botones con verbos concretos? ¿Formato es-AR en importes y fechas? ¿Relleno o inglés mezclado?
6. **Estados**: ¿existen `loading.tsx`, `error.tsx` y `not-found.tsx`? ¿Qué se ve con cero datos, con un error del servidor y mientras se guarda?
7. **Detalles que delatan a una IA**: degradés violeta/azul, sombras y radios grandes, «glass», emojis en títulos, íconos decorativos en cada tarjeta, métricas de adorno, textos tipo «Gestioná todo en un solo lugar», todo centrado, el mismo componente repetido sin variación, modo oscuro sin cuidar.

## Formato de respuesta (obligatorio)

Respondé exactamente con estas cuatro partes, en este orden:

**Primera impresión**: qué transmite la app hoy, en dos frases honestas.

**Los 5 problemas que más la delatan**, ordenados por impacto visual (el que más se nota primero). Para cada uno: qué veo hoy, qué debería ver y por qué.
- **Qué veo hoy**: el síntoma con evidencia (el número medido, el archivo y la línea, o la pantalla).
- **Qué debería ver**: el estado esperado, con la variable o clase de `fyo-ui` concreta (`--espacio-4`, `.tarjeta`, `--acento`…).
- **Por qué**: el efecto en quien la usa, o la regla del manual con su página.

**Qué arreglo primero**: el cambio de mayor impacto con menos esfuerzo, en una o dos frases, y por qué ese.

Cerrá ofreciendo aplicar los arreglos, sin hacerlos. Si la app está bien en algún punto, decilo en una línea; no rellenes con problemas menores para llegar a cinco: si hay menos, decí cuántos encontraste.
