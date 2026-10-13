export type ToolId =
  | 'merge'
  | 'split'
  | 'rotate'
  | 'compress'
  | 'unlock'
  | 'protect'
  | 'jpgToPdf'
  | 'pdfToJpg'

export type ToolCategory = 'organize' | 'optimize' | 'security' | 'convert'

export interface ToolDef {
  id: ToolId
  /** Clave de sus textos en i18n: tools.<key>.* */
  key: ToolId
  path: string
  icon: string
  category: ToolCategory
  /** false = se muestra como "Próximamente" en el inicio. */
  available: boolean
}

export const TOOLS: ToolDef[] = [
  { id: 'merge', key: 'merge', path: '/unir-pdf', icon: 'merge', category: 'organize', available: true },
  { id: 'split', key: 'split', path: '/dividir-pdf', icon: 'split', category: 'organize', available: true },
  { id: 'rotate', key: 'rotate', path: '/rotar-pdf', icon: 'rotate', category: 'organize', available: true },
  { id: 'compress', key: 'compress', path: '/comprimir-pdf', icon: 'compress', category: 'optimize', available: true },
  { id: 'unlock', key: 'unlock', path: '/desbloquear-pdf', icon: 'unlock', category: 'security', available: true },
  { id: 'protect', key: 'protect', path: '/proteger-pdf', icon: 'protect', category: 'security', available: true },
  { id: 'jpgToPdf', key: 'jpgToPdf', path: '/jpg-a-pdf', icon: 'jpgToPdf', category: 'convert', available: true },
  { id: 'pdfToJpg', key: 'pdfToJpg', path: '/pdf-a-jpg', icon: 'pdfToJpg', category: 'convert', available: true },
]

export function getTool(id: ToolId): ToolDef {
  const tool = TOOLS.find((t) => t.id === id)
  if (!tool) throw new Error(`Herramienta desconocida: ${id}`)
  return tool
}

/** Colores del icono de cada categoría (clases completas para que Tailwind las detecte). */
export const CATEGORY_STYLES: Record<ToolCategory, string> = {
  organize: 'bg-royal-100 text-royal-700 dark:bg-royal-900/70 dark:text-royal-200',
  optimize: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  security: 'bg-gold-100 text-gold-800 dark:bg-gold-900/50 dark:text-gold-200',
  convert: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200',
}
