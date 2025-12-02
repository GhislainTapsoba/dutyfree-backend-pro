import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/reports/stock - Rapport de stock (mouvements, ruptures, valorisation)
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams

  const reportType = searchParams.get("type") || "overview" // overview, movements, shortages, valuation
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const posId = searchParams.get("pos_id")
  const categoryId = searchParams.get("category_id")

  try {
    // Récupérer tous les produits avec leur stock actuel
    let productsQuery = supabase
      .from("products")
      .select(`
        id,
        sku,
        barcode,
        name,
        description,
        purchase_price,
        sale_price_xof,
        sale_price_eur,
        sale_price_usd,
        stock_quantity,
        min_stock_level,
        category_id,
        product_categories (name)
      `)
      .eq("is_active", true)

    if (categoryId) {
      productsQuery = productsQuery.eq("category_id", categoryId)
    }

    const { data: products, error: productsError } = await productsQuery
    if (productsError) throw productsError

    // Mouvements de stock
    let movementsQuery = supabase
      .from("stock_movements")
      .select(`
        id,
        product_id,
        products (name, sku),
        movement_type,
        quantity,
        unit_cost,
        lot_number,
        reference_type,
        reference_id,
        notes,
        created_by,
        users (full_name),
        created_at
      `)
      .order("created_at", { ascending: false })

    if (startDate) {
      movementsQuery = movementsQuery.gte("created_at", startDate)
    }
    if (endDate) {
      movementsQuery = movementsQuery.lte("created_at", endDate)
    }

    const { data: movements, error: movementsError } = await movementsQuery
    if (movementsError) throw movementsError

    // Lots/Sommiers (pour le suivi douanier)
    const { data: lots, error: lotsError } = await supabase
      .from("stock_lots")
      .select(`
        id,
        lot_number,
        product_id,
        products (name, sku),
        initial_quantity,
        current_quantity,
        customs_declaration,
        reception_date,
        expiry_date,
        status,
        storage_location
      `)
      .order("reception_date", { ascending: false })

    if (lotsError) throw lotsError

    // Calculs
    const totalProducts = products?.length || 0
    const totalStockValue = products?.reduce((sum, p) => sum + Number(p.purchase_price) * p.stock_quantity, 0) || 0
    const totalSaleValue = products?.reduce((sum, p) => sum + Number(p.sale_price_xof) * p.stock_quantity, 0) || 0

    // Produits en rupture ou sous le seuil minimum
    const shortages = products?.filter((p) => p.stock_quantity <= p.min_stock_level) || []
    const outOfStock = products?.filter((p) => p.stock_quantity === 0) || []

    // Mouvements par type
    const movementsByType =
      movements?.reduce((acc: Record<string, { count: number; quantity: number }>, m) => {
        if (!acc[m.movement_type]) {
          acc[m.movement_type] = { count: 0, quantity: 0 }
        }
        acc[m.movement_type].count++
        acc[m.movement_type].quantity += m.quantity
        return acc
      }, {}) || {}

    // Lots à apurer (expiration proche ou déclaration douanière)
    const lotsToSettle =
      lots?.filter((lot) => {
        if (lot.status === "settled") return false
        const expiryDate = lot.expiry_date ? new Date(lot.expiry_date) : null
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
        return expiryDate && expiryDate <= thirtyDaysFromNow
      }) || []

    // Analyse des écarts (pour inventaire)
    const { data: inventories, error: inventoriesError } = await supabase
      .from("inventory_sessions")
      .select(`
        id,
        session_date,
        status,
        inventory_items (
          product_id,
          products (name, sku),
          theoretical_quantity,
          counted_quantity,
          variance,
          variance_value
        )
      `)
      .order("session_date", { ascending: false })
      .limit(5)

    if (inventoriesError) throw inventoriesError

    const lastInventory = inventories?.[0]
    const totalVariance =
      lastInventory?.inventory_items?.reduce((sum: number, item: any) => sum + Math.abs(item.variance || 0), 0) || 0
    const totalVarianceValue =
      lastInventory?.inventory_items?.reduce(
        (sum: number, item: any) => sum + Math.abs(Number(item.variance_value) || 0),
        0,
      ) || 0

    return NextResponse.json({
      summary: {
        total_products: totalProducts,
        total_stock_value_purchase: totalStockValue,
        total_stock_value_sale: totalSaleValue,
        potential_margin: totalSaleValue - totalStockValue,
        products_below_threshold: shortages.length,
        products_out_of_stock: outOfStock.length,
        active_lots: lots?.filter((l) => l.status === "active").length || 0,
        lots_to_settle: lotsToSettle.length,
      },
      shortages: shortages.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: (p.product_categories as any)?.name,
        current_stock: p.stock_quantity,
        min_level: p.min_stock_level,
        shortage: p.min_stock_level - p.stock_quantity,
      })),
      movements_summary: movementsByType,
      lots_alerts: lotsToSettle.map((lot) => ({
        lot_number: lot.lot_number,
        product: (lot.products as any)?.name,
        current_quantity: lot.current_quantity,
        expiry_date: lot.expiry_date,
        customs_declaration: lot.customs_declaration,
        status: lot.status,
      })),
      last_inventory: lastInventory
        ? {
            date: lastInventory.session_date,
            status: lastInventory.status,
            total_variance_quantity: totalVariance,
            total_variance_value: totalVarianceValue,
          }
        : null,
      recent_movements: movements?.slice(0, 20),
      products_detail: products,
    })
  } catch (error) {
    console.error("Error generating stock report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
