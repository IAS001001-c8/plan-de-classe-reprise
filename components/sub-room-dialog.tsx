"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format, addDays } from "date-fns"
import { fr } from "date-fns/locale"
import type { SubRoomType } from "@/lib/types"

interface SubRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomAssignmentId: string
  userId: string
  onSuccess: () => void
}

export function SubRoomDialog({ open, onOpenChange, roomAssignmentId, userId, onSuccess }: SubRoomDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "temporary" as SubRoomType,
    start_date: new Date(),
    end_date: addDays(new Date(), 2),
  })

  const handleCreateSubRoom = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la sous-salle est requis",
        variant: "destructive",
      })
      return
    }

    if (formData.type === "temporary") {
      const daysDiff = Math.ceil((formData.end_date.getTime() - formData.start_date.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff < 2) {
        toast({
          title: "Erreur",
          description: "La durée minimale est de 2 jours",
          variant: "destructive",
        })
        return
      }
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const insertData: any = {
        room_assignment_id: roomAssignmentId,
        name: formData.name,
        type: formData.type,
        seat_assignments: {},
        is_modifiable_by_delegates: true,
        created_by: userId,
      }

      if (formData.type === "temporary") {
        insertData.start_date = formData.start_date.toISOString()
        insertData.end_date = formData.end_date.toISOString()
      }

      const { error } = await supabase.from("sub_rooms").insert(insertData)

      if (error) throw error

      toast({
        title: "Sous-salle créée",
        description: `La sous-salle "${formData.name}" a été créée avec succès`,
      })

      setFormData({
        name: "",
        type: "temporary",
        start_date: new Date(),
        end_date: addDays(new Date(), 2),
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la sous-salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une sous-salle</DialogTitle>
          <DialogDescription>
            Créez une version personnalisée de cette salle pour une période spécifique ou indéterminée
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la sous-salle</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Configuration examen"
            />
          </div>

          <div className="space-y-2">
            <Label>Type de sous-salle</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value: SubRoomType) => setFormData({ ...formData, type: value })}
            >
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="temporary" id="temporary" />
                <Label htmlFor="temporary" className="flex-1 cursor-pointer">
                  <div className="font-medium">Temporaire</div>
                  <div className="text-sm text-muted-foreground">
                    Durée fixe avec dates de début et fin (min. 2 jours, suppression automatique)
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="indeterminate" id="indeterminate" />
                <Label htmlFor="indeterminate" className="flex-1 cursor-pointer">
                  <div className="font-medium">Indéterminée</div>
                  <div className="text-sm text-muted-foreground">
                    Sans date de fin (suppression manuelle uniquement)
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.type === "temporary" && (
            <>
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.start_date, "PPP", { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Date de fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.end_date, "PPP", { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.end_date}
                      onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                      disabled={(date) => date < addDays(formData.start_date, 2)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="text-sm text-muted-foreground">
                Durée:{" "}
                {Math.ceil((formData.end_date.getTime() - formData.start_date.getTime()) / (1000 * 60 * 60 * 24))} jours
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreateSubRoom} disabled={isLoading}>
            {isLoading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
