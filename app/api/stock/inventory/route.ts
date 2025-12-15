import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des inventaires
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const pointOfSaleId = searchParams.get("pos_id")

    let query = supabase.from("inventories").select(`
        *,
        point_of_sale:point_of_sales(id, code, name),
        started_by_user:users!inventories_started_by_fkey(id, first_name, last_name),
        validated_by_user:users!inventories_validated_by_fkey(id, first_name, last_name)
      `)

    if (status) {
      query = query.eq("status", status)
    }

    if (pointOfSaleId) {
      query = query.eq("point_of_sale_id", pointOfSaleId)
    }

    const { data, error } = await query.order("inventory_date", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching inventories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un inventaire
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    console.log("[INVENTORY CREATE] Request body:", body)
    
    // Récupérer un utilisateur réel ou utiliser null
    const { data: users } = await supabase.from("users").select("id").limit(1).single()
    const user_id = users?.id || null

    const { point_of_sale_id, inventory_date, notes } = body

    // Générer code inventaire
    const inventoryCode = `INV-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Créer l'inventaire
    const inventoryData: any = {
      code: inventoryCode,
      point_of_sale_id: point_of_sale_id === "all" || !point_of_sale_id ? null : point_of_sale_id,
      inventory_date: inventory_date || new Date().toISOString().split("T")[0],
      status: "draft",
      notes,
    }
    
    if (user_id) {
      inventoryData.started_by = user_id
    }
    
    console.log("[INVENTORY CREATE] Creating inventory:", inventoryData)
    
    const { data: inventory, error: inventoryError } = await supabase
      .from("inventories")
      .insert(inventoryData)
      .select()
      .single()

    if (inventoryError) {
      console.error("[INVENTORY CREATE] Error:", inventoryError)
      return NextResponse.json({ error: inventoryError.message }, { status: 500 })
    }
    
    console.log("[INVENTORY CREATE] Inventory created:", inventory.id)

    // Récupérer tous les lots avec du stock pour créer les lignes d'inventaire
    let lotsQuery = supabase
      .from("product_lots")
      .select("id, product_id, current_quantity")
      .eq("status", "available")
      .gt("current_quantity", 0)

    if (point_of_sale_id) {
      lotsQuery = lotsQuery.eq("storage_location.point_of_sale_id", point_of_sale_id)
    }

    const { data: lots } = await lotsQuery

    // Créer les lignes d'inventaire
    if (lots && lots.length > 0) {
      const lines = lots.map((lot) => ({
        inventory_id: inventory.id,
        product_id: lot.product_id,
        lot_id: lot.id,
        theoretical_quantity: lot.current_quantity,
      }))

      await supabase.from("inventory_lines").insert(lines)
    }

    return NextResponse.json({ data: inventory }, { status: 201 })
  } catch (error) {
    console.error("Error creating inventory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
