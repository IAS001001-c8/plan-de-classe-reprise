"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Search, Plus, Trash2, Copy, Grid3x3, ArrowLeft } from "lucide-react"
import { CreateTemplateDialog } from "@/components/create-template-dialog"
import { TemplateSelectionDialog } from "@/components/template-selection-dialog"
import { CreateSubRoomDialog } from "@/components/create-sub-room-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types"
import type { RoomTemplate } from "@/components/room-templates"

interface Room {
  id: string
  establishment_id: string
  name: string
  code: string
  board_position: "top" | "bottom" | "left" | "right"
  config: {
    columns: Array<{
      id: string
      tables: number
      seatsPerTable: number
    }>
  }
  created_by: string
  created_at: string
  updated_at: string
}

interface EspaceClasseManagementProps {
  user: User
  profile: Profile
  onBack: () => void
}

export function EspaceClasseManagement({ user, profile, onBack }: EspaceClasseManagementProps) {
  const supabase = createClient()
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [viewedRoom, setViewedRoom] = useState<Room | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  // Dialog states
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCreateSubRoom, setShowCreateSubRoom] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCreateCustom, setShowCreateCustom] = useState(false)

  // Form state for creating/editing rooms
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    boardPosition: "top" as "top" | "bottom" | "left" | "right",
    columns: [{ id: "col1", tables: 5, seatsPerTable: 2 }],
  })

  // Permissions
  const isVieScolaire = profile.role === "vie-scolaire"
  const isTeacher = profile.role === "professeur"
  const isDelegate = profile.role === "delegue" || profile.role === "eco-delegue"
  const canCreateRooms = isVieScolaire || isTeacher
  const canModifyRooms = isVieScolaire || isTeacher

  // Load rooms on mount and setup realtime subscription
  useEffect(() => {
    loadRooms()

    const channel = supabase
      .channel("rooms-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `establishment_id=eq.${profile.establishment_id}`,
        },
        () => {
          loadRooms()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.establishment_id])

  // Filter rooms when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRooms(rooms)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredRooms(
        rooms.filter((room) => room.name.toLowerCase().includes(query) || room.code.toLowerCase().includes(query)),
      )
    }
  }, [searchQuery, rooms])

  const loadRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("establishment_id", profile.establishment_id)
      .order("created_at", { ascending: false })

    if (data && !error) {
      setRooms(data)
    }
  }

  const calculateTotalSeats = (room: Room) => {
    return room.config.columns.reduce((sum, col) => sum + col.tables * col.seatsPerTable, 0)
  }

  const calculateTotalWidth = (columns: Array<{ seatsPerTable: number }>) => {
    return columns.reduce((sum, col) => sum + col.seatsPerTable, 0)
  }

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const selectAll = () => {
    if (selectedRoomIds.length === filteredRooms.length && filteredRooms.length > 0) {
      setSelectedRoomIds([])
    } else {
      setSelectedRoomIds(filteredRooms.map((r) => r.id))
    }
  }

  const handleTemplateSelect = (template: RoomTemplate) => {
    setFormData({
      name: "",
      code: "",
      boardPosition: template.boardPosition || "top",
      columns: template.columns.map((col, idx) => ({
        id: `col${idx + 1}`,
        tables: col.tables,
        seatsPerTable: col.seatsPerTable,
      })),
    })
    setShowTemplates(false)
    setShowCreateCustom(true)
  }

  const handleCreateRoom = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et le code sont requis",
        variant: "destructive",
      })
      return
    }

    const totalSeats = formData.columns.reduce((sum, col) => sum + col.tables * col.seatsPerTable, 0)
    const totalWidth = calculateTotalWidth(formData.columns)

    if (totalSeats > 350) {
      toast({
        title: "Erreur",
        description: "Le nombre total de places ne peut pas dépasser 350",
        variant: "destructive",
      })
      return
    }

    if (totalWidth > 10) {
      toast({
        title: "Erreur",
        description: "La largeur totale ne peut pas dépasser 10 places",
        variant: "destructive",
      })
      return
    }

    const { error } = await supabase.from("rooms").insert({
      establishment_id: profile.establishment_id,
      name: formData.name.trim(),
      code: formData.code.trim(),
      board_position: formData.boardPosition,
      config: { columns: formData.columns },
      created_by: user.id,
    })

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Erreur",
          description: "Ce code de salle existe déjà",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de créer la salle",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Salle créée",
        description: "La salle a été créée avec succès",
      })
      setShowCreateCustom(false)
      setFormData({
        name: "",
        code: "",
        boardPosition: "top",
        columns: [{ id: "col1", tables: 5, seatsPerTable: 2 }],
      })
    }
  }

  const duplicateRoom = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return

    const timestamp = Date.now()
    const { error } = await supabase.from("rooms").insert({
      establishment_id: profile.establishment_id,
      name: `${room.name} (copie)`,
      code: `${room.code}-${timestamp}`,
      board_position: room.board_position,
      config: room.config,
      created_by: user.id,
    })

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer la salle",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Salle dupliquée",
        description: "La salle a été dupliquée avec succès",
      })
    }
  }

  const deleteRooms = async () => {
    const { error } = await supabase.from("rooms").delete().in("id", selectedRoomIds)

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les salles",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Salles supprimées",
        description: `${selectedRoomIds.length} salle(s) supprimée(s) avec succès`,
      })
      setSelectedRoomIds([])
      setShowDeleteDialog(false)
    }
  }

  const addColumn = () => {
    if (formData.columns.length < 5) {
      setFormData({
        ...formData,
        columns: [...formData.columns, { id: `col${formData.columns.length + 1}`, tables: 5, seatsPerTable: 2 }],
      })
    }
  }

  const removeColumn = (index: number) => {
    if (formData.columns.length > 1) {
      setFormData({
        ...formData,
        columns: formData.columns.filter((_, i) => i !== index),
      })
    }
  }

  const updateColumn = (index: number, field: "tables" | "seatsPerTable", value: number) => {
    const newColumns = [...formData.columns]
    newColumns[index][field] = Math.max(1, Math.min(field === "tables" ? 20 : 7, value))
    setFormData({ ...formData, columns: newColumns })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Salles</h1>
            <p className="text-muted-foreground">Gérez les configurations de vos salles de classe</p>
          </div>
        </div>
        {canCreateRooms && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTemplates(true)}>
              <Grid3x3 className="mr-2 h-4 w-4" />
              Templates
            </Button>
            <Button onClick={() => setShowCreateCustom(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Personnalisée
            </Button>
          </div>
        )}
      </div>

      {/* Search and actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {canModifyRooms && selectedRoomIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedRoomIds.length} sélectionnée(s)</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                selectedRoomIds.forEach((id) => duplicateRoom(id))
                setSelectedRoomIds([])
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de salles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Affichées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Places totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.reduce((sum, room) => sum + calculateTotalSeats(room), 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Select all checkbox */}
      {canModifyRooms && filteredRooms.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedRoomIds.length === filteredRooms.length && filteredRooms.length > 0}
            onChange={selectAll}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-muted-foreground">Sélectionner tout</span>
        </div>
      )}

      {/* Rooms grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRooms.map((room) => (
          <Card key={room.id} className={`relative ${selectedRoomIds.includes(room.id) ? "ring-2 ring-primary" : ""}`}>
            {canModifyRooms && (
              <div className="absolute left-4 top-4 z-10">
                <input
                  type="checkbox"
                  checked={selectedRoomIds.includes(room.id)}
                  onChange={() => toggleRoomSelection(room.id)}
                  className="h-4 w-4 rounded border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <CardHeader className="pl-12">
              <CardTitle className="flex items-center justify-between">
                <span>{room.name}</span>
                <Badge variant="outline">{room.code}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Colonnes</span>
                  <span className="font-medium">{room.config.columns.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Places</span>
                  <span className="font-medium">{calculateTotalSeats(room)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tableau</span>
                  <Badge variant="secondary">
                    {room.board_position === "top" && "Haut"}
                    {room.board_position === "bottom" && "Bas"}
                    {room.board_position === "left" && "Gauche"}
                    {room.board_position === "right" && "Droite"}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => setShowCreateSubRoom(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Sous-salle
                </Button>
                {canModifyRooms && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => duplicateRoom(room.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRoomIds([room.id])
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredRooms.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <Grid3x3 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Aucune salle trouvée</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {searchQuery ? "Aucune salle ne correspond à votre recherche" : "Commencez par créer votre première salle"}
          </p>
          {canCreateRooms && !searchQuery && (
            <div className="flex gap-2">
              <Button onClick={() => setShowTemplates(true)} variant="outline">
                <Grid3x3 className="mr-2 h-4 w-4" />
                Templates
              </Button>
              <Button onClick={() => setShowCreateCustom(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer une salle
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Custom Room Dialog */}
      {showCreateCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-lg p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Créer une salle personnalisée</h2>
                <p className="text-sm text-muted-foreground">
                  Configurez votre salle avec le nombre de colonnes, tables et places souhaité
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom de la salle *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Salle A1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="code">Code de la salle *</Label>
                  <Input
                    id="code"
                    placeholder="Ex: A101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    maxLength={10}
                  />
                </div>

                <div>
                  <Label htmlFor="board">Position du tableau</Label>
                  <Select
                    value={formData.boardPosition}
                    onValueChange={(value: any) => setFormData({ ...formData, boardPosition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Haut</SelectItem>
                      <SelectItem value="bottom">Bas</SelectItem>
                      <SelectItem value="left">Gauche</SelectItem>
                      <SelectItem value="right">Droite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Configuration des colonnes</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addColumn}
                      disabled={formData.columns.length >= 5}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formData.columns.map((column, index) => (
                      <div key={column.id} className="flex items-end gap-3 p-3 bg-muted rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Colonne {index + 1}</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor={`tables-${index}`} className="text-xs">
                                Tables (1-20)
                              </Label>
                              <Input
                                id={`tables-${index}`}
                                type="number"
                                min="1"
                                max="20"
                                value={column.tables}
                                onChange={(e) => updateColumn(index, "tables", Number.parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`seats-${index}`} className="text-xs">
                                Places/table (1-7)
                              </Label>
                              <Input
                                id={`seats-${index}`}
                                type="number"
                                min="1"
                                max="7"
                                value={column.seatsPerTable}
                                onChange={(e) =>
                                  updateColumn(index, "seatsPerTable", Number.parseInt(e.target.value) || 1)
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColumn(index)}
                          disabled={formData.columns.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                      Total: {formData.columns.reduce((sum, col) => sum + col.tables * col.seatsPerTable, 0)} places
                      {" | "}
                      Largeur: {calculateTotalWidth(formData.columns)} places
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreateCustom(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateRoom}>Créer la salle</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateTemplateDialog
        open={showCreateTemplate}
        onOpenChange={setShowCreateTemplate}
        onSuccess={loadRooms}
        userId={user.id}
        establishmentId={profile.establishment_id}
      />

      <TemplateSelectionDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onSelectTemplate={handleTemplateSelect}
        userId={user.id}
        establishmentId={profile.establishment_id}
      />

      <CreateSubRoomDialog
        open={showCreateSubRoom}
        onOpenChange={setShowCreateSubRoom}
        onSuccess={loadRooms}
        establishmentId={profile.establishment_id}
        userRole={profile.role}
        userId={user.id}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={deleteRooms}
        itemCount={selectedRoomIds.length}
        itemType="salle"
      />
    </div>
  )
}
