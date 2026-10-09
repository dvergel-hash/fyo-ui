# Patrones de interfaz en Next.js (App Router) con `fyo-ui`

Patrones probados en las apps de fyo. Cada uno dice qué clases y variables de `fyo-ui` usa. Los componentes React viven en cada app (el paquete es solo CSS); copiá el patrón y adaptá los nombres.

## 0. Layout raíz

```tsx
// app/layout.tsx
import type { ReactNode } from "react";
import "fyo-ui/css/fyo.css";
import favicon from "fyo-ui/marca/favicon.ico";

export const metadata = { title: "Presupuesto Infraestructura · fyo", icons: { icon: favicon.src } };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- Un solo import del CSS; Poppins 400/500/600 viene con él (no uses `next/font/google`).
- Los estilos propios de la app van en un `app.css` importado **después**, y solo con `var(--…)`.

## 1. Encabezado con menú y sección activa

**Helper puro** (sin React, testeable):

```ts
// app/navegacion.ts
/** «/» solo en la raíz exacta; el resto, en la ruta exacta o en sus subrutas con límite de segmento. */
export function esEnlaceActivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

```ts
// tests/navegacion.test.ts (vitest)
import { describe, expect, it } from "vitest";
import { esEnlaceActivo } from "@/app/navegacion";

describe("esEnlaceActivo", () => {
  it("la raíz solo en la raíz exacta", () => {
    expect(esEnlaceActivo("/", "/")).toBe(true);
    expect(esEnlaceActivo("/compras", "/")).toBe(false);
  });
  it("la ruta exacta y sus subrutas", () => {
    expect(esEnlaceActivo("/compras", "/compras")).toBe(true);
    expect(esEnlaceActivo("/compras/12/inventario", "/compras")).toBe(true);
    expect(esEnlaceActivo("/compras/", "/compras")).toBe(true);
  });
  it("respeta el límite de segmento", () => {
    expect(esEnlaceActivo("/compras-viejas", "/compras")).toBe(false);
  });
});
```

**Menú** (cliente, porque lee la ruta):

```tsx
// app/NavPrincipal.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { esEnlaceActivo } from "@/app/navegacion";

const ENLACES = [
  { href: "/", texto: "Tablero" },
  { href: "/compras", texto: "Compras" },
  { href: "/configuracion", texto: "Configuración" },
];

export default function NavPrincipal() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Principal">
      {ENLACES.map((e) => (
        <Link key={e.href} href={e.href} aria-current={esEnlaceActivo(pathname, e.href) ? "page" : undefined}>
          {e.texto}
        </Link>
      ))}
    </nav>
  );
}
```

**Layout de la app** (servidor):

```tsx
// app/(app)/layout.tsx
import type { ReactNode } from "react";
import NavPrincipal from "@/app/NavPrincipal";
import logoColor from "fyo-ui/marca/logo-fyo-color.png";
import logoBlanco from "fyo-ui/marca/logo-fyo-blanco.png";

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const sesion = await requerirSesion(); // la de tu app
  return (
    <>
      <header className="encabezado">
        <a className="marca" href="/">
          {/* Color en claro, blanco en oscuro: el manual no permite recolorear el logo. */}
          <picture>
            <source srcSet={logoBlanco.src} media="(prefers-color-scheme: dark)" />
            <img src={logoColor.src} alt="fyo" width={77} height={36} />
          </picture>
          <span className="marca-producto">Presupuesto Infraestructura</span>
        </a>
        <NavPrincipal />
        <div className="sesion">
          <span>{sesion.usuario}</span>
          <form action={cerrarSesion}><button type="submit" className="secundario">Cerrar sesión</button></form>
        </div>
      </header>
      <main className="contenido">{children}</main>
    </>
  );
}
```

Usa: `.encabezado`, `.marca`, `.marca-producto`, `.sesion`, `.contenido`, `aria-current="page"` (subrayado con `--subrayado-activo`), `button.secundario`. El encabezado pasa la navegación a su propia fila en ≤ 960 px. En ≤ 600 px se oculta `.marca-producto`, el nombre del usuario (el `span` de `.sesion`) queda solo para lectores de pantalla, «Cerrar sesión» sigue en la fila del logo y la navegación es una sola fila que se desplaza de costado (unos 117 px de encabezado en total). Por eso dejá el nombre del usuario en un `span` hijo directo de `.sesion` y el botón aparte. Si la sección activa puede quedar fuera de la vista, llevala con `scrollIntoView({ inline: "nearest" })`. El logo mide `--logo-alto-encabezado` (36 px de alto, 77 px de ancho: mínimo digital de 70 px, manual pág. 14) y `.encabezado`/`.marca` le dejan `--proteccion-logo` (18 px ≈ la «o») libre alrededor (área de protección, pág. 15): no metas nada pegado al logo ni le achiques el padding al encabezado.

