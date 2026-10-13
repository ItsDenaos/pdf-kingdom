# 👑 PDF Kingdom

Herramientas PDF gratuitas que funcionan **100 % en el navegador**: los archivos nunca salen del dispositivo del usuario. Sin registro y sin cookies de rastreo.

## Estado

| Herramienta | URL | Estado |
|---|---|---|
| Unir PDF | `/unir-pdf` | ✅ Etapa 1 |
| Dividir PDF | `/dividir-pdf` | ✅ Etapa 1 |
| Rotar PDF | `/rotar-pdf` | ✅ Etapa 2 |
| JPG a PDF | `/jpg-a-pdf` | ✅ Etapa 2 |
| PDF a JPG | `/pdf-a-jpg` | ✅ Etapa 2 |
| Desbloquear PDF | `/desbloquear-pdf` | ✅ Etapa 3 |
| Proteger PDF | `/proteger-pdf` | ✅ Etapa 3 |
| Comprimir PDF | `/comprimir-pdf` | ✅ Etapa 3 |

## Puesta en marcha

Requisitos: Node.js 22.12 o superior.

```bash
npm install
npx playwright install chromium   # solo la primera vez, para las pruebas en navegador
npm run dev                       # modo desarrollo → http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca el modo desarrollo (se recarga al guardar). |
| `npm run generate` | Genera el sitio estático en `.output/public` (lo que se publica), con `sitemap.xml`, `robots.txt` y `_headers`. |
| `npm run preview` | Sirve el sitio generado en http://localhost:4173, igual que Netlify (mismas URLs y cabeceras de seguridad). |
| `npm test` | Ejecuta todas las pruebas (unitarias + navegador). |
| `npm run test:unit` | Pruebas de la lógica de PDF (rápidas, sin navegador). |
| `npm run test:e2e` | Genera el sitio y lo prueba en Chrome de escritorio y móvil. |
| `npm run typecheck` | Revisa los tipos de TypeScript. |
| `npm run fixtures` | Vuelve a crear los archivos de prueba. |
| `npm run images` | Vuelve a crear la imagen para redes sociales y los iconos (`public/*.png`). |

## Archivos de prueba

Están en `tests/fixtures/` (se crean con `npm run fixtures`):

| Archivo | Para qué sirve |
|---|---|
| `tres-paginas.pdf`, `diez-paginas.pdf` | Documentos normales con el número de página bien visible. |
| `horizontal.pdf` | Páginas apaisadas (para comprobar el orden al unir). |
| `con-contrasena.pdf` | Pide contraseña para abrirse: **`reino123`** (propietario: `corona456`). AES-256. |
| `con-restricciones.pdf` | Se abre sin contraseña pero no deja imprimir ni modificar (propietario: `corona456`). |
| `danado.pdf` | Empieza como un PDF pero está roto. |
| `no-es-pdf.pdf` | Un archivo de texto con extensión `.pdf`. |
| `con-giro-previo.pdf` | Su segunda página ya viene girada 90° (Rotar debe respetarlo). |
| `foto-horizontal.jpg`, `foto-vertical.jpg` | Fotos con una flecha que apunta hacia arriba. |
| `foto-girada-exif.jpg` | Como las fotos del móvil: guardada en horizontal con orientación EXIF; bien mostrada es vertical y la flecha apunta hacia arriba. |
| `logo-transparente.png` | PNG con fondo transparente. |
| `imagen-danada.jpg`, `no-es-imagen.png` | Imagen rota y texto con extensión `.png`. |
| `sin-comprimir.pdf` | 20 páginas de texto sin comprimir: la compresión baja lo reduce mucho. |
| `con-fotos.pdf` | Una foto JPEG grande y otra imagen sin JPEG: para las compresiones recomendada y extrema. |

## Estructura

```
app/
  pages/        una página por URL (index, unir-pdf, dividir-pdf, rotar-pdf, jpg-a-pdf, pdf-a-jpg…)
  components/   layout/ (cabecera, pie, logo) · home/ (tarjetas) · tool/ (piezas de las herramientas) · ui/ (iconos, sello)
  composables/  lógica de la interfaz: lista de archivos, miniaturas, worker, progreso…
  workers/      trabajo pesado en segundo plano (no congela la página)
  lib/          operaciones puras y probadas (unir, dividir, rotar, imágenes, rangos, nombres, errores)
  data/         catálogo de herramientas
i18n/locales/   todos los textos (es.json)
public/         favicon, iconos, imagen social y manifiesto
scripts/        archivos de prueba, imágenes, pasos tras generar y servidor estático
tests/          unit/ (Vitest) · e2e/ (Playwright) · fixtures/ (PDF de prueba)
```

## Cómo funciona cada nivel de compresión

| Nivel | Qué hace | Texto seleccionable |
|---|---|---|
| Baja | qpdf reorganiza el archivo y recomprime su estructura sin tocar la calidad. | Sí |
| Recomendada | Además, las fotos de más de 1600 px se reducen y se guardan en JPEG (calidad 72 %). | Sí |
| Extrema | Cada página se convierte en una imagen JPEG a 110 ppp. | **No** (se avisa en pantalla) |

Si el resultado no es más pequeño que el original, se avisa en lugar de descargar un archivo más pesado.

## Privacidad

- Todo el procesamiento ocurre en el navegador (pdf-lib, pdf.js y qpdf en WebAssembly).
- Las fuentes y los recursos de pdf.js se sirven desde el propio sitio: no hay peticiones a terceros.
- Las pruebas en navegador fallan si la página intenta conectarse a cualquier otro sitio o si la CSP bloquea algo.
- La política de privacidad está en `/privacidad` (`app/pages/privacidad.vue`, textos en `privacyPage.*`).
- El tema (claro/oscuro) se guarda en `localStorage`, nunca en cookies.

## Publicar en Netlify

El archivo `netlify.toml` ya indica a Netlify cómo construir el sitio (`npm run generate`) y qué carpeta publicar (`.output/public`). En cada publicación se generan también:

- `sitemap.xml` y `robots.txt` para los buscadores.
- `_headers` con las cabeceras de seguridad. La más importante es la **CSP**: solo deja que la página se conecte a su propio dominio y solo ejecuta los scripts del sitio (los incrustados, por su huella SHA-256).

### Opción A: desde GitHub (recomendada, se publica sola con cada cambio)

1. Crea un repositorio vacío en GitHub y sube el proyecto:
   ```bash
   git remote add origin https://github.com/TU-USUARIO/pdf-kingdom.git
   git push -u origin main
   ```
2. En [app.netlify.com](https://app.netlify.com): **Add new site → Import an existing project → GitHub** y elige el repositorio. Los ajustes de build se leen de `netlify.toml`; pulsa **Deploy**.
3. Netlify te dará una dirección como `https://nombre.netlify.app`. El sitemap y los enlaces canónicos la usan automáticamente.

### Opción B: desde tu equipo, con la línea de comandos de Netlify

```bash
npx netlify-cli login
npx netlify-cli deploy --build --prod
```

### Ajustes opcionales (Site configuration → Environment variables)

| Variable | Para qué |
|---|---|
| `NUXT_PUBLIC_SITE_URL` | Si usas un dominio propio (p. ej. `https://pdfkingdom.es`), para que el sitemap y los enlaces canónicos lo usen. |
| `NUXT_PUBLIC_CONTACT_EMAIL` | Muestra un correo de contacto en la página de privacidad. |

Después de cambiar una variable, vuelve a publicar (**Deploys → Trigger deploy**).

### Comprobar la publicación

- Abre una herramienta, procesa un archivo y mira la pestaña **Red** de las herramientas de desarrollo: no debe salir ninguna petición con tus archivos.
- [securityheaders.com](https://securityheaders.com) muestra las cabeceras de seguridad del sitio.

## Añadir un idioma

1. Copia `i18n/locales/es.json` como `i18n/locales/<código>.json` y traduce los textos.
2. Añade el idioma en `i18n.locales` dentro de `nuxt.config.ts`.

## Licencias de las librerías

Todas permisivas: Nuxt/Vue (MIT), Tailwind CSS (MIT), @cantoo/pdf-lib (MIT), pdf.js (Apache-2.0), qpdf (Apache-2.0; envoltorio WASM con licencia ISC), fflate (MIT), Comlink (Apache-2.0), SortableJS (MIT), VueUse (MIT), fuentes Fraunces y Plus Jakarta Sans (OFL). Solo para pruebas (no se publican): jpeg-js (BSD-3) para crear imágenes de prueba y @axe-core/playwright (MPL-2.0) para revisar la accesibilidad.
