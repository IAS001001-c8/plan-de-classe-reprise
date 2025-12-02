"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ROOM_TEMPLATES, type RoomTemplate } from "@/components/room-templates"
import { Users, Columns3, LayoutGrid } from "lucide-react"

interface TemplateSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: RoomTemplate) => void
}

export function TemplateSelectionDialog({ open, onOpenChange, onSelectTemplate }: TemplateSelectionDialogProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choisir un modèle de salle</DialogTitle>
          <DialogDescription>
            Sélectionnez un modèle pré-configuré et personnalisez-le selon vos besoins
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {ROOM_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-2 hover:border-emerald-400"
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
            >
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{template.totalSeats} places</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Columns3 className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{template.columns.length} colonnes</span>
                  </div>
                </div>

                {/* Mini visualization */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-3 mb-3 h-32 flex items-center justify-center">
                  <div className="flex gap-2 scale-75">
                    {template.columns.map((column, colIndex) => (
                      <div key={colIndex} className="flex flex-col gap-1">
                        {Array.from({ length: Math.min(column.tables, 4) }).map((_, tableIndex) => (
                          <div key={tableIndex} className="flex gap-0.5">
                            {Array.from({ length: column.seatsPerTable }).map((_, seatIndex) => (
                              <div key={seatIndex} className="w-3 h-3 bg-emerald-500 rounded-sm" />
                            ))}
                          </div>
                        ))}
                        {column.tables > 4 && (
                          <div className="text-[8px] text-center text-muted-foreground">+{column.tables - 4}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hover overlay with CTA */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-emerald-600/95 to-emerald-500/95 flex items-center justify-center transition-opacity duration-300 ${
                    hoveredTemplate === template.id ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-white text-emerald-700 hover:bg-white/90 font-semibold shadow-lg"
                    onClick={() => {
                      onSelectTemplate(template)
                      onOpenChange(false)
                    }}
                  >
                    <LayoutGrid className="mr-2 h-5 w-5" />
                    Personnaliser cette salle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
