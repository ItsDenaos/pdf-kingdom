import type { PdfErrorCode } from '../lib/errors'
import type { RangeIssue } from '../lib/ranges'
import type { QueueKind, QueueStatus } from './useFileQueue'

const ERROR_KEYS: Record<PdfErrorCode, string> = {
  'invalid-format': 'errors.invalidFormat',
  corrupt: 'errors.corrupt',
  encrypted: 'errors.encrypted',
  'wrong-password': 'errors.wrongPassword',
  empty: 'errors.empty',
  'invalid-options': 'errors.invalidOptions',
  'no-gain': 'errors.noGain',
  unknown: 'errors.unknown',
}

/** Traduce códigos de error y estados de archivo a mensajes en el idioma actual. */
export function useErrorMessage() {
  const { t } = useI18n()

  function errorMessage(code: PdfErrorCode, fileName?: string, kind: QueueKind = 'pdf'): string {
    const key = kind === 'image' && code === 'corrupt' ? 'errors.corruptImage' : ERROR_KEYS[code]
    const message = t(key)
    return fileName ? t('errors.inFile', { name: fileName, message }) : message
  }

  function statusMessage(status: QueueStatus, kind: QueueKind = 'pdf'): string | null {
    switch (status) {
      case 'corrupt':
        return t(kind === 'image' ? 'errors.corruptImage' : 'errors.corrupt')
      case 'password':
        return t('errors.passwordRequired')
      case 'restricted':
        return t('errors.restricted')
      default:
        return null
    }
  }

  /** Explica por qué un rango de páginas escrito por el usuario no es válido. */
  function rangeIssueMessage(issue: RangeIssue): string {
    switch (issue.code) {
      case 'empty':
        return t('ranges.empty')
      case 'syntax':
        return t('ranges.syntax', { token: issue.token })
      case 'zero':
        return t('ranges.zero', { token: issue.token })
      case 'reversed':
        return t('ranges.reversed', { token: issue.token })
      case 'out-of-bounds':
        return t('ranges.outOfBounds', { page: issue.page, total: issue.total })
    }
  }

  return { errorMessage, statusMessage, rangeIssueMessage }
}
