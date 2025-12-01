import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const { quantity, reason } = await request.json()

    if (!quantity || quantity === 0) {
      return NextResponse.json({ error: "Quantité requise" }, { status: 400 })
    }

    // Créer ou récupérer le point de vente par défaut
    let { data: pos } = await supabase
      .from("point_of_sales")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single()

    if (!pos) {
      const { data: newPos } = await supabase
        .from("point_of_sales")
        .insert({
          code: "POS-MAIN",
          name: "Boutique Principale",
          location: "Terminal Principal",
          is_active: true
        })
        .select("id")
        .single()
      pos = newPos
    }

    // Créer ou récupérer l'emplacement de stockage par défaut
    let { data: location } = await supabase
      .from("storage_locations")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single()

    if (!location) {
      const { data: newLocation } = await supabase
        .from("storage_locations")
        .insert({
          code: "STORE-MAIN",
          name: "Stockage Principal",
          point_of_sale_id: pos.id,
          zone: "Zone A",
          is_active: true
        })
        .select("id")
        .single()
      location = newLocation
    }

    // Créer ou récupérer le sommier douanier par défaut
    let { data: ledger } = await supabase
      .from("customs_ledgers")
      .select("id")
      .eq("status", "open")
      .limit(1)
      .single()

    if (!ledger) {
      const { data: newLedger } = await supabase
        .from("customs_ledgers")
        .insert({
          ledger_number: `LEDGER-${new Date().getFullYear()}-001`,
          point_of_sale_id: pos.id,
          start_date: new Date().toISOString().split('T')[0],
          status: "open"
        })
        .select("id")
        .single()
      ledger = newLedger
    }

    // Créer un lot si quantité positive
    if (quantity > 0) {
      await supabase.from("product_lots").insert({
        lot_number: `LOT-ADJ-${Date.now()}`,
        product_id: id,
        customs_ledger_id: ledger.id,
        storage_location_id: location.id,
        initial_quantity: quantity,
        current_quantity: quantity,
        received_date: new Date().toISOString().split('T')[0],
        status: "available"
      })
    }

    // Enregistrer le mouvement de stock
    await supabase.from("stock_movements").insert({
      product_id: id,
      point_of_sale_id: pos.id,
      movement_type: "adjustment",
      quantity: Math.abs(quantity),
      reference_type: "manual_adjustment",
      reason: reason || "Ajustement manuel",
      user_id: "00000000-0000-0000-0000-000000000000"
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adjusting stock:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}