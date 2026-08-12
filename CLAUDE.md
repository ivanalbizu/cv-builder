# CV Builder — App React para crear CVs

> Documento maestro del proyecto (para Claude Code y para el equipo).
> Nace de la experiencia de un CV de referencia hecho a mano (proyecto personal,
> fuera de este repositorio): CV en HTML de una página, imprimible a PDF, con
> sistema de temas. Aquí se generaliza a una **app**.

---

## 1. Visión

App web (React) para **crear y editar CVs** con vista previa en vivo sobre un
**lienzo A4** y **exportación a PDF** de alta fidelidad. El usuario edita desde
un **panel de control** (contenidos, imagen, layouts preestablecidos, tipografía,
colores) y ve el resultado maquetado al instante. Opcionalmente, un **agente**
(vía WebMCP experimental) puede ayudar a generar/mejorar contenidos.

Principio rector heredado del proyecto de referencia:
**separar CONTENIDO ↔ TEMA ↔ PLANTILLA.** El contenido no cambia aunque cambien
colores, tipografías o layout. Esto es lo que hizo posible re-temar el CV de
referencia sin tocar el texto, y es el core de esta app.

---

## 2. Lecciones portadas del proyecto de referencia (¡leer antes de codificar!)

Todo esto ya está probado en el CV de referencia y hay que reaprovecharlo.

### Impresión / PDF
- La **impresión nativa del navegador** (`window.print()` + CSS `@page`) da la
  máxima fidelidad para A4 (texto seleccionable, ligero, respeta colores). Es el
  camino principal de exportación. El motor es el mismo que usa Chrome headless.
- CSS imprescindible:
  ```css
  @page { size: A4; margin: 0; }
  @media print {
    .app-chrome, .control-panel, .toolbar { display: none !important; }
    .cv-page { box-shadow: none; margin: 0; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* conserva fondos */
  }
  ```
- Al guardar como PDF desde Chrome: **A4, márgenes "Ninguno", activar "Gráficos de fondo".**
  Se sigue recomendando marcar la casilla: es gratis y cubre navegadores o
  versiones donde el CSS no baste.
- Medido en la fase 3 leyendo las órdenes de relleno del PDF (Chrome 151, 5/5
  ejecuciones): con `print-color-adjust: exact` los fondos **sí** se pintan
  aunque se genere el PDF sin "gráficos de fondo". O sea, la regla CSS está
  haciendo su trabajo. Aun así el generador de PDF pasa `printBackground: true`,
  por no depender de ese detalle.
- Para comprobar qué colores acaban de verdad en el papel, mirar las órdenes
  `r g b rg` del flujo de contenido del PDF (`pdfFillColors` en
  `e2e/pdf.spec.ts`). **Un screenshot no vale**: pinta los fondos siempre, así
  que da verde aunque el PDF salga en blanco.
- **PDF automatizado / servidor** (fidelidad idéntica, sin diálogo):
  ```bash
  google-chrome --headless --no-pdf-header-footer \
    --print-to-pdf=out.pdf --virtual-time-budget=3000 "file://.../page.html"
  ```
  o con Playwright: `await page.pdf({ format:'A4', printBackground:true, margin:0 })`.

### Gotchas de paginación (nos costaron tiempo)
- Poner `break-inside: avoid-page` en una **sección entera** alta empuja toda la
  sección a la página siguiente y deja la anterior medio vacía. Aplicar el
  avoid **a los items** (`.puesto-item`, `.formacion-item`), no a la sección.
- Un **grid** (p. ej. Formación+Idiomas) es "atómico" al paginar: si no cabe
  entero, salta de página aunque haya hueco. Tenerlo en cuenta al maquetar.
- `min-height: 297mm` + `padding-bottom` en la hoja puede provocar una **página
  en blanco final** por unos milímetros. Al imprimir: `min-height:0; padding-bottom:0`.
- Verificar **nº de páginas por render** como parte del pipeline (test).

