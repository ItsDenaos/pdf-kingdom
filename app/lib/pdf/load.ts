import { EncryptedPDFError, PDFDocument } from '@cantoo/pdf-lib'
import { PdfKingdomError } from '../errors'
import { hasPdfSignature } from '../files'

export const PRODUCER = 'PDF Kingdom'

/**
 * Abre un PDF con pdf-lib y traduce cualquier fallo a un código de error claro.
 * `fileIndex` sirve para decir al usuario qué archivo falló cuando hay varios.
 */
export async function loadPdf(
  bytes: Uint8Array,
  options: { fileIndex?: number; password?: string } = {},
): Promise<PDFDocument> {
  const { fileIndex, password } = options

  if (!hasPdfSignature(bytes)) {
    throw new PdfKingdomError('invalid-format', { fileIndex })
  }

  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(bytes, {
      updateMetadata: false,
      ...(password !== undefined ? { password } : {}),
    })
  } catch (error) {
    if (error instanceof EncryptedPDFError) {
      throw new PdfKingdomError('encrypted', { fileIndex, cause: error })
    }
    if (password !== undefined && /password/i.test(String((error as Error)?.message))) {
      throw new PdfKingdomError('wrong-password', { fileIndex, cause: error })
    }
    throw new PdfKingdomError('corrupt', { fileIndex, cause: error })
  }

  // pdf-lib es tolerante y a veces "abre" archivos rotos; si no se pueden leer
  // sus páginas, el archivo está dañado.
  let pageCount = 0
  try {
    pageCount = doc.getPageCount()
    doc.getPages()
  } catch (error) {
    throw new PdfKingdomError('corrupt', { fileIndex, cause: error })
  }
  if (pageCount === 0) {
    throw new PdfKingdomError('corrupt', { fileIndex })
  }
  return doc
}

/** Crea un documento vacío con nuestros metadatos. */
export async function createPdf(): Promise<PDFDocument> {
  const doc = await PDFDocument.create()
  doc.setProducer(PRODUCER)
  doc.setCreator(PRODUCER)
  return doc
}

export function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true })
}
