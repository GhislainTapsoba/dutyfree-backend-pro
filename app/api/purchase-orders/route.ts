import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des commandes fournisseurs
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const supplierId = searchParams.get("supplier_id")

    const offset = (page - 1) * limit

    let query = supabase.from("purchase_orders").select(
      `
        *,
        supplier:suppliers(id, code, name),
        point_of_sale:point_of_sales(id, code, name),
        created_by_user:users!purchase_orders_created_by_fkey(id, first_name, last_name)
      `,
      { count: "exact" },
    )

    if (status) {
      query = query.eq("status", status)
    }

    if (supplierId) {
      query = query.eq("supplier_id", supplierId)
    }

    query = query.order("order_date", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une commande fournisseur
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    // Récupérer un utilisateur réel ou utiliser null
    const { data: users } = await supabase.from("users").select("id").limit(1).single()
    const userId = users?.id || null

    const {
      supplier_id,
      point_of_sale_id,
      order_date,
      expected_delivery_date,
      approach_costs,
      currency_code,
      notes,
      lines,
    } = body

    if (!supplier_id || !lines || lines.length === 0) {
      return NextResponse.json({ error: "Champs obligatoires: supplier_id, lines" }, { status: 400 })
    }

    // Générer numéro de commande
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`

    // Calculer les totaux
    const subtotal = lines.reduce(
      (sum: number, line: { quantity: number; unit_price: number }) => sum + line.quantity * line.unit_price,
      0,
    )
    const total = subtotal + (approach_costs || 0)

    // Créer la commande
    const orderData: any = {
      order_number: orderNumber,
      supplier_id,
      point_of_sale_id,
      order_date: order_date || new Date().toISOString().split("T")[0],
      expected_delivery_date,
      subtotal,
      approach_costs: approach_costs || 0,
      total,
      currency_code: currency_code || "XOF",
      notes,
      status: "draft",
    }
    
    if (userId) {
      orderData.created_by = userId
    }
    
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // Créer les lignes
    const orderLines = lines.map((line: { product_id: string; quantity: number; unit_price: number }) => ({
      purchase_order_id: order.id,
      product_id: line.product_id,
      quantity_ordered: line.quantity,
      unit_price: line.unit_price,
      line_total: line.quantity * line.unit_price,
    }))

    await supabase.from("purchase_order_lines").insert(orderLines)

    // Récupérer la commande complète
    const { data: fullOrder } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(id, code, name),
        lines:purchase_order_lines(
          *,
          product:products(id, code, name_fr, name_en)
        )
      `)
      .eq("id", order.id)
      .single()

    return NextResponse.json({ data: fullOrder }, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
