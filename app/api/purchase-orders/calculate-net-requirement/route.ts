import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

/**
 * POST - Calcul automatique du besoin net
 * Formule: Besoin Net = (Stock Min - Stock Actuel) + Prévisions Ventes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { product_id, forecast_days = 30 } = body

    if (!product_id) {
      return NextResponse.json({ error: "product_id requis" }, { status: 400 })
    }

    // 1. Récupérer les infos du produit
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, code, name_fr, min_stock_level, max_stock_level")
      .eq("id", product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 })
    }

    // 2. Calculer le stock actuel (somme des lots disponibles)
    const { data: lots } = await supabase
      .from("product_lots")
      .select("current_quantity")
      .eq("product_id", product_id)
      .in("status", ["available"])

    const currentStock = lots?.reduce((sum, lot) => sum + (lot.current_quantity || 0), 0) || 0

    // 3. Calculer les prévisions de ventes basées sur l'historique
    const forecastStartDate = new Date()
    forecastStartDate.setDate(forecastStartDate.getDate() - forecast_days)

    const { data: salesHistory } = await supabase
      .from("sale_items")
      .select(
        `
        quantity,
        sales!inner(sale_date)
      `
      )
      .eq("product_id", product_id)
      .gte("sales.sale_date", forecastStartDate.toISOString())

    const totalSoldInPeriod = salesHistory?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    const averageDailySales = totalSoldInPeriod / forecast_days
    const forecastedSales = Math.ceil(averageDailySales * forecast_days) // Prévoir pour X jours

    // 4. Vérifier les commandes en cours
    const { data: pendingOrders } = await supabase
      .from("purchase_order_lines")
      .select(
        `
        quantity,
        purchase_orders!inner(status)
      `
      )
      .eq("product_id", product_id)
      .in("purchase_orders.status", ["draft", "sent", "partial"])

    const quantityInTransit =
      pendingOrders?.reduce((sum, line) => sum + (line.quantity || 0), 0) || 0

    // 5. CALCUL DU BESOIN NET
    // Formule: Besoin Net = (Stock Min - Stock Actuel - En transit) + Prévisions
    const stockDeficit = Math.max(0, product.min_stock_level - currentStock - quantityInTransit)
    const netRequirement = stockDeficit + forecastedSales

    // 6. Calculer la quantité recommandée (jusqu'au stock max)
    const recommendedQuantity = Math.max(
      netRequirement,
      product.max_stock_level - currentStock - quantityInTransit
    )

    return NextResponse.json({
      data: {
        product: {
          id: product.id,
          code: product.code,
          name: product.name_fr,
        },
        stock: {
          current: currentStock,
          min: product.min_stock_level,
          max: product.max_stock_level,
          in_transit: quantityInTransit,
        },
        forecast: {
          period_days: forecast_days,
          total_sold_in_period: totalSoldInPeriod,
          average_daily_sales: Math.round(averageDailySales * 100) / 100,
          forecasted_sales: forecastedSales,
        },
        calculation: {
          stock_deficit: stockDeficit,
          net_requirement: netRequirement,
          recommended_quantity: recommendedQuantity,
          urgency:
            currentStock < product.min_stock_level
              ? "critical"
              : currentStock < product.min_stock_level * 1.5
                ? "high"
                : netRequirement > 0
                  ? "medium"
                  : "low",
        },
        formula: {
          description:
            "Besoin Net = (Stock Min - Stock Actuel - En transit) + Prévisions Ventes",
          values: `(${product.min_stock_level} - ${currentStock} - ${quantityInTransit}) + ${forecastedSales} = ${netRequirement}`,
        },
      },
    })
  } catch (error) {
    console.error("Error calculating net requirement:", error)
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
  }
}
