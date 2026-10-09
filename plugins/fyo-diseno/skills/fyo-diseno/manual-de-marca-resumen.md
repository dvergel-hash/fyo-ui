# Manual de identidad de fyo: resumen para interfaces

Lo esencial del *Manual de identidad* de fyo (62 páginas) que afecta a una pantalla. Cada regla cita la sección y la página del PDF. **Si algo no está acá, el manual no lo dice**: no lo inventes. Las decisiones que no salen del manual sino del paquete `fyo-ui` (por accesibilidad) están marcadas como **[fyo-ui]**.

## Colores (MARCA › Paleta cromática, págs. 22–24)

### Principal (págs. 22–23)

| Color | WEB | RGB | CMYK | Pantone | En `fyo-ui` |
|---|---|---|---|---|---|
| **Celeste fyo** (color institucional) | `#008EAA` | 0 142 170 | 100 0 22 10 | 3135C | `--celeste` |
| Gris | `#97999B` | 151 153 155 | 38 29 24 5 | 7C | `--gris-marca` |

- El color institucional es el «Celeste fyo» y se reproduce siempre con sus equivalencias exactas (pág. 22): no uses «un celeste parecido».
- La paleta principal incluye además un **degradado** (pág. 23), que es el que se usa en los fondos (ver *Fondos*).
- **[fyo-ui]** `#008EAA` da 3,9:1 con blanco: no alcanza el 4,5:1 de WCAG para texto. Por eso el celeste puro queda para superficies y detalles (filetes, subrayado de la sección activa, marcas) y los textos, enlaces y botones usan su derivado accesible `--acento` (`#007A94` en claro, `#00C1D4` en oscuro; este último es un color de la paleta complementaria).

### Complementaria (pág. 24)

El manual dice que su uso **siempre debe ser menor** que el de los colores principales: funcionan como **acento** dentro del sistema.

| WEB | RGB | CMYK | Pantone |
|---|---|---|---|
| `#FAEB37` | 250 235 55 | 0 0 97 0 | 3955U |
| `#FF6A14` | 255 106 20 | 0 66 99 0 | 1585C |
| `#E10600` | 225 6 0 | 0 94 100 0 | 2347C |
| `#E63888` | 230 56 136 | 0 87 3 0 | 2039C |
| `#6E3FA3` | 110 63 163 | 70 88 0 0 | 2077C |
| `#A05EB5` | 160 94 181 | 42 71 0 0 | 2583C |
| `#ACE152` | 172 225 82 | 29 0 83 0 | 2290U |
| `#6CC24A` | 108 194 74 | 59 0 90 0 | 360C |
| `#00C1D4` | 0 193 212 | 70 0 13 0 | 3115C |
| `#006EC1` | 0 110 193 | 100 0 0 0 | 2175XGC |

En una app: la pantalla es celeste, gris y neutros; un color complementario aparece poco y con un motivo (por ejemplo, distinguir series en un gráfico). **[fyo-ui]** Los estados (error, aviso, ok) usan los tokens `--rojo-*`, `--amarillo-*`, `--verde-*`, ajustados para contraste; no son colores del manual.

## Tipografía (MARCA › Tipografía, págs. 25–26)

- Todas las comunicaciones de la empresa, institucionales o comerciales, usan la familia **Poppins** (pág. 25).
- El manual muestra las variantes Light, Regular, Medium, SemiBold y Bold (pág. 26).
- **[fyo-ui]** El paquete carga solo **400 (Regular), 500 (Medium) y 600 (SemiBold)**, con `--peso-normal`, `--peso-medio` y `--peso-fuerte`. No pidas 300 ni 700: el navegador los sintetiza y se ven mal.

## Logotipo (MARCA › Logotipo, págs. 12–20)

- **Qué significa** (pág. 12): el paréntesis sugiere inclusión y posibilidades infinitas; la tipografía moderna y clara, una empresa innovadora y accesible; el celeste, confianza, estabilidad y profesionalismo.
- **Tamaño mínimo** (pág. 14): **70 px** en digital (2 cm en impresión de alta calidad).
- **Área de protección** (pág. 15): alrededor del logo, un espacio libre igual a la letra «o» del logotipo.
- **Sobre color** (pág. 16): si no se ve bien sobre un fondo complejo, conviene usarlo en **blanco**.
- **Positivo y negativo** (pág. 17): versión positiva (color) sobre fondos con luminosidad superior al gris 50 %; versión negativa (blanco) sobre fondos más oscuros que el gris 50 %. En una app: logo color en tema claro y logo blanco en tema oscuro y sobre el fondo de marca del login.
- **Sobre imágenes** (pág. 18): si la foto interfiere con la legibilidad, oscurecé (o aclarás) el fondo hasta lograr contraste.
- **Usos incorrectos** (pág. 19), el logo no debe sufrir ninguna alteración:
  1. NO cambiar el color.
  2. NO alterar la composición.
  3. NO distorsionar.
  4. NO cambiar la tipografía.
  5. NO rotar.
  6. NO suprimir elementos.
