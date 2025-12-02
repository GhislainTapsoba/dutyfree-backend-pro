import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'un lot
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("product_lots")
      .select(`
        *,
        product:products(id, code, name_fr, name_en),
        storage_location:storage_locations(id, code, name),
        customs_ledger:customs_ledgers(id, ledger_number)
      `)
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Lot non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching lot:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Modifier un lot
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { current_quantity, status, expiry_date, storage_location_id, notes } = body

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (current_quantity !== undefined) updateData.current_quantity = current_quantity
    if (status) updateData.status = status
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date
    if (storage_location_id) updateData.storage_location_id = storage_location_id
    if (notes !== undefined) updateData.notes = notes

    const { data, error } = await supabase
      .from("product_lots")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating lot:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer un lot
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Vérifier si le lot a des mouvements
    const { data: movements } = await supabase
      .from("stock_movements")
      .select("id")
      .eq("lot_id", id)
      .limit(1)

    if (movements && movements.length > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer un lot avec des mouvements" },
        { status: 400 }
      )
    }

    const { error } = await supabase.from("product_lots").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Lot supprimé" })
  } catch (error) {
    console.error("Error deleting lot:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
