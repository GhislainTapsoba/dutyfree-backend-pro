import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Historique des mouvements
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const productId = searchParams.get("product_id")
    const movementType = searchParams.get("type")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const pointOfSaleId = searchParams.get("pos_id")

    const offset = (page - 1) * limit

    let query = supabase.from("stock_movements").select(
      `
        *,
        product:products(id, code, name_fr, name_en),
        user:users(id, first_name, last_name)
      `,
      { count: "exact" },
    )

    if (productId) {
      query = query.eq("product_id", productId)
    }

    if (movementType) {
      query = query.eq("movement_type", movementType)
    }

    if (pointOfSaleId) {
      query = query.eq("point_of_sale_id", pointOfSaleId)
    }

    if (startDate) {
      query = query.gte("created_at", startDate)
    }

    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching movements:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un mouvement de stock (ajustement, transfert, rebut)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { product_id, lot_id, point_of_sale_id, movement_type, quantity, reason } = body

    // Validation
    if (!product_id || !movement_type || !quantity) {
      return NextResponse.json({ error: "Champs obligatoires: product_id, movement_type, quantity" }, { status: 400 })
    }

    // Vérifier que le type est valide pour une création manuelle
    const validTypes = ["adjustment", "transfer", "waste", "return"]
    if (!validTypes.includes(movement_type)) {
      return NextResponse.json({ error: "Type de mouvement invalide pour création manuelle" }, { status: 400 })
    }

    // Récupérer le stock actuel du lot si spécifié
    let previousStock = 0
    if (lot_id) {
      const { data: lot } = await supabase.from("product_lots").select("current_quantity").eq("id", lot_id).single()

      previousStock = lot?.current_quantity || 0
    }

    // Calculer le nouveau stock
    const isAddition = movement_type === "return" || (movement_type === "adjustment" && quantity > 0)
    const newStock = isAddition ? previousStock + Math.abs(quantity) : previousStock - Math.abs(quantity)

    // Créer le mouvement
    const { data: movement, error: movementError } = await supabase
      .from("stock_movements")
      .insert({
        product_id,
        lot_id,
        point_of_sale_id,
        movement_type,
        quantity: Math.abs(quantity) * (isAddition ? 1 : -1),
        previous_stock: previousStock,
        new_stock: newStock,
        reason,
        user_id: user.id,
      })
      .select()
      .single()

    if (movementError) {
      return NextResponse.json({ error: movementError.message }, { status: 500 })
    }

    // Mettre à jour le lot si spécifié
    if (lot_id) {
      const newQuantity = Math.max(0, newStock)
      await supabase
        .from("product_lots")
        .update({
          current_quantity: newQuantity,
          status: newQuantity === 0 ? "depleted" : "available",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lot_id)
    }

    return NextResponse.json({ data: movement }, { status: 201 })
  } catch (error) {
    console.error("Error creating movement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