- **Escala de grises** (pág. 20): versión imprenta K 55 %; **versión web `#737373`**.
- **[fyo-ui]** Los logos vienen en `fyo-ui/marca/`: `logo-fyo-color.png`, `logo-fyo-blanco.png` y `logo-fyo-blanco-login.png`. Mantené la proporción (fijá solo el alto) y nunca le apliques `filter`, `opacity` ni un color por CSS.

## Tagline (MARCA › Tagline, pág. 21)

- Texto: **«Potenciamos tu valor»**. Se compone en Poppins SemiBold («Potenciamos») y Poppins Regular («tu valor»), interletrado −50. Puede ir con o sin *lock-up* (pegado al logo o separado), según dónde se use.
- **¿Cuándo está permitido?** Brochures, folletos, banners institucionales, aplicaciones de gran formato, comunicaciones dirigidas a audiencias clave, presentaciones, interior de piezas editoriales, tarjetas personales, papelería comercial, merchandising, comunicaciones donde se desconozca la marca y **sitio web**.
- Las apps internas no están en esa lista: no agregues el tagline a una app salvo que te lo pidan.

## Voz y personalidad (MARCA, págs. 5–9)

- **Tono de voz** (pág. 9): siempre orientados al cliente; una conexión cómoda y de confianza. Lo importante no es hablar en primera persona del plural, sino que todos se sientan identificados. Seis rasgos:
  - **Claros**: información importante de forma fácil, directa, transparente y eficaz.
  - **Entusiastas**: con pasión y seguridad sobre lo que nos compete.
  - **Creíbles**: comunicación natural, respaldada por la experiencia en el agro.
  - **Inteligentes**: enfocados en la necesidad del cliente, empáticos.
  - **Sintéticos**: decir mucho en pocas palabras, sin cansar.
  - **Simples**: mensajes originales y fáciles de recordar.
- **Personalidad** (pág. 8): pensante, inteligente, activo y comprometido.
- **Valores** (pág. 7): pensamos en grande, creamos oportunidades, somos un equipo.
- **Misión** (pág. 6): ofrecer las mejores oportunidades de negocios a través de soluciones innovadoras. **Propósito**: desde nuestro lugar potenciamos el mundo del agro.

En una interfaz eso se traduce en textos cortos y directos, que dicen qué pasó y qué hacer: «No hay tipo de cambio cargado. Cargalo en Configuración», no «Ups, algo salió mal».

## Recursos gráficos (RECURSOS, págs. 34–44)

- **Fondos** (pág. 35): una textura con un **degradado basado en los colores de la paleta** se usa para todos los fondos de la plataforma y de las comunicaciones. **[fyo-ui]** Es `marca/fondo-marca.webp` sobre `--fondo-marca`, en la clase `.login`.
- **Tramas** (pág. 34): el «paréntesis fyo» solo en comunicaciones externas; el «paréntesis sonrisa» solo en comunicaciones internas; siempre con la escala correcta.
- **Iconografía** (pág. 36): simple, completa y fácil de adaptar a distintos tonos y mensajes.
- **Paréntesis con personas o texturas** (págs. 37–38): el isologo como ventana de un montaje con el usuario o con contenido del agro.
- **Fotografía** (págs. 39–41): situaciones verosímiles; escenas espontáneas de empleados por sobre las poses armadas; gente trabajando, en lo posible con un compañero; en el campo, personas mirando o señalando algo, usando tablet o celular, y maquinaria y campos.
- **Gráficos** (pág. 44): los datos y estadísticas se presentan de manera consistente, con los colores institucionales y cuidando sus combinaciones. **Todos los gráficos llevan una marca de agua con el logo de fyo** (también lo repite *Redes sociales*, pág. 52).

## Comunicación (COMUNICACIÓN, págs. 47–54)

- **Avatar** (pág. 51): 40 × 40 px; fondo Pantone 3135C con el logo blanco, o fondo blanco con el logo en 3135C.
- **Redes sociales** (pág. 52): imágenes que sumen, sin abusar; emojis que ayuden a contextualizar.
- Presentaciones, mailings, firma, newsletters, web, papelería y merchandising (págs. 47–62) muestran piezas, sin reglas nuevas para apps.

## Fuera de alcance

Las submarcas del ecosistema (CANJES, INSUMOS, capital, acopio, digital, advisory, foods, credits; págs. 28–32) tienen logotipos propios: este plugin no los cubre.
