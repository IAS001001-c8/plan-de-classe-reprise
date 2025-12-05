import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function Home() {
  const cookieStore = await cookies()
  
  // Vérifier l'authentification via cookies
  // Clés harmonisées avec custom-auth.ts, use-auth.ts et middleware.ts
  const userSessionCookie = cookieStore.get("user_session")
  const adminSessionCookie = cookieStore.get("admin_session")
  
  // Si l'utilisateur est authentifié via custom auth ou admin
  if (userSessionCookie || adminSessionCookie) {
    redirect("/dashboard")
  }
  
  // Sinon, rediriger vers la page de connexion
  redirect("/auth/login")
}
