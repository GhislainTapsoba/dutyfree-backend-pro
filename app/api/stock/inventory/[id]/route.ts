import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'un inventaire avec lignes
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: inventory, error } = await supabase
      .from("inventories")
      .select(`
        *,
        point_of_sale:point_of_sales(id, code, name),
        lines:inventory_lines(
          *,
          product:products(id, code, name_fr, name_en)
        )
      `)
      .eq("id", id)
      .single()

    if (error || !inventory) {
      return NextResponse.json({ error: "Inventaire non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ data: inventory })
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour un inventaire (saisie des comptages)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { status, lines, notes } = body

    // Mise à jour du statut si fourni
    if (status) {
      const updateData: Record<string, unknown> = { status }

      if (status === "in_progress") {
        updateData.started_at = new Date().toISOString()
      } else if (status === "completed") {
        updateData.completed_at = new Date().toISOString()
      } else if (status === "validated") {
        updateData.validated_by = user.id
      }

      if (notes !== undefined) {
        updateData.notes = notes
      }

      await supabase.from("inventories").update(updateData).eq("id", id)
    }

    // Mise à jour des lignes si fournies
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        await supabase
          .from("inventory_lines")
          .update({
            counted_quantity: line.counted_quantity,
            counted_by: user.id,
            counted_at: new Date().toISOString(),
            notes: line.notes,
          })
          .eq("id", line.id)
      }
    }

    // Récupérer l'inventaire mis à jour
    const { data: inventory, error } = await supabase
      .from("inventories")
      .select(`
        *,
        lines:inventory_lines(
          *,
          product:products(id, code, name_fr, name_en)
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: inventory })
  } catch (error) {
    console.error("Error updating inventory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
