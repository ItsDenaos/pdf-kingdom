import { getTool, type ToolId } from '../data/tools'

/**
 * Título, descripción y datos estructurados (schema.org) de cada herramienta.
 * Los datos estructurados ayudan a los buscadores a mostrarla como aplicación web gratuita.
 */
export function useToolSeo(id: ToolId) {
  const { t } = useI18n()
  const { siteUrl } = useRuntimeConfig().public
  const tool = getTool(id)
  const title = t(`tools.${tool.key}.seoTitle`)
  const description = t(`tools.${tool.key}.seoDescription`)

  useSeoMeta({
    title,
    description,
    ogTitle: `${title} · PDF Kingdom`,
    ogDescription: description,
  })

  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: `${t(`tools.${tool.key}.name`)} · PDF Kingdom`,
          description,
          url: `${siteUrl}${tool.path}`,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: t('seo.operatingSystem'),
          inLanguage: 'es',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        }),
      },
    ],
  })

  return tool
}
