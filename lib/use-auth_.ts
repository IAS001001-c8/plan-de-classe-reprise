"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getAdminSession } from "@/lib/admin-auth"

// Clé de session unifiée (doit correspondre à custom-auth.ts)
const SESSION_KEY = "user_session"

export interface AuthUser {
  id: string
  establishmentId: string
  role: "vie-scolaire" | "professeur" | "delegue"
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  authType: "custom" | "admin" | "supabase"
}

interface UseAuthOptions {
  requireRole?: "vie-scolaire" | "professeur" | "delegue"
  redirectTo?: string
}

/**
 * Hook d'authentification principal
 * Vérifie dans l'ordre : session custom, session admin, session Supabase
 */
export function useAuth(options?: UseAuthOptions) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    if (typeof window === "undefined") return

    // 1. Vérifier la session custom (cookie puis localStorage)
    const customUser = await checkCustomSession()
    if (customUser) {
      if (options?.requireRole && customUser.role !== options.requireRole) {
        router.push(options.redirectTo || "/dashboard")
        setIsLoading(false)
        return
      }
      setUser(customUser)
      setIsLoading(false)
      return
    }

    // 2. Vérifier la session admin
    const adminUser = await checkAdminSession()
    if (adminUser) {
      if (options?.requireRole && adminUser.role !== options.requireRole) {
        router.push(options.redirectTo || "/dashboard")
        setIsLoading(false)
        return
      }
      setUser(adminUser)
      setIsLoading(false)
      return
    }

    // 3. Vérifier la session Supabase native
    const supabaseUser = await checkSupabaseSession()
    if (supabaseUser) {
      if (options?.requireRole && supabaseUser.role !== options.requireRole) {
        router.push(options.redirectTo || "/dashboard")
        setIsLoading(false)
        return
      }
      setUser(supabaseUser)
      setIsLoading(false)
      return
    }

    // 4. Aucune authentification trouvée
    setIsLoading(false)
    router.push(options?.redirectTo || "/auth/login")
  }, [router, options?.requireRole, options?.redirectTo])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return { user, isLoading, refresh: checkAuth }
}

/**
 * Vérifie la session custom (cookie + localStorage)
 */
async function checkCustomSession(): Promise<AuthUser | null> {
  try {
    // Essayer le cookie d'abord
    const cookieValue = getCookieValue(SESSION_KEY)
    let sessionData = null

    if (cookieValue) {
      try {
        sessionData = JSON.parse(decodeURIComponent(cookieValue))
      } catch {
        // Cookie invalide, ignorer
      }
    }

    // Fallback sur localStorage
    if (!sessionData) {
      const localValue = localStorage.getItem(SESSION_KEY)
      if (localValue) {
        try {
          sessionData = JSON.parse(localValue)
        } catch {
          // LocalStorage invalide, ignorer
        }
      }
    }

    if (!sessionData) return null

    // Valider les champs requis
    if (!sessionData.id || !sessionData.establishment_id || !sessionData.role) {
      clearInvalidSession()
      return null
    }

    return {
      id: sessionData.id,
      establishmentId: sessionData.establishment_id,
      role: sessionData.role,
      username: sessionData.username,
      firstName: sessionData.first_name,
      lastName: sessionData.last_name,
      email: sessionData.email,
      authType: "custom",
    }
  } catch (error) {
    console.error("Error checking custom session:", error)
    clearInvalidSession()
    return null
  }
}

/**
 * Vérifie la session admin (codes hardcodés)
 */
async function checkAdminSession(): Promise<AuthUser | null> {
  try {
    const adminSession = getAdminSession()
    if (!adminSession) return null

    // Récupérer l'ID de l'établissement depuis Supabase
    const supabase = createClient()
    const { data: establishment } = await supabase
      .from("establishments")
      .select("id")
      .eq("code", adminSession.code)
      .single()

    return {
      id: `admin-${adminSession.code}`,
      establishmentId: establishment?.id || "mock-establishment-id",
      role: "vie-scolaire", // Les admins ont toujours le rôle vie-scolaire
      username: adminSession.code,
      authType: "admin",
    }
  } catch (error) {
    console.error("Error checking admin session:", error)
    return null
  }
}

/**
 * Vérifie la session Supabase native
 */
async function checkSupabaseSession(): Promise<AuthUser | null> {
  try {
    const supabase = createClient()
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()

    if (error || !supabaseUser) return null

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .single()

    if (!profile) return null

    return {
      id: supabaseUser.id,
      establishmentId: profile.establishment_id,
      role: profile.role,
      username: profile.username,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      authType: "supabase",
    }
  } catch (error) {
    console.error("Error checking Supabase session:", error)
    return null
  }
}

/**
 * Helper pour lire un cookie
 */
function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return matches ? matches[1] : null
}

/**
 * Nettoie une session invalide
 */
function clearInvalidSession(): void {
  localStorage.removeItem(SESSION_KEY)
  document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
  // Nettoyer aussi l'ancienne clé (migration)
  localStorage.removeItem("custom_auth_user")
  document.cookie = "custom_auth_user=; path=/; max-age=0"
}

/**
 * Hook pour la déconnexion
 */
export function useLogout() {
  const router = useRouter()

  const logout = useCallback(async () => {
    // Supprimer session custom
    localStorage.removeItem(SESSION_KEY)
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
    
    // Supprimer session admin
    document.cookie = "admin_session=; path=/; max-age=0"
    
    // Nettoyer anciennes clés (migration)
    localStorage.removeItem("custom_auth_user")
    document.cookie = "custom_auth_user=; path=/; max-age=0"

    // Déconnecter Supabase si connecté
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // Ignorer les erreurs de déconnexion Supabase
    }

    router.push("/auth/login")
  }, [router])

  return logout
}
