import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des produits avec filtres
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
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
    const supabase = createAdminClient()
    const body = await request.json()

    // Utilisation d'un user_id hardcodé pour le moment
    const user_id = "00000000-0000-0000-0000-000000000000"

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
      initial_stock,
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

    // Créer un lot initial si du stock est spécifié
    if (initial_stock && initial_stock > 0) {
      // Récupérer le premier point de vente et emplacement de stockage
      const { data: pos } = await supabase
        .from("point_of_sales")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single()

      const { data: location } = await supabase
        .from("storage_locations")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single()

      if (pos && location) {
        // Créer un sommier par défaut si nécessaire
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

        if (ledger) {
          // Créer le lot initial
          await supabase.from("product_lots").insert({
            lot_number: `LOT-${code}-${Date.now()}`,
            product_id: data.id,
            customs_ledger_id: ledger.id,
            storage_location_id: location.id,
            initial_quantity: initial_stock,
            current_quantity: initial_stock,
            purchase_price: purchase_price || 0,
            total_cost: purchase_price || 0,
            received_date: new Date().toISOString().split('T')[0],
            status: "available"
          })

          // Enregistrer le mouvement de stock
          await supabase.from("stock_movements").insert({
            product_id: data.id,
            point_of_sale_id: pos.id,
            movement_type: "entry",
            quantity: initial_stock,
            previous_stock: 0,
            new_stock: initial_stock,
            reference_type: "initial_stock",
            reason: "Stock initial à la création du produit",
            user_id: user_id
          })
        }
      }
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user_id,
      action: "create",
      entity_type: "product",
      entity_id: data.id,
      details: { product_code: code, initial_stock: initial_stock || 0 },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
