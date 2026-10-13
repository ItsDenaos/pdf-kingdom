/** A partir de este tamaño avisamos de que el archivo puede ir lento. */
export const LARGE_FILE_BYTES = 100 * 1024 * 1024

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"

/**
 * Comprueba si los bytes empiezan como un PDF. La especificación permite algo de
 * "basura" antes de la cabecera, así que buscamos en los primeros 1024 bytes.
 */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 1024) - PDF_SIGNATURE.length
  for (let i = 0; i <= limit; i++) {
    let match = true
    for (let j = 0; j < PDF_SIGNATURE.length; j++) {
      if (bytes[i + j] !== PDF_SIGNATURE[j]) {
        match = false
        break
      }
    }
    if (match) return true
  }
  return false
}

/** Lee solo el principio del archivo para saber si es un PDF, sin cargarlo entero. */
export async function looksLikePdf(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  return hasPdfSignature(head)
}

export function isLargeFile(sizeInBytes: number): boolean {
  return sizeInBytes >= LARGE_FILE_BYTES
}
