import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail commande fournisseur
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(id, code, name, email, phone),
        point_of_sale:point_of_sales(id, code, name),
        lines:purchase_order_lines(
          *,
          product:products(id, code, name_fr, name_en, barcode)
        )
      `)
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour statut/commande
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { status, notes, approach_costs } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (approach_costs !== undefined) {
      updateData.approach_costs = approach_costs
      // Recalculer le total
      const { data: order } = await supabase.from("purchase_orders").select("subtotal").eq("id", id).single()

      if (order) {
        updateData.total = order.subtotal + approach_costs
      }
    }

    const { data, error } = await supabase.from("purchase_orders").update(updateData).eq("id", id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer une commande
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Supprimer les lignes
    await supabase.from("purchase_order_lines").delete().eq("purchase_order_id", id)

    // Supprimer la commande
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Commande supprimée" })
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