## 2. Login sobre el fondo de marca

```tsx
// app/login/page.tsx
import logoBlanco from "fyo-ui/marca/logo-fyo-blanco-login.png";
import FormularioLogin from "./FormularioLogin";

export default function LoginPage() {
  return (
    <main className="login">
      <img className="login-logo" src={logoBlanco.src} alt="fyo" width={119} height={56} />
      <section className="login-tarjeta" aria-labelledby="titulo-login">
        <h1 id="titulo-login">Presupuesto Infraestructura</h1>
        <p>Ingresá con tu usuario y contraseña.</p>
        <FormularioLogin />
      </section>
    </main>
  );
}
```

```tsx
// app/login/FormularioLogin.tsx
"use client";
import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

export default function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});
  return (
    <form action={accion} className="formulario-login">
      <label>Usuario <input name="usuario" autoComplete="username" required autoFocus /></label>
      <label>Contraseña <input name="contrasena" type="password" autoComplete="current-password" required /></label>
      {estado.error && <p role="alert" className="error">{estado.error}</p>}
      <button type="submit" disabled={pendiente}>{pendiente ? "Ingresando…" : "Ingresar"}</button>
    </form>
  );
}
```

Usa: `.login` (degradé `fondo-marca.webp` sobre `--fondo-marca`), `.login-logo` (logo **blanco**: el fondo es oscuro), `.login-tarjeta`, `.formulario-login`, `.error`. El logo del login mide 119 × 56 px; respetá el mínimo digital de 70 px del manual (pág. 14) y su área de protección (pág. 15).

## 3. Tarjeta de resumen con número protagonista

```tsx
<section aria-label="Resumen del mes" className="tarjetas">
  {tarjetas.map((t) => {
    const excedido = t.clave === "disponible" && t.valor < 0;
    return (
      <article key={t.clave} className={excedido ? "tarjeta excedido" : "tarjeta"}>
        <h2>{t.titulo}</h2>
        <div className="monto">{formatoARS(t.valor)}</div>
        <div className="monto-usd">{formatoUSD(t.valor / tc)}</div>
        {excedido && <p className="nota">Presupuesto excedido</p>}
      </article>
    );
  })}
</section>
```

- El número es el protagonista (`.monto`: `--texto-lg`, `--peso-fuerte`, cifras tabulares); el título es un rótulo chico (`.tarjeta h2` = `.etiqueta`); lo secundario va en `--tenue` (`.monto-usd`).
- Máximo 4 tarjetas por fila y una sola idea por tarjeta. El estado se dice con texto (`.nota`), no solo con el rojo de `.excedido`.
- Formateá en es-AR: `$ 1.234.567,89`, `US$ 1.234,56`, `—` si no hay dato.

## 4. Estados: cargando, vacío y error

Toda pantalla con datos tiene los cuatro: **cargando, vacío, error y no encontrado**.

```tsx
// app/(app)/compras/loading.tsx — se muestra mientras el servidor arma la página
export default function Cargando() {
  return (
    <p className="leyenda" role="status" aria-live="polite">Cargando compras…</p>
  );
}
```

```tsx
// app/(app)/compras/error.tsx — tiene que ser cliente
"use client";
export default function ErrorCompras({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="panel" role="alert">
      <h2>No pudimos cargar las compras</h2>
      <p className="leyenda">Probá de nuevo en unos segundos. Si sigue pasando, avisá a Infraestructura{error.digest ? ` (código ${error.digest})` : ""}.</p>
      <button type="button" onClick={() => reset()}>Reintentar</button>
    </section>
  );
}
```

```tsx
// app/not-found.tsx (y app/(app)/compras/[id]/not-found.tsx con notFound() en la página)
import Link from "next/link";
export default function NoEncontrado() {
  return (
    <main className="contenido">
      <h1>No encontramos esa página</h1>
      <p>Puede que la dirección esté mal o que ya no exista. <Link href="/">Volver al tablero</Link></p>
    </main>
  );
}
```

**Vacío**, dentro de la página (no es un archivo especial):

