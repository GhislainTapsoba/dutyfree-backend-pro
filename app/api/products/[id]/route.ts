import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'un produit
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: product, error } = await supabase
      .from("products")
      .select(`
        *,
        category:product_categories(id, code, name_fr, name_en),
        supplier:suppliers(id, code, name),
        technical_sheet:product_technical_sheets(*)
      `)
      .eq("id", id)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 })
    }

    // Récupérer le stock actuel
    const { data: stockData } = await supabase
      .from("product_lots")
      .select("current_quantity")
      .eq("product_id", id)
      .eq("status", "available")

    const currentStock = stockData?.reduce((sum, lot) => sum + lot.current_quantity, 0) || 0

    return NextResponse.json({
      data: {
        ...product,
        current_stock: currentStock,
      },
    })
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour un produit
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

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      "code",
      "barcode",
      "name_fr",
      "name_en",
      "description_fr",
      "description_en",
      "category_id",
      "supplier_id",
      "purchase_price",
      "selling_price_xof",
      "selling_price_eur",
      "selling_price_usd",
      "tax_rate",
      "is_tax_included",
      "min_stock_level",
      "max_stock_level",
      "image_url",
      "is_active",
      "is_promotional",
    ]

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        category:product_categories(id, code, name_fr, name_en),
        supplier:suppliers(id, code, name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: "update",
      entity_type: "product",
      entity_id: id,
      details: { updated_fields: Object.keys(updateData) },
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer (désactiver) un produit
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Soft delete - désactiver le produit
    const { error } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: "delete",
      entity_type: "product",
      entity_id: id,
    })

    return NextResponse.json({ message: "Produit désactivé" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
