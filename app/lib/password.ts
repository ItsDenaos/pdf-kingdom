export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong' | 'very-strong'

/**
 * Valoración orientativa de una contraseña: premia la longitud y la variedad de caracteres.
 * Solo sirve para aconsejar; nunca se envía ni se guarda en ningún sitio.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 'empty'
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (password.length < 8 || score <= 2) return 'weak'
  if (score === 3) return 'fair'
  if (score <= 5) return 'strong'
  return 'very-strong'
}
