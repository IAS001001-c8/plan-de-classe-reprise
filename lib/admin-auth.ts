/**
 * @deprecated Ce fichier est obsolète.
 * Les admins sont maintenant gérés via Supabase comme les autres utilisateurs.
 * 
 * Ce fichier reste présent uniquement pour la compatibilité avec les anciens imports.
 * Il sera supprimé dans une future version.
 * 
 * Migration effectuée le 05/12/2024 :
 * - Les codes cpdc001/002/003 ont été remplacés par des profils Supabase
 * - Nouveaux identifiants :
 *   - admin.delegue.stm / cpdc001 (délégué)
 *   - admin.prof.stm / cpdc002 (professeur)
 *   - admin.vs.stm / cpdc003 (vie-scolaire)
 * - Code établissement : stm001
 */

export interface AdminCredentials {
  code: string
  establishment: string
  role: "vie-scolaire" | "professeur" | "delegue"
  username: string
  displayName: string
}

/**
 * @deprecated Toujours retourne null - les admins passent par custom-auth.ts
 */
export function validateAdminCode(_code: string): AdminCredentials | null {
  return null
}

/**
 * @deprecated Toujours retourne false - plus de session admin séparée
 */
export function isAdminSession(): boolean {
  return false
}

/**
 * @deprecated Toujours retourne null - plus de session admin séparée
 */
export function getAdminSession(): AdminCredentials | null {
  return null
}

/**
 * @deprecated Ne fait rien - plus de session admin séparée
 */
export function setAdminSession(_credentials: AdminCredentials): void {
  // Obsolète - ne fait rien
}

/**
 * @deprecated Nettoie l'ancien cookie admin_session pour migration
 */
export function clearAdminSession(): void {
  if (typeof document === "undefined") return
  // Nettoyer l'ancien cookie pour la migration
  document.cookie = "admin_session=; path=/; max-age=0"
}
