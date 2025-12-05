/**
 * Authentification Admin
 * Ces codes permettent l'accès même si Supabase est hors ligne
 */

export interface AdminCredentials {
  code: string
  establishment: string
  role: "vie-scolaire" | "professeur" | "delegue"
  username: string
  displayName: string
}

// Constantes centralisées
const ADMIN_SESSION_KEY = "admin_session"
const COOKIE_MAX_AGE_DAYS = 7

// Codes admin hardcodés dans le code source
const ADMIN_CODES: Record<string, AdminCredentials> = {
  cpdc001: {
    code: "cpdc001",
    establishment: "ST-MARIE 14000",
    role: "delegue",
    username: "admin.delegue.stm",
    displayName: "Admin Délégué ST-MARIE",
  },
  cpdc002: {
    code: "cpdc002",
    establishment: "ST-MARIE 14000",
    role: "professeur",
    username: "admin.prof.stm",
    displayName: "Admin Professeur ST-MARIE",
  },
  cpdc003: {
    code: "cpdc003",
    establishment: "ST-MARIE 14000",
    role: "vie-scolaire",
    username: "admin.vs.stm",
    displayName: "Admin Vie Scolaire ST-MARIE",
  },
}

/**
 * Valide un code admin et retourne les credentials associés
 */
export function validateAdminCode(code: string): AdminCredentials | null {
  const normalizedCode = code.toLowerCase().trim()
  return ADMIN_CODES[normalizedCode] || null
}

/**
 * Vérifie si une session admin est active
 */
export function isAdminSession(): boolean {
  if (typeof window === "undefined") return false
  const session = getCookieValue(ADMIN_SESSION_KEY)
  return !!session
}

/**
 * Récupère la session admin courante
 */
export function getAdminSession(): AdminCredentials | null {
  if (typeof window === "undefined") return null
  
  const session = getCookieValue(ADMIN_SESSION_KEY)
  if (!session) return null
  
  try {
    return JSON.parse(decodeURIComponent(session))
  } catch {
    return null
  }
}

/**
 * Enregistre une session admin dans un cookie
 */
export function setAdminSession(credentials: AdminCredentials): void {
  if (typeof document === "undefined") return
  
  const value = encodeURIComponent(JSON.stringify(credentials))
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
  
  document.cookie = `${ADMIN_SESSION_KEY}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

/**
 * Supprime la session admin
 */
export function clearAdminSession(): void {
  if (typeof document === "undefined") return
  
  document.cookie = `${ADMIN_SESSION_KEY}=; path=/; max-age=0`
}

/**
 * Helper pour lire un cookie par son nom
 */
function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return matches ? matches[1] : null
}
