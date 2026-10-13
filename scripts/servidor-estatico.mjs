/**
 * Servidor mínimo para probar el sitio ya generado (.output/public) igual que lo serviría
 * Netlify: URLs sin ".html" y las mismas cabeceras de seguridad (archivo _headers).
 * Uso: npm run preview  →  http://localhost:4173
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../.output/public', import.meta.url)))
const port = Number(process.env.PORT ?? 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.pfb': 'application/octet-stream',
  '.bcmap': 'application/octet-stream',
  '.icc': 'application/vnd.iccprofile',
}

/** Lee el archivo _headers de Netlify: bloques de "ruta" seguidos de "  Cabecera: valor". */
function loadHeaderRules() {
  const file = join(root, '_headers')
  if (!existsSync(file)) return []
  const rules = []
  let current = null
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} }
      rules.push(current)
    } else if (current) {
      const colon = line.indexOf(':')
      current.headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
    }
  }
  return rules
}

function headersFor(urlPath, rules) {
  const result = {}
  for (const { pattern, headers } of rules) {
    const matches = pattern.endsWith('*') ? urlPath.startsWith(pattern.slice(0, -1)) : urlPath === pattern
    if (matches) Object.assign(result, headers)
  }
  return result
}

/** Igual que Netlify: /unir-pdf sirve unir-pdf.html; / sirve index.html. */
function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '')
  const candidate = join(root, clean)
  if (!candidate.startsWith(root)) return null // evita salir de la carpeta
  for (const option of [candidate, `${candidate}.html`, join(candidate, 'index.html')]) {
    if (existsSync(option) && statSync(option).isFile()) return option
  }
  return null
}

if (!existsSync(root)) {
  console.error('No existe .output/public. Ejecuta antes: npm run generate')
  process.exit(1)
}

const rules = loadHeaderRules()

createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0]
  const file = resolveFile(urlPath)
  const target = file ?? join(root, '404.html')
  res.writeHead(file ? 200 : 404, {
    ...headersFor(urlPath, rules),
    'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  createReadStream(target).pipe(res)
}).listen(port, () => {
  console.log(`PDF Kingdom disponible en http://localhost:${port}${rules.length ? ' (con cabeceras de _headers)' : ''}`)
})
