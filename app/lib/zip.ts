import { zipSync, type Zippable } from 'fflate'
import { uniqueNames } from './filenames'

export interface NamedFile {
  name: string
  data: Uint8Array
}

/**
 * Crea un .zip en memoria. Los PDF ya van comprimidos por dentro, así que solo
 * los "guardamos" (nivel 0): es mucho más rápido y el tamaño apenas cambia.
 */
export function makeZip(files: NamedFile[]): Uint8Array {
  const names = uniqueNames(files.map((f) => f.name))
  const entries: Zippable = {}
  files.forEach((file, i) => {
    entries[names[i]!] = [file.data, { level: 0 }]
  })
  return zipSync(entries)
}