```tsx
{compras.length === 0 ? (
  <section className="panel">
    <h2>Todavía no hay compras en marzo</h2>
    <p className="leyenda">Generalas a partir del presupuesto del mes.</p>
    <button type="button">Generar compras</button>
  </section>
) : (
  <TablaCompras compras={compras} />
)}
```

- Cargando: texto concreto («Cargando compras…»), `role="status"`; en botones, `disabled` y «Guardando…» mientras la acción está pendiente.
- Vacío: qué falta y la acción que lo resuelve. Nunca una tabla vacía con solo la cabecera.
- Error: qué falló, qué puede hacer la persona y un botón para reintentar; nunca el stack ni el mensaje técnico crudo.
- Avisos que no bloquean (falta un dato): `.aviso` con `role="note"` y un enlace a donde se arregla.

## 5. Tablas densas con prioridad de columnas

```tsx
<div className="tabla-contenedor" tabIndex={0} role="region" aria-label="Compras de marzo">
  <table>
    <thead>
      <tr>
        <th scope="col">Concepto</th>
        <th scope="col" className="num">Monto</th>
        <th scope="col">Estado</th>
        <th scope="col" className="prioridad-baja">Proveedor</th>
        <th scope="col" className="prioridad-baja">Vencimiento</th>
      </tr>
    </thead>
    <tbody>
      {filas.map((f) => (
        <tr key={f.id}>
          <th scope="row">{f.concepto}</th>
          <td className="num">{formatoARS(f.monto)}</td>
          <td><span className={`insignia estado-${f.estado}`}>{f.estado}</span></td>
          <td className="prioridad-baja">{f.proveedor}</td>
          <td className="prioridad-baja">{formatoFecha(f.vencimiento)}</td>
        </tr>
      ))}
    </tbody>
    <tfoot>
      <tr><th scope="row">Total</th><td className="num">{formatoARS(total)}</td><td colSpan={3} /></tr>
    </tfoot>
  </table>
</div>
```

```css
/* app.css (de la app, no del paquete) */
@media (max-width: 600px) { .prioridad-baja { display: none; } }
/* Los estados de dominio son de la app: el paquete solo trae los niveles ROJO/AMARILLO/VERDE. */
.insignia.estado-PROGRAMADA { background: var(--gris-fondo); color: var(--gris-texto); }
.insignia.estado-EJECUTADA { background: var(--verde-fondo); color: var(--verde-texto); border-color: var(--verde-borde); }
```

- Ordená las columnas por prioridad: la que identifica la fila primero (`th scope="row"`), después el número que se compara, después el estado; lo accesorio al final y oculto en pantallas chicas.
- Números a la derecha con `.num` (cifras tabulares), importes con el mismo formato en toda la tabla, totales en `tfoot`.
- La tabla se desplaza dentro de `.tabla-contenedor` y la página no. Probala con el contenido real más largo (conceptos de 40 caracteres, importes de 12 dígitos) a 1280 px.
- Acciones por fila: un solo botón secundario o un menú; no cinco íconos.

## 6. Modal con `<dialog>`

```tsx
"use client";
import { useEffect, useRef } from "react";

export default function Confirmacion({ titulo, alConfirmar, alCerrar }: { titulo: string; alConfirmar: () => void; alCerrar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);
  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby="titulo-dialogo"
      onClose={alCerrar}
      onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}
    >
      <h2 id="titulo-dialogo">{titulo}</h2>
      <p>Esta acción no se puede deshacer.</p>
      <div className="acciones-form">
        <button type="button" onClick={alConfirmar}>Cancelar la compra</button>
        <button type="button" className="secundario" onClick={alCerrar} autoFocus>Volver</button>
      </div>
    </dialog>
  );
}
```

```css
/* app.css: un modal genérico con los tokens del paquete */
.dialogo { width: min(480px, 92vw); padding: var(--espacio-5); border: 1px solid var(--borde); border-radius: var(--radio-md); background: var(--superficie); color: var(--texto); }
.dialogo::backdrop { background: var(--velo); }
.dialogo .acciones-form { display: flex; gap: var(--espacio-2); justify-content: flex-end; margin-top: var(--espacio-4); }
```

- `showModal()` da foco atrapado, Esc para cerrar y `::backdrop`; no armes un modal con `div`s.
- El botón principal dice la acción concreta («Cancelar la compra»), no «Aceptar».
- Para ver un PDF usá el componente del paquete: `dialog.visor-pdf` con `.visor-pdf-barra` y `iframe.visor-pdf-marco`.
