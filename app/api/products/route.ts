import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des produits avec filtres
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")
    const categoryId = searchParams.get("category_id")
    const supplierId = searchParams.get("supplier_id")
    const isActive = searchParams.get("is_active")
    const lowStock = searchParams.get("low_stock") === "true"
    const barcode = searchParams.get("barcode")

    const offset = (page - 1) * limit

    let query = supabase.from("products").select(
      `
        *,
        category:product_categories(id, code, name_fr, name_en),
        supplier:suppliers(id, code, name)
      `,
      { count: "exact" },
    )

    // Filtres
    if (search) {
      query = query.or(`name_fr.ilike.%${search}%,name_en.ilike.%${search}%,code.ilike.%${search}%`)
    }

    if (barcode) {
      query = query.eq("barcode", barcode)
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    if (supplierId) {
      query = query.eq("supplier_id", supplierId)
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true")
    }

    // Pagination et tri
    query = query.order("name_fr", { ascending: true }).range(offset, offset + limit - 1)

    const { data: products, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Si low_stock est activé, on récupère le stock actuel pour chaque produit
    let productsWithStock = products
    if (products && products.length > 0) {
      const productIds = products.map((p) => p.id)

      const { data: stockData } = await supabase
        .from("product_lots")
        .select("product_id, current_quantity")
        .in("product_id", productIds)
        .eq("status", "available")

      const stockByProduct: Record<string, number> = {}
      stockData?.forEach((lot) => {
        stockByProduct[lot.product_id] = (stockByProduct[lot.product_id] || 0) + lot.current_quantity
      })

      productsWithStock = products.map((product) => ({
        ...product,
        current_stock: stockByProduct[product.id] || 0,
      }))

      // Filtrer par stock bas si demandé
      if (lowStock) {
        productsWithStock = productsWithStock.filter((p) => p.current_stock <= p.min_stock_level)
      }
    }

    // Retourner directement le tableau de produits
    // La pagination peut être ajoutée dans les headers si nécessaire
    return NextResponse.json(productsWithStock)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un produit
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const {
      code,
      barcode,
      name_fr,
      name_en,
      description_fr,
      description_en,
      category_id,
      supplier_id,
      purchase_price,
      selling_price_xof,
      selling_price_eur,
      selling_price_usd,
      tax_rate,
      is_tax_included,
      min_stock_level,
      max_stock_level,
      image_url,
    } = body

    // Validation
    if (!code || !name_fr || !name_en || !selling_price_xof) {
      return NextResponse.json(
        { error: "Champs obligatoires: code, name_fr, name_en, selling_price_xof" },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        code,
        barcode,
        name_fr,
        name_en,
        description_fr,
        description_en,
        category_id,
        supplier_id,
        purchase_price: purchase_price || 0,
        selling_price_xof,
        selling_price_eur,
        selling_price_usd,
        tax_rate: tax_rate || 0,
        is_tax_included: is_tax_included ?? true,
        min_stock_level: min_stock_level || 5,
        max_stock_level: max_stock_level || 100,
        image_url,
      })
      .select(`
        *,
        category:product_categories(id, code, name_fr, name_en),
        supplier:suppliers(id, code, name)
      `)
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code ou code-barres déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: "create",
      entity_type: "product",
      entity_id: data.id,
      details: { product_code: code },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
