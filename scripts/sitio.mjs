/**
 * Dirección pública del sitio. Netlify define `URL` automáticamente al publicar;
 * con un dominio propio, define NUXT_PUBLIC_SITE_URL (p. ej. https://pdfkingdom.es).
 */
export const DEFAULT_SITE_URL = 'https://pdf-kingdom.netlify.app'

export function resolveSiteUrl(env = process.env) {
  return (env.NUXT_PUBLIC_SITE_URL || env.URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
}
