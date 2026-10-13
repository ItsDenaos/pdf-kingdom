/**
 * Se ejecuta después de `nuxt generate` (ver "generate" en package.json) y añade a .output/public:
 *  - sitemap.xml: lista de páginas para los buscadores.
 *  - robots.txt: permite indexar e indica dónde está el sitemap.
 *  - _headers: cabeceras de seguridad para Netlify, incluida la política de seguridad de
 *    contenido (CSP). La CSP solo permite los scripts del propio sitio y, de los scripts
 *    incrustados en el HTML, únicamente los que existen al generar (por su huella SHA-256).
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveSiteUrl } from './sitio.mjs'

/** Páginas que no deben aparecer en el sitemap. */
const EXCLUDED_PAGES = new Set(['200.html', '404.html'])

/** Busca las páginas HTML generadas y devuelve sus rutas ("/", "/unir-pdf"…). */
export function listPages(publicDir) {
  const routes = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_')) walk(path)
      } else if (entry.name.endsWith('.html')) {
        const rel = relative(publicDir, path).split(sep).join('/')
        if (EXCLUDED_PAGES.has(rel)) continue
        const route = '/' + rel.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '')
        routes.push(route.replace(/\/$/, '') || '/')
      }
    }
  }
  walk(publicDir)
  // Inicio primero; el resto, en orden alfabético.
  return routes.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)))
}

export function buildSitemap(siteUrl, routes, lastmod) {
  const urls = routes
    .map((route) => {
      const loc = route === '/' ? `${siteUrl}/` : `${siteUrl}${route}`
      const priority = route === '/' ? '1.0' : route === '/privacidad' ? '0.3' : '0.8'
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function buildRobots(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
}

/** Tipos de <script> que el navegador ejecuta (los de datos, como JSON, no cuentan para la CSP). */
const EXECUTABLE_TYPES = new Set(['', 'module', 'importmap', 'text/javascript', 'application/javascript'])

/** Huellas SHA-256 de los scripts incrustados ejecutables de un HTML. */
export function inlineScriptHashes(html) {
  const hashes = new Set()
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1] ?? ''
    if (/\bsrc\s*=/.test(attrs)) continue
    const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1] ?? '').toLowerCase()
    if (!EXECUTABLE_TYPES.has(type)) continue
    const content = match[2] ?? ''
    hashes.add(`'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`)
  }
  return hashes
}

export function buildContentSecurityPolicy(scriptHashes) {
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' permite ejecutar WebAssembly (qpdf y decodificadores de pdf.js).
    `script-src 'self' 'wasm-unsafe-eval' ${[...scriptHashes].sort().join(' ')}`.trim(),
    // Los atributos style="" (barras de progreso, giros de miniaturas) necesitan 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline'",
    // blob: son las miniaturas y archivos creados en el propio navegador.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Clave para la privacidad: la página solo puede conectarse a su propio dominio.
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

export function buildHeaders(csp) {
  return `# Generado por scripts/despues-de-generar.mjs: no editar a mano.
/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()

/_nuxt/*
  Cache-Control: public, max-age=31536000, immutable

/pdfjs/*
  Cache-Control: public, max-age=2592000
`
}

function main() {
  const publicDir = fileURLToPath(new URL('../.output/public', import.meta.url))
  if (!existsSync(publicDir)) {
    console.error(
      `No existe ${publicDir}. Revisa que nuxt.config.ts tenga nitro.preset = 'static' (genera el sitio en .output/public).`,
    )
    process.exit(1)
  }
  const siteUrl = resolveSiteUrl()
  const routes = listPages(publicDir)
  const today = new Date().toISOString().slice(0, 10)

  const hashes = new Set()
  const htmlFiles = [...routes.map((r) => (r === '/' ? 'index.html' : `${r.slice(1)}.html`)), ...EXCLUDED_PAGES]
  for (const file of htmlFiles) {
    try {
      for (const hash of inlineScriptHashes(readFileSync(join(publicDir, file), 'utf8'))) hashes.add(hash)
    } catch {
      // página que no existe (p. ej. 200.html en algunas configuraciones)
    }
  }

  writeFileSync(join(publicDir, 'sitemap.xml'), buildSitemap(siteUrl, routes, today))
  writeFileSync(join(publicDir, 'robots.txt'), buildRobots(siteUrl))
  writeFileSync(join(publicDir, '_headers'), buildHeaders(buildContentSecurityPolicy(hashes)))

  console.log(`✓ sitemap.xml (${routes.length} páginas) · robots.txt · _headers (CSP con ${hashes.size} scripts incrustados) para ${siteUrl}`)
}

// Solo se ejecuta al llamarlo directamente (no cuando lo importan las pruebas).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
