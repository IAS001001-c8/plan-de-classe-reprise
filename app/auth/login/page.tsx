"use client"

import type React from "react"
import { validateAdminCode, setAdminSession } from "@/lib/admin-auth"
import { authenticateUser, setUserSession } from "@/lib/custom-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [establishmentCode, setEstablishmentCode] = useState("")
  const [role, setRole] = useState<string>("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminCode, setAdminCode] = useState("")
  const router = useRouter()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!adminCode) {
      setError("Code administrateur requis")
      setIsLoading(false)
      return
    }

    try {
      // Validate admin code from hardcoded list
      const adminCreds = validateAdminCode(adminCode)

      if (!adminCreds) {
        throw new Error("Code administrateur invalide")
      }

      // Store admin session in localStorage (independent of Supabase)
      setAdminSession(adminCreds)

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Code administrateur invalide")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!establishmentCode || !role || !username || !password) {
      setError("Une des données est incorrecte")
      setIsLoading(false)
      return
    }

    try {
      const { user, error: authError } = await authenticateUser(establishmentCode, role, username, password)

      if (authError || !user) {
        throw new Error(authError || "Une des données est incorrecte")
      }

      // Store user session
      setUserSession(user)

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Une des données est incorrecte")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
            <CardDescription>
              {isAdminMode ? "Connexion administrateur" : "Connectez-vous à votre compte"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdminMode ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminCode">Code administrateur</Label>
                  <Input
                    id="adminCode"
                    type="password"
                    placeholder="Entrez le code administrateur"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    cpdc001 (Délégué) | cpdc002 (Professeur) | cpdc003 (Vie Scolaire)
                  </p>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsAdminMode(false)
                    setError(null)
                    setAdminCode("")
                  }}
                >
                  Retour à la connexion normale
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="establishmentCode">Code établissement</Label>
                  <Input
                    id="establishmentCode"
                    type="text"
                    placeholder="Ex: stm001 ou vh001"
                    value={establishmentCode}
                    onChange={(e) => setEstablishmentCode(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Sélectionnez votre rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vie-scolaire">Vie Scolaire</SelectItem>
                      <SelectItem value="professeur">Professeur</SelectItem>
                      <SelectItem value="delegue">Délégué</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Identifiant</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Entrez votre identifiant"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Entrez votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => {
                    setIsAdminMode(true)
                    setError(null)
                  }}
                >
                  Connexion Admin
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