### Temas (colores + tipografía) con variables CSS
- Todo el diseño usa **custom properties** en `:root` (`--primary`, `--accent`,
  `--surface`, `--ink`, `--serif`, `--sans`, …). Cambiar de tema = redefinir esas
  variables. Temas por `:root[data-theme="..."]`. Acento de marca por override
  inline (gana sobre el tema).
- **Contraste automático de cabecera:** si el color principal es claro (brillo
  `(r*299+g*587+b*114)/1000 > 150`), el texto de cabecera pasa a oscuro. Reutilizar.

### Imágenes (lección importante)
- **Incrustar en base64** para portabilidad (el archivo/artefacto es autónomo).
- Cuidado con fotos "sin fondo" guardadas como **JPEG**: la transparencia se
  **aplana** (cuadriculado incrustado) y ningún CSS lo tapa. Preferir **PNG RGBA**
  con transparencia real; entonces `object-fit: contain; background:#fff` rellena
  limpio. `cover` para llenar el círculo; `contain` para retrato contenido.
- Ofrecer al usuario: recorte (crop), forma (círculo/rect), `object-position`,
  color de fondo, y toggle `cover/contain`.

### Tipografía y licencias
- **Solo incrustar fuentes libres** (OFL/Apache: Google Fonts, o del sistema tipo
  Noto/Liberation). **Nunca privativas** (p. ej. Graphik de Meliá): ni licencia ni
  archivo. Usar **alternativa libre parecida** (Graphik → Inter/Manrope).
- Cambiar de fuente **puede alterar la paginación**. Mitigación: aplicar la fuente
  distintiva solo a **títulos** (líneas sueltas, no refluyen) y cuerpo en sans
  compacta. Validar 1 página por tema.
- Para preview se puede cargar Google Fonts por `<link>`; para el PDF final la
  fuente debe estar **cargada/incrustada** (si es descargable/offline).

### Numeración de página
- Chrome **sí** soporta cajas de margen de `@page` con `counter(page)` /
  `counter(pages)` (medido en el 151). Eso quita el motivo más habitual para
  meter `pagedjs`. Lo que **no** soporta es `string-set` + `content: string()`,
  o sea cabeceras que repitan contenido del documento en cada hoja.
- Se numera **solo si el CV pasa de una página**: un «Página 1 de 1» queda peor
  que nada, y CSS no sabe condicionar por el total. Lo decide la app —
  `usePageMetrics` ya cuenta páginas— publicando `<html data-pages>`.
- Las variables del pie van en `:root`, no en `.cv-page`: el contexto de `@page`
  no es un elemento y solo hereda del raíz. Es la única excepción a §11.
- Cuidado: activar el pie exige margen inferior de página, y eso encoge la caja
  útil. Toda plantilla con altura fija para print debe leer `--cv-alto-pagina`
  en vez de poner `297mm` a pelo, o aparecerá una hoja de más.

### Layout
- Trabajar en **mm** para A4 (210×297). Patrones ya validados: una columna,
  **barra lateral** (grid `34% 1fr`), timeline con puntos alineados al eje, badges
  de fechas, "titulares en negrita" (detalle se cuenta en entrevista), rejillas
  con ratios ajustables (`2fr 1fr`).

---

## 3. Objetivos del MVP y no-objetivos

**MVP (v1):**
- Lienzo A4 con vista previa en vivo desde un JSON de datos (`CVData`).
- 1–2 plantillas (una columna + barra lateral).
- Panel: editar datos por secciones (añadir/editar/reordenar/eliminar), subir
  imagen, elegir plantilla, tema de color (pickers) y tipografía básica.
- Exportar a PDF vía impresión del navegador.
- Persistencia local (localStorage) + exportar/importar JSON.

**No-objetivos v1:** cuentas/login, backend, colaboración en tiempo real,
galería enorme de plantillas, i18n completa. (Se dejan para fases posteriores.)

---

## 4. Stack tecnológico (recomendado)

- **Build:** Vite + React + **TypeScript**.
- **Estado:** **Zustand** (store simple; sus acciones serán la "capa de comandos"
  reutilizable por UI y por agente). Alternativa: Redux Toolkit.
