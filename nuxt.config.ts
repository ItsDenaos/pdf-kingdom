import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { resolveSiteUrl } from './scripts/sitio.mjs'

// Recursos de pdf.js (fuentes estándar, mapas de caracteres y decodificadores WASM).
// Se sirven desde nuestro propio dominio para no depender de ningún CDN externo.
const pdfjsDir = (sub: string) =>
  fileURLToPath(new URL(`./node_modules/pdfjs-dist/${sub}`, import.meta.url))

// Dirección pública del sitio (enlaces canónicos, sitemap e imagen social). Ver scripts/sitio.mjs.
const siteUrl = resolveSiteUrl()

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',

  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode'],

  // Fuentes incluidas en el propio sitio (sin Google Fonts ni peticiones a terceros).
  css: [
    '@fontsource-variable/fraunces',
    '@fontsource-variable/plus-jakarta-sans',
    '~/assets/css/main.css',
  ],

  devtools: { enabled: false },

  runtimeConfig: {
    public: {
      siteUrl,
      // Correo de contacto que aparece en la página de privacidad (opcional).
      contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL || '',
    },
  },

  // Sitio 100 % estático: `nuxt generate` crea un HTML por página.
  ssr: true,

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      titleTemplate: '%s · PDF Kingdom',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#4c1d95', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#140a22', media: '(prefers-color-scheme: dark)' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },

  i18n: {
    // De momento solo español. Para añadir otro idioma basta con crear
    // i18n/locales/<código>.json y añadirlo aquí.
    defaultLocale: 'es',
    strategy: 'no_prefix',
    locales: [{ code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' }],
    // Sin detección automática: evita que el módulo cree una cookie.
    detectBrowserLanguage: false,
  },

  colorMode: {
    // La preferencia de tema se guarda en localStorage, nunca en una cookie.
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
    storage: 'localStorage',
    storageKey: 'pdfkingdom-tema',
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/privacidad'],
      // Genera "unir-pdf.html" en vez de "unir-pdf/index.html": URL sin barra final.
      autoSubfolderIndex: false,
    },
    publicAssets: [
      { dir: pdfjsDir('standard_fonts'), baseURL: '/pdfjs/standard_fonts', maxAge: 60 * 60 * 24 * 30 },
      { dir: pdfjsDir('cmaps'), baseURL: '/pdfjs/cmaps', maxAge: 60 * 60 * 24 * 30 },
      { dir: pdfjsDir('wasm'), baseURL: '/pdfjs/wasm', maxAge: 60 * 60 * 24 * 30 },
      { dir: pdfjsDir('iccs'), baseURL: '/pdfjs/iccs', maxAge: 60 * 60 * 24 * 30 },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
    worker: { format: 'es' },
    optimizeDeps: {
      include: ['@cantoo/pdf-lib', 'fflate', 'comlink', 'sortablejs'],
    },
  },

  typescript: {
    strict: true,
  },

  hooks: {
    // Los workers solo se descargan al procesar un archivo: no hace falta precargarlos
    // al abrir la página (son los archivos más pesados).
    'build:manifest'(manifest) {
      for (const entry of Object.values(manifest)) {
        if (/worker/i.test(entry.file)) {
          entry.preload = false
          entry.prefetch = false
        }
      }
    },
  },
})
