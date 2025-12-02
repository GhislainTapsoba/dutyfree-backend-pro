import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des lots
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const productId = searchParams.get("product_id")
    const ledgerId = searchParams.get("ledger_id")
    const status = searchParams.get("status")
    const expiringSoon = searchParams.get("expiring_soon") === "true"

    let query = supabase.from("product_lots").select(`
        *,
        product:products(id, code, name_fr, name_en),
        storage_location:storage_locations(id, code, name),
        customs_ledger:customs_ledgers(id, ledger_number)
      `)

    if (productId) {
      query = query.eq("product_id", productId)
    }

    if (ledgerId) {
      query = query.eq("customs_ledger_id", ledgerId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (expiringSoon) {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      query = query.not("expiry_date", "is", null).lte("expiry_date", thirtyDaysFromNow.toISOString().split("T")[0])
    }

    const { data, error } = await query.order("received_date", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching lots:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un lot (entrée de stock)
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    console.log("[LOT CREATE] Request body:", body)

    // Récupérer un utilisateur réel ou utiliser null
    const { data: users } = await supabase.from("users").select("id").limit(1).single()
    const userId = users?.id || null

    const {
      product_id,
      customs_ledger_id,
      storage_location_id,
      quantity,
      purchase_price,
      approach_costs,
      expiry_date,
      received_date,
    } = body

    if (!product_id || quantity === undefined || quantity === null) {
      console.log("[LOT CREATE] Missing required fields")
      return NextResponse.json({ error: "Champs obligatoires: product_id, quantity" }, { status: 400 })
    }
    
    if (quantity <= 0) {
      console.log("[LOT CREATE] Invalid quantity")
      return NextResponse.json({ error: "La quantité doit être supérieure à 0" }, { status: 400 })
    }
    
    console.log("[LOT CREATE] Product ID:", product_id, "Quantity:", quantity)

    // Générer numéro de lot
    const lotNumber = `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Calculer coût total
    const totalCost = (purchase_price || 0) + (approach_costs || 0)

    const { data: lot, error } = await supabase
      .from("product_lots")
      .insert({
        lot_number: lotNumber,
        product_id,
        customs_ledger_id,
        storage_location_id,
        initial_quantity: quantity,
        current_quantity: quantity,
        purchase_price,
        approach_costs: approach_costs || 0,
        total_cost: totalCost,
        expiry_date,
        received_date: received_date || new Date().toISOString().split("T")[0],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enregistrer le mouvement d'entrée
    const movementData: any = {
      product_id,
      lot_id: lot.id,
      movement_type: "entry",
      quantity,
      previous_stock: 0,
      new_stock: quantity,
      reference_type: "lot_creation",
      reference_id: lot.id,
    }
    
    if (userId) {
      movementData.user_id = userId
    }
    
    await supabase.from("stock_movements").insert(movementData)

    return NextResponse.json({ data: lot }, { status: 201 })
  } catch (error) {
    console.error("Error creating lot:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
