import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// POST - Ajustement rapide de stock
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    console.log("[ADJUST] Request body:", body)

    const { product_id, lot_id, quantity, reason, user_id } = body

    if (!product_id || quantity === undefined) {
      console.log("[ADJUST] Missing required fields")
      return NextResponse.json({ error: "product_id et quantity requis" }, { status: 400 })
    }

    console.log("[ADJUST] Product ID:", product_id, "Quantity:", quantity)

    // Récupérer un utilisateur réel ou utiliser null
    let actualUserId = user_id
    if (!actualUserId) {
      const { data: users } = await supabase.from("users").select("id").limit(1).single()
      actualUserId = users?.id || null
    }
    console.log("[ADJUST] User ID:", actualUserId)

    // Récupérer le lot ou en créer un par défaut
    let targetLotId = lot_id
    let previousStock = 0

    if (lot_id) {
      console.log("[ADJUST] Using existing lot:", lot_id)
      const { data: lot } = await supabase.from("product_lots").select("current_quantity").eq("id", lot_id).single()
      previousStock = lot?.current_quantity || 0
    } else {
      console.log("[ADJUST] Finding or creating lot for product:", product_id)
      // Trouver ou créer un lot par défaut pour ce produit
      const { data: existingLots, error: findError } = await supabase
        .from("product_lots")
        .select("id, current_quantity")
        .eq("product_id", product_id)
        .eq("status", "available")
        .order("received_date", { ascending: false })
        .limit(1)

      if (findError) {
        console.error("[ADJUST] Error finding lot:", findError)
      }

      console.log("[ADJUST] Existing lots found:", existingLots?.length || 0)

      if (existingLots && existingLots.length > 0) {
        targetLotId = existingLots[0].id
        previousStock = existingLots[0].current_quantity
        console.log("[ADJUST] Using existing lot:", targetLotId, "with stock:", previousStock)
      } else {
        // Créer un nouveau lot
        console.log("[ADJUST] Creating new lot")
        const lotNumber = `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
        const { data: newLot, error: lotError } = await supabase
          .from("product_lots")
          .insert({
            lot_number: lotNumber,
            product_id,
            initial_quantity: 0,
            current_quantity: 0,
            received_date: new Date().toISOString().split("T")[0],
          })
          .select()
          .single()

        if (lotError) {
          console.error("[ADJUST] Error creating lot:", lotError)
          return NextResponse.json({ error: lotError.message }, { status: 500 })
        }

        targetLotId = newLot?.id
        console.log("[ADJUST] Created new lot:", targetLotId)
      }
    }

    const newStock = Math.max(0, previousStock + quantity)
    console.log("[ADJUST] Stock change:", previousStock, "->", newStock)

    // Créer le mouvement
    const movementData: any = {
      product_id,
      lot_id: targetLotId,
      movement_type: "adjustment",
      quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: reason || "Ajustement manuel",
    }
    
    if (actualUserId) {
      movementData.user_id = actualUserId
    }
    console.log("[ADJUST] Creating movement:", movementData)

    const { data: movement, error: movementError } = await supabase
      .from("stock_movements")
      .insert(movementData)
      .select()
      .single()

    if (movementError) {
      console.error("[ADJUST] Error creating movement:", movementError)
      return NextResponse.json({ error: movementError.message }, { status: 500 })
    }

    console.log("[ADJUST] Movement created:", movement.id)

    // Mettre à jour le lot
    console.log("[ADJUST] Updating lot:", targetLotId)
    const { error: updateError } = await supabase
      .from("product_lots")
      .update({
        current_quantity: newStock,
        status: newStock === 0 ? "depleted" : "available",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetLotId)

    if (updateError) {
      console.error("[ADJUST] Error updating lot:", updateError)
    }

    console.log("[ADJUST] Success!")
    return NextResponse.json({ data: movement }, { status: 201 })
  } catch (error) {
    console.error("[ADJUST] Fatal error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
