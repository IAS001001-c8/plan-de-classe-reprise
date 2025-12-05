import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes accessibles sans authentification
const PUBLIC_ROUTES = [
  "/auth/login",
  "/login",
  "/share",
  "/partage",
  "/plan-partage",
  "/shared-plan",
  "/api/public",
]

// Routes de connexion (rediriger vers dashboard si déjà connecté)
const AUTH_ROUTES = ["/auth/login", "/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorer les fichiers statiques et API internes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/_next") ||
    pathname.includes(".") // fichiers avec extension (images, etc.)
  ) {
    return NextResponse.next()
  }

  // Vérifier l'authentification via cookies
  // Clés harmonisées avec custom-auth.ts et use-auth.ts
  const userSession = request.cookies.get("user_session")
  const adminSession = request.cookies.get("admin_session")
  const isAuthenticated = !!(userSession?.value || adminSession?.value)

  // Vérifier si c'est une route publique
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Si authentifié et sur page de login, rediriger vers dashboard
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Route publique - laisser passer
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Route protégée sans auth - rediriger vers login
  if (!isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url)
    // Sauvegarder l'URL de destination pour redirection après login
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Utilisateur authentifié sur route protégée - laisser passer
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
