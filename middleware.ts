import { NextResponse, type NextRequest } from "next/server"

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

// Routes d'authentification (rediriger vers dashboard si déjà connecté)
const AUTH_ROUTES = ["/auth/login", "/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Vérifier si c'est une route publique
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Vérifier la session utilisateur (cookie unifié)
  const userSession = request.cookies.get("user_session")
  const isAuthenticated = !!userSession

  // Si authentifié et sur une page d'auth, rediriger vers dashboard
  if (isAuthenticated && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Si non authentifié et route protégée, rediriger vers login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

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
     * - files with extensions (e.g. .png, .jpg, .css, .js)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.[^/]+$).*)",
  ],
}
