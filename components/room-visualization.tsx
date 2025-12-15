"use client"
import { AlertCircle } from "lucide-react"

interface RoomConfig {
  columns: {
    id: string
    tables: number
    seatsPerTable: number
  }[]
}

interface Room {
  id: string
  name: string
  code: string
  board_position: "top" | "bottom" | "left" | "right"
  config: RoomConfig
}

interface RoomVisualizationProps {
  room: Room | null | undefined
}

function validateRoom(room: any): { isValid: boolean; reason?: string } {
  console.log("[v0] RoomVisualization - Validating room:", room)

  if (!room) {
    return { isValid: false, reason: "La salle est null ou undefined" }
  }

  if (!room.config) {
    return { isValid: false, reason: "La configuration de la salle est manquante" }
  }

  if (!Array.isArray(room.config.columns)) {
    return { isValid: false, reason: "Les colonnes ne sont pas un tableau" }
  }

  if (room.config.columns.length === 0) {
    return { isValid: false, reason: "Aucune colonne configurée" }
  }

  // Vérifier que chaque colonne a les bonnes données
  const invalidColumn = room.config.columns.find(
    (col: any) => typeof col.tables !== "number" || typeof col.seatsPerTable !== "number",
  )

  if (invalidColumn) {
    return { isValid: false, reason: "Une colonne a des données invalides" }
  }

  return { isValid: true }
}

function RoomValidationError({ reason }: { reason: string }) {
  return (
    <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-xl border-2 border-orange-300 dark:border-orange-700">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">Configuration de salle invalide</h3>
          <p className="text-sm text-orange-700 dark:text-orange-300">{reason}</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
            Veuillez vérifier la configuration de cette salle dans les paramètres.
          </p>
        </div>
      </div>
    </div>
  )
}

export function RoomVisualization({ room }: RoomVisualizationProps) {
  console.log("[v0] RoomVisualization - Rendering with room:", {
    hasRoom: !!room,
    roomId: room?.id,
    roomName: room?.name,
    hasConfig: !!room?.config,
    columnsCount: room?.config?.columns?.length,
  })

  const validation = validateRoom(room)

  if (!validation.isValid) {
    console.warn("[v0] RoomVisualization - Validation failed:", validation.reason)
    return <RoomValidationError reason={validation.reason || "Raison inconnue"} />
  }

  // TypeScript sait maintenant que room est valide
  const safeRoom = room as Room
  const { board_position, config } = safeRoom
  const columns = config.columns

  console.log("[v0] RoomVisualization - Rendering valid room:", {
    name: safeRoom.name,
    columnsCount: columns.length,
    boardPosition: board_position,
  })

  const renderBoard = () => (
    <div className="bg-slate-800 dark:bg-slate-700 text-white text-center py-3 px-4 rounded-lg font-semibold shadow-lg">
      Tableau
    </div>
  )

  const renderSeats = () => {
    if (!columns || columns.length === 0) {
      console.warn("[v0] RoomVisualization - No columns to render")
      return (
        <div className="text-center text-muted-foreground py-4">
          <p>Aucune place configurée</p>
        </div>
      )
    }

    console.log("[v0] RoomVisualization - Rendering seats for columns:", columns.length)

    return (
      <div className="flex gap-4 justify-center my-6">
        {columns.map((column, colIndex) => {
          const tables = Math.max(0, column.tables || 0)
          const seatsPerTable = Math.max(0, column.seatsPerTable || 0)

          console.log(`[v0] RoomVisualization - Column ${colIndex}: ${tables} tables, ${seatsPerTable} seats each`)

          return (
            <div key={column.id || `col-${colIndex}`} className="flex flex-col gap-2">
              {Array.from({ length: tables }).map((_, tableIndex) => (
                <div key={`table-${colIndex}-${tableIndex}`} className="flex gap-1">
                  {Array.from({ length: seatsPerTable }).map((_, seatIndex) => (
                    <div
                      key={`seat-${colIndex}-${tableIndex}-${seatIndex}`}
                      className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 border-2 border-emerald-300 dark:border-emerald-700 rounded flex items-center justify-center text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                      title={`Colonne ${colIndex + 1}, Table ${tableIndex + 1}, Place ${seatIndex + 1}`}
                    >
                      {seatIndex + 1}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  const totalTables = columns.reduce((total, col) => total + Math.max(0, col.tables || 0), 0)
  const totalSeats = columns.reduce(
    (total, col) => total + Math.max(0, col.tables || 0) * Math.max(0, col.seatsPerTable || 0),
    0,
  )

  console.log("[v0] RoomVisualization - Stats:", {
    totalColumns: columns.length,
    totalTables,
    totalSeats,
  })

  return (
    <div className="space-y-4">
      <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700">
        {board_position === "top" && renderBoard()}
        {board_position === "left" && (
          <div className="flex gap-4">
            <div className="flex-shrink-0">{renderBoard()}</div>
            <div className="flex-1">{renderSeats()}</div>
          </div>
        )}
        {board_position !== "left" && board_position !== "right" && renderSeats()}
        {board_position === "right" && (
          <div className="flex gap-4">
            <div className="flex-1">{renderSeats()}</div>
            <div className="flex-shrink-0">{renderBoard()}</div>
          </div>
        )}
        {board_position === "bottom" && renderBoard()}
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-muted-foreground mb-1">Colonnes</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{columns.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-muted-foreground mb-1">Tables</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalTables}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-muted-foreground mb-1">Places totales</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalSeats}</div>
        </div>
      </div>
    </div>
  )
}
