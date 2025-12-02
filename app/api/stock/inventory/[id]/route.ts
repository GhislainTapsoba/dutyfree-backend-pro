import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'un inventaire avec lignes
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

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
    const supabase = createAdminClient()
    const body = await request.json()

    // Récupérer un utilisateur réel ou utiliser null
    const { data: users } = await supabase.from("users").select("id").limit(1).single()
    const userId = users?.id || null

    const { status, lines, notes } = body

    // Mise à jour du statut si fourni
    if (status) {
      const updateData: Record<string, unknown> = { status }

      if (status === "in_progress") {
        updateData.started_at = new Date().toISOString()
      } else if (status === "completed") {
        updateData.completed_at = new Date().toISOString()
      } else if (status === "validated") {
        if (userId) {
          updateData.validated_by = userId
        }
      }

      if (notes !== undefined) {
        updateData.notes = notes
      }

      await supabase.from("inventories").update(updateData).eq("id", id)
    }

    // Mise à jour des lignes si fournies
    if (lines && Array.isArray(lines)) {
      for (const line of lines) {
        const lineData: any = {
          counted_quantity: line.counted_quantity,
          counted_at: new Date().toISOString(),
          notes: line.notes,
        }
        if (userId) {
          lineData.counted_by = userId
        }
        await supabase
          .from("inventory_lines")
          .update(lineData)
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

// DELETE - Supprimer un inventaire
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Vérifier si l'inventaire existe
    const { data: inventory } = await supabase
      .from("inventories")
      .select("status")
      .eq("id", id)
      .single()

    if (!inventory) {
      return NextResponse.json({ error: "Inventaire non trouvé" }, { status: 404 })
    }

    // Empêcher la suppression si validé
    if (inventory.status === "validated") {
      return NextResponse.json(
        { error: "Impossible de supprimer un inventaire validé" },
        { status: 400 }
      )
    }

    // Supprimer les lignes d'inventaire
    await supabase.from("inventory_lines").delete().eq("inventory_id", id)

    // Supprimer l'inventaire
    const { error } = await supabase.from("inventories").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Inventaire supprimé" })
  } catch (error) {
    console.error("Error deleting inventory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
