import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/reports/products - Rapport des produits les plus vendus
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams

  // Paramètres de filtrage
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const limit = parseInt(searchParams.get("limit") || "10", 10)

  try {
    // Requête pour obtenir les produits vendus avec agrégation
    let query = supabase
      .from("sale_lines")
      .select(`
        product_id,
        quantity,
        line_total,
        products (
          id,
          name_fr,
          barcode,
          category_id,
          product_categories (name_fr)
        ),
        sales!inner (
          sale_date,
          status
        )
      `)
      .eq("sales.status", "completed")

    // Filtres de date
    if (startDate) {
      query = query.gte("sales.sale_date", startDate)
    }
    if (endDate) {
      query = query.lte("sales.sale_date", endDate)
    }

    const { data: saleItems, error } = await query

    if (error) throw error

    // Agrégation des données par produit
    const productMap: Record<
      string,
      {
        product_id: string
        product_name: string
        barcode: string | null
        category: string
        quantity_sold: number
        total_revenue: number
      }
    > = {}

    saleItems?.forEach((item: any) => {
      const productId = item.product_id
      const productName = item.products?.name_fr || "Produit inconnu"
      const barcode = item.products?.barcode || null
      const category = item.products?.product_categories?.name_fr || "Non catégorisé"

      if (!productMap[productId]) {
        productMap[productId] = {
          product_id: productId,
          product_name: productName,
          barcode,
          category,
          quantity_sold: 0,
          total_revenue: 0,
        }
      }

      productMap[productId].quantity_sold += item.quantity
      productMap[productId].total_revenue += Number(item.line_total)
    })

    // Convertir en tableau et trier par revenu total
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit)

    return NextResponse.json(topProducts)
  } catch (error) {
    console.error("Error generating products report:", error)
    return NextResponse.json({ error: "Failed to generate products report" }, { status: 500 })
  }
}