- **Estilos:** CSS con **custom properties + CSS Modules** para la plantilla del
  CV (mantiene el CSS de impresión limpio y reutiliza lo del proyecto de
  referencia). La UI de la app (paneles) puede usar lo que se prefiera; evitar
  CSS-in-JS pesado en la zona imprimible.
- **PDF:** primario `react-to-print` (envuelve `window.print()`). Fase 2:
  **Playwright** `page.pdf()` en servidor para fidelidad pixel-perfect y tests.
- **Paginación multipágina (fase 2):** [`pagedjs`](https://pagedjs.org) para
  previsualizar HTML paginado en A4 (page breaks reales en pantalla y print).
- **Imagen:** `FileReader` → dataURL; recorte opcional con `react-easy-crop`.
- **Drag & drop** (reordenar secciones/items): `@dnd-kit`.
- **Test:** Vitest + React Testing Library; **Playwright** para e2e + snapshot de
  PDF/visual (y de paso es el renderer de PDF de servidor).

> **DECISIÓN TOMADA (Iván):** el enfoque es **HTML/CSS + impresión del navegador**
> (`react-to-print` / `window.print()`), reaprovechando todo el CSS del proyecto de
> referencia. La vista previa del lienzo **es** la salida imprimible (misma fuente).
> `@react-pdf/renderer` queda **descartado** (perdería la flexibilidad de CSS y
> obligaría a rehacer las plantillas con sus primitivas). Playwright `page.pdf()`
> se mantiene solo como opción de servidor para PDF pixel-perfect y tests (fase 2).

---

## 5. Arquitectura

### 5.1 Separación de capas
```
CVData (contenido)  ──►  Template (layout/plantilla)  ──►  render en lienzo A4
        ▲                         ▲
        │                         │
     Panel de control        Theme (colores + fuentes + densidad)
```

### 5.2 Modelo de datos (borrador TS)
```ts
type DataURL = string;

interface CVData {
  basics: {
    name: string; title: string; location?: string;
    phone?: string; email?: string; links?: { label: string; url: string }[];
    photo?: DataURL; summary?: string;
  };
  sections: Section[];              // ordenadas; el orden es del usuario
}

type Section =
  | { id: string; type: 'experience'; title: string; items: ExperienceItem[] }
  | { id: string; type: 'education';  title: string; items: EducationItem[] }
  | { id: string; type: 'skills';     title: string; items: string[] }
  | { id: string; type: 'languages';  title: string; items: Language[] }
  | { id: string; type: 'custom';     title: string; body: string };

interface ExperienceItem {
  org: string; role: string; location?: string;
  start: string; end?: string; current?: boolean;
  bullets: string[];              // en la plantilla "titulares", solo el lead
  tags?: string[];                // p. ej. software por empresa
  rating?: number;                // estrellas/llaves opcionales
}
interface EducationItem { title: string; org?: string; year?: string; }
interface Language { name: string; level: string; note?: string; }

interface Theme {
  colors: { primary:string; primarySoft:string; accent:string; accentSoft:string;
            surface:string; ink:string; inkSoft:string; rule:string };
  fonts:  { display:string; serif:string; sans:string };  // stacks o familias cargadas
  density: 'comfy' | 'compact';
}

interface TemplateMeta { id:string; name:string; layout:'single'|'sidebar'; }
```

### 5.3 Capa de comandos (headless core) — **clave**
Toda mutación pasa por acciones puras del store. La UI las llama; el **agente
(WebMCP)** las llamará **exactamente igual**. Esto desacopla lógica de UI y hace
la app "pilotable".
```ts
interface CVCommands {
  setBasics(patch: Partial<CVData['basics']>): void;
  setPhoto(data: DataURL | null): void;
  addSection(type: Section['type'], title?: string): string; // devuelve id
  removeSection(id: string): void;
  reorderSection(id: string, toIndex: number): void;
  addItem(sectionId: string, item: unknown): string;
  updateItem(sectionId: string, itemId: string, patch: unknown): void;
  reorderItem(sectionId: string, itemId: string, toIndex: number): void;
  setTemplate(id: string): void;
  setTheme(themeId: string): void;
  setAccent(hex: string): void; setPrimary(hex: string): void;
  setFont(slot: 'display'|'serif'|'sans', family: string): void;
  exportPDF(): void; toJSON(): CVData; loadJSON(d: CVData): void;
}
```
Exponer también en `window.cvBuilder` (fallback sin MCP) para automatizar/testear.

### 5.4 Lienzo A4 y paginación
- La hoja es un contenedor en **mm** (`210mm × 297mm`) con `box-shadow` en
  pantalla (oculto en print). Zoom con `transform: scale()` para ajustar a la
  ventana (no afecta al print).
- v1: 1–2 páginas; detectar **overflow** midiendo alto de contenido vs alto útil
  y avisar ("se sale de 1 página"). v2: `pagedjs` para flujo real multipágina.
- Reutilizar `break-inside: avoid` por item; nunca por sección entera.

### 5.5 Exportación a PDF
- v1: `react-to-print` sobre el nodo `.cv-canvas`; el CSS `@media print` oculta
  toda la UI y deja solo la hoja. Instruir al usuario (márgenes "Ninguno" +
  gráficos de fondo) o preconfigurar vía diálogo.
- v2: endpoint/servicio con **Playwright** que carga la app en modo "solo
  contenido" (`?export=1&data=...` o POST del JSON) y hace `page.pdf()`.

---

## 6. Panel de control (funcionalidades)
- **Contenido:** formularios por sección; añadir/editar/eliminar/reordenar
  (dnd); campos ricos mínimos (negrita en titulares).
- **Imagen:** subir, recortar (crop circular/rect), `object-fit` cover/contain,
  color de fondo, posición. Avisar si conviene PNG con transparencia real.
- **Plantillas:** selector visual de layouts preestablecidos.
- **Tema:** pickers de color (principal/acento) con **sincronización** al tema
  activo y **contraste automático** de cabecera; densidad comfy/compact.
- **Tipografía:** elegir familia para display/cuerpo. (Ver §7.)
- **Exportar/Guardar:** PDF, exportar/importar JSON, autosave localStorage.

---

## 7. Temas y tipografía
- Set curado de **temas** (Clásico, Boutique, Corporativo, Lujo — ya diseñados en
  el proyecto de referencia) como punto de partida.
- **Tipografía:** para MVP, stacks del sistema (fiables, cero red). Utilidad
  futura (anotada, no MVP): campo para **probar Google Fonts** en vivo (inyecta
  `<link>`) + enlace a Google Fonts; al elegir, **incrustar** la fuente para la
  versión final. Solo OFL/Apache. Aplicar display solo a títulos para no romper
  paginación.

---

## 8. WebMCP / agente (experimental)
Objetivo: que un **agente en el navegador** ayude a generar/mejorar el CV
(redactar resúmenes, reescribir bullets en tono profesional, sugerir orden,
aplicar tema de marca) llamando a la **capa de comandos** (§5.3).

- **Diseño que lo habilita hoy mismo:** exponer `CVCommands` como una API estable
  (`window.cvBuilder`) + un **catálogo de "tools"** (nombre, descripción, JSON
  schema de args) que mapean 1:1 a esos comandos. Con eso, cualquier puente
  agente↔web puede pilotar la app.
- **WebMCP es experimental y la especificación se mueve** (propuestas tipo
  WebMCP / "MCP-B" que exponen tools desde una pestaña del navegador). **Verificar
  el estado actual del estándar antes de implementar**; no fijar una API concreta
  en piedra. Mantener el core agnóstico: comandos + tool-catalog, y un adaptador
  fino hacia el mecanismo WebMCP vigente.
- Herramientas de agente sugeridas (mapean a comandos): `getCV`, `setBasics`,
  `addExperience`, `rewriteBullets(sectionId,itemId,tone)`, `suggestSummary`,
  `setTheme`, `setAccentFromBrand(hex)`, `exportPDF`.

---

## 9. Roadmap por fases

**Fase 0 — Scaffold**
- `npm create vite@latest cv-builder -- --template react-ts`; ESLint/Prettier;
  estructura de carpetas; CI mínima (typecheck + test).

**Fase 1 — Core + 1 plantilla + print**
- Store Zustand con `CVData` + capa de comandos. Render de 1 plantilla A4 desde
  el JSON. Edición de `basics` y una sección (experiencia). Export por
  `react-to-print`. Semilla de ejemplo con un CV ficticio.

**Fase 2 — Editor completo + tema + imagen + 2ª plantilla**
- Todas las secciones (CRUD + reordenar con dnd). Subida+recorte de imagen.
  Sistema de temas (colores/fuentes/densidad) con pickers, sync y auto-contraste.
  2ª plantilla (barra lateral). Persistencia local + import/export JSON.

**Fase 3 — Paginación fiel + PDF servidor**
- `pagedjs` para multipágina en pantalla. Detección de overflow y avisos.
  Servicio Playwright `page.pdf()` para PDF pixel-perfect. Tests de "nº de páginas".

**Fase 4 — Agente / WebMCP (experimental)**
- Tool-catalog sobre la capa de comandos; `window.cvBuilder`. Adaptador WebMCP
  según spec vigente. Acciones asistidas (reescritura de bullets, resumen, tema).

**Fase 5 — Pulido**
- Galería de plantillas, más temas, accesibilidad/contraste, incrustado de
  fuentes libres, compartir/exportar, i18n.

---

## 10. Estructura de carpetas (propuesta)
```
src/
  app/            # layout de la app, paneles, routing
  cv/             # zona imprimible
    templates/    # SingleColumn.tsx, Sidebar.tsx (usan CSS Modules + tokens)
    canvas/       # A4Canvas, zoom, page-break helpers
    print.css     # @page + @media print (global)
  core/           # store (zustand), commands, types, themes, tokens
  panel/          # formularios del panel de control
  agent/          # tool-catalog + adaptador WebMCP (fase 4)
  lib/            # utils (color/contraste, imagen/dataURL, id)
```

## 11. Convenciones
- TypeScript estricto. Componentes de la zona `cv/` **puros** respecto a
  `CVData`+`Theme` (sin estado propio) → fáciles de testear y de renderizar en
  servidor.
- Nada de estilos que dependan de JS en la zona imprimible (que el print sea CSS).
- Colores/tamaños vía **tokens/variables CSS**; nunca hardcodear en componentes.
- Toda mutación del CV pasa por la **capa de comandos** (ni la UI ni el agente
  tocan el store directamente).
- **Ramas:** el trabajo nuevo va en `feature/*` (p. ej.
  `feature/fase-3-pdf-servidor`). Nunca se commitea directamente en `main`.
- **Push y merge los hace Iván.** Claude deja el trabajo commiteado en su rama;
  no ejecuta `git push`.

## 12. Checklist de impresión (definition of done por plantilla)
- [ ] Cabe en el nº de páginas esperado (test automatizado).
- [ ] Fondos/colores salen en el PDF (`print-color-adjust: exact`).
- [ ] UI oculta en `@media print`.
- [ ] Sin página en blanco final.
- [ ] `break-inside: avoid` por item, no por sección.
- [ ] Texto seleccionable (no rasterizado).

## 13. Comandos

**Usar `pnpm`, no `npm`.** En esta máquina `npm install` se queda colgado sin
avanzar; con pnpm el mismo install tarda segundos.

```
# instalar:    pnpm install
# desarrollo:  pnpm dev            (http://localhost:5173)
# build:       pnpm build          (tsc --noEmit + vite build)
# typecheck:   pnpm typecheck
# lint:        pnpm lint
# test:        pnpm test           (vitest, unitarios)
# e2e/pdf:     pnpm e2e            (playwright: PDF real, nº de páginas)
# e2e con UI:  pnpm e2e:ui
# PDF por CLI: pnpm pdf --out cv.pdf [--data x.cv.json] [--template …] [--theme …]
```

`pnpm e2e` hace `build` + `preview` por su cuenta y usa el **Chrome del
sistema**. Sin Chrome instalado:
```bash
pnpm exec playwright install chromium
PW_CHANNEL=chromium pnpm e2e
```

PDF por línea de comandos, sin abrir el diálogo (el mismo motor que usa el
botón «Imprimir» de la app):
```bash
pnpm dev &
google-chrome --headless --no-pdf-header-footer \
  --virtual-time-budget=6000 --print-to-pdf=cv.pdf http://localhost:5173
pdfinfo cv.pdf   # comprobar «Pages: 1» y «Page size: A4»
```

---

## 14. Estado de la implementación (fases 0–2 completas)

**Hecho y verificado** (70 tests en verde; PDF generado con Chrome headless para
**cada plantilla**: 1 página A4, fondos conservados, sin página en blanco final,
texto seleccionable):

- **Fase 0 completa:** Vite + React + TS estricto, ESLint, Prettier, CI en
  `.github/workflows/ci.yml`.
- **Fase 1 completa:** store Zustand + capa de comandos, plantilla
  `SingleColumn` portada del CV de referencia, export por impresión, semilla.
- **Fase 2 completa:** las dos plantillas (`single-column` y `sidebar`), los 4
  temas con pickers y auto-contraste, densidad, CRUD de todas las secciones,
  reordenado por arrastre (`@dnd-kit`), subida y **recorte** de foto
  (`react-easy-crop`), persistencia en localStorage e import/export JSON.

**Parámetros de URL** (portados del CV de referencia, útiles para generar PDF
por tema sin tocar la UI y como base de la fase 3):
```
?template=sidebar&theme=lujo&primary=%23004b8d&accent=%23c8102e&density=comfy
```
Solo tocan TEMA y PLANTILLA; el contenido nunca se lee de la URL.

- **Fase 3 (casi completa):** PDF de servidor con Playwright (`pnpm pdf`), suite
  e2e que ejecuta el checklist de §12 sobre el PDF real — nº de páginas y tamaño
  A4 para las **8 combinaciones** de plantilla × tema, texto no rasterizado,
  cromo oculto y colores del tema efectivamente pintados. Detección de
  desbordamiento ya estaba desde la fase 1.

**Pendiente:** `pagedjs` (ver abajo), fase 4 (WebMCP) y fase 5 (pulido).

### `pagedjs`: recomendación de NO integrarlo

§4 lo proponía para previsualizar el flujo multipágina. Tras montar el resto de
la fase 3, la recomendación es **descartarlo**, y conviene decidirlo antes de
gastar esfuerzo:

1. **Choca con el principio rector.** §4 fija que «la vista previa del lienzo
   **es** la salida imprimible (misma fuente)». pagedjs reescribe el DOM con su
   propio algoritmo de paginación, que no es el de Chrome: pasaríamos a tener
   **dos** motores de maquetación y una vista previa que puede diferir del PDF.
   Es justo el fallo que el diseño actual evita.
2. **Pelea con React.** pagedjs toma el árbol y lo reconstruye en cajas de
   página; con un panel que re-renderiza en cada tecla habría que aislarlo en un
   modo aparte con debounce, y ya no sería «en vivo».
3. **El beneficio real es pequeño.** Para un CV de 1–2 páginas, la vista actual
   ya cuenta páginas midiendo el DOM y dibuja las guías de corte, y el e2e
   verifica el recuento contra el PDF de verdad.

Si en algún momento hace falta multipágina fiel (CVs académicos largos), la
alternativa barata es renderizar el PDF con Playwright y mostrarlo incrustado,
en vez de re-paginar en el navegador.

### Cómo añadir una plantilla

1. `src/cv/templates/MiPlantilla.tsx` + `.module.css`, componente **puro**
   respecto a (`data`, `theme`).
2. Registrarla en `src/cv/templates/index.tsx`.
3. Añadirla al array `TEMPLATES` de `src/cv/print.test.ts`: el checklist de
   impresión de §12 se aplica a todas, no solo a la primera.
4. Reutilizar `templates/shared.ts` para fechas e iconos de contacto, para que
   las plantillas no diverjan en cómo presentan lo mismo.

### Decisiones que se desvían de lo escrito arriba

1. **`react-to-print` descartado; se usa `window.print()` directo.** §5.5 lo daba
   por «un envoltorio de `window.print()`», pero en su v3 renderiza la hoja en un
   `<iframe>` y copia las hojas de estilo — justo lo que puede perder fidelidad
   con CSS Modules. El camino del proyecto de referencia (`window.print()` +
   `@media print` que apaga el cromo) está probado y da 1 página A4 exacta.
   `commands.exportPDF()` encapsula la llamada, así que cambiarlo es de una línea.
2. **`skills` usa `SkillItem[] {id, name}`, no `string[]`.** El borrador de §5.2
   los definía como cadenas sueltas, pero entonces `updateItem`/`reorderItem`
   necesitarían índices en vez de ids y la capa de comandos dejaría de ser
   uniforme entre tipos de sección.
3. **Plugin propio para `?inline`** (`vite.config.ts`): Vite emite las imágenes
   como fichero aparte y devuelve una URL; el modelo exige `DataURL` base64, o el
   JSON exportado y el localStorage se romperían al cambiar el hash del asset.
4. **`@media print` global, no por módulo.** `print.css` se importa el último en
   `main.tsx` para que sus `!important` ganen. Los ganchos que apaga
   (`.app-chrome`, `.control-panel`, `.toolbar`, `.cv-page`, `.cv-zoom`) son
   **clases globales a propósito**: no pueden pasar por el hash de CSS Modules.

---

## 15. Datos personales: este repo es PÚBLICO

**La semilla de `src/core/seed.ts` es ficticia y tiene que seguir siéndolo.**
Persona, empresas y centros de estudios son inventados; el email usa el dominio
reservado `example.com` (RFC 2606), el teléfono es un placeholder y la foto es
un avatar genérico. Nada de esto corresponde a nadie real.

Para trabajar con un CV de verdad: «Importar JSON» en el panel, y guardar ese
archivo **fuera del repositorio**. La foto viaja incrustada en base64 dentro del
JSON, así que ese archivo es tan sensible como el CV en papel.

Hay dos avisos que saltan **antes de cualquier `git push`**, cubriendo las dos
vías por las que se puede empujar:

| Vía | Aviso |
|---|---|
| Push lanzado por Claude Code | `.claude/hooks/avisar-datos-personales.sh` (hook `PreToolUse`, pide confirmación) |
| Push a mano (terminal, VS Code, GUI) | `.githooks/pre-push` (pregunta por `/dev/tty`; cancela por defecto) |

Ambos consultan al **mismo detector**, `scripts/datos-personales.sh`, que es la
fuente de verdad: imprime un hallazgo por línea y sale 0 siempre; salida vacía
significa que el repo se puede publicar. **No dupliques su lógica** — tenerla en
dos sitios ya escondió un fallo una vez.

Las reglas son **genéricas a propósito**: comprueban la FORMA (dominio
reservado, teléfono placeholder, foto conocida), no datos concretos. Una versión
anterior buscaba un teléfono y un email literales, con lo que el propio detector
publicaba lo que pretendía proteger. Salta si aparece:

- un email cuyo dominio no sea `example.com` / `.org` / `.net`,
- un `tel:` que no sea el placeholder,
- cualquier imagen en `src/assets/` que no sea `avatar-ejemplo.png`.

El hook de git necesita, tras clonar:
```bash
git config core.hooksPath .githooks
```
Para saltárselo puntualmente: `git push --no-verify`.

---

### Origen
Este proyecto reutiliza el conocimiento de un CV de una página hecho a mano
(proyecto personal, fuera de este repositorio), donde ya funcionan: CV A4 de una
página imprimible, sistema de temas por variables CSS, acento de marca con
auto-contraste, foto transparente incrustada, y el enfoque
contenido↔tema↔plantilla.
