"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/use-auth"
import { RoomsManagement } from "@/components/rooms-management"
import { useRouter } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"

export default function RoomsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [rooms, setRooms] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadRooms() {
      if (!user) return

      console.log("[v0] RoomsPage - Loading rooms for user:", {
        userId: user.id,
        establishmentId: user.establishmentId,
        role: user.role,
      })

      const supabase = createClient()
      const { data: roomsData, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("establishment_id", user.establishmentId)
        .order("name")

      if (error) {
        console.error("[v0] RoomsPage - Error loading rooms:", error)
      } else {
        console.log("[v0] RoomsPage - Rooms loaded:", {
          count: roomsData?.length,
          rooms: roomsData?.map((r) => ({
            id: r.id,
            name: r.name,
            hasConfig: !!r.config,
            columnsCount: r.config?.columns?.length,
          })),
        })
      }

      setRooms(roomsData || [])
      setIsLoading(false)
    }

    if (user) {
      loadRooms()
    }
  }, [user])

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <ErrorBoundary componentName="Page des salles">
      <div className="min-h-screen">
        <RoomsManagement
          rooms={rooms}
          establishmentId={user.establishmentId}
          userRole={user.role}
          userId={user.id}
          onBack={() => router.push("/dashboard")}
        />
      </div>
    </ErrorBoundary>
  )
}
