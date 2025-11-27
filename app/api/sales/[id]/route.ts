import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'une vente
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        seller:users(id, first_name, last_name, employee_id),
        cash_register:cash_registers(id, code, name),
        point_of_sale:point_of_sales(id, code, name),
        lines:sale_lines(
          *,
          product:products(id, code, name_fr, name_en, barcode)
        ),
        payments:payments(
          *,
          payment_method:payment_methods(code, name, type)
        )
      `)
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching sale:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour une vente (annulation, etc.)
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

    const { status } = body

    // Récupérer la vente actuelle
    const { data: currentSale } = await supabase.from("sales").select("*, lines:sale_lines(*)").eq("id", id).single()

    if (!currentSale) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 })
    }

    // Si annulation, remettre le stock
    if (status === "cancelled" && currentSale.status !== "cancelled") {
      for (const line of currentSale.lines) {
        if (line.lot_id) {
          // Remettre la quantité dans le lot
          const { data: lot } = await supabase
            .from("product_lots")
            .select("current_quantity")
            .eq("id", line.lot_id)
            .single()

          await supabase
            .from("product_lots")
            .update({
              current_quantity: (lot?.current_quantity || 0) + line.quantity,
              status: "available",
              updated_at: new Date().toISOString(),
            })
            .eq("id", line.lot_id)

          // Enregistrer le mouvement de retour
          await supabase.from("stock_movements").insert({
            product_id: line.product_id,
            lot_id: line.lot_id,
            movement_type: "return",
            quantity: line.quantity,
            reference_type: "sale_cancellation",
            reference_id: id,
            user_id: user.id,
          })
        }
      }

      // Annuler les paiements
      await supabase.from("payments").update({ status: "refunded" }).eq("sale_id", id)
    }

    const { data, error } = await supabase
      .from("sales")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: `sale_${status}`,
      entity_type: "sale",
      entity_id: id,
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating sale:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
