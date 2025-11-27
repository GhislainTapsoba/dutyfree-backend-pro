import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Produits en stock bas
export async function GET() {
  try {
    const supabase = await createClient()

    // Récupérer tous les produits actifs
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        *,
        category:product_categories(id, code, name_fr, name_en),
        supplier:suppliers(id, code, name)
      `)
      .eq("is_active", true)
      .order("name_fr", { ascending: true })

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Récupérer le stock actuel pour chaque produit
    const productIds = products.map((p) => p.id)

    const { data: stockData } = await supabase
      .from("product_lots")
      .select("product_id, current_quantity")
      .in("product_id", productIds)
      .eq("status", "available")

    // Calculer le stock par produit
    const stockByProduct: Record<string, number> = {}
    stockData?.forEach((lot) => {
      stockByProduct[lot.product_id] = (stockByProduct[lot.product_id] || 0) + lot.current_quantity
    })

    // Filtrer les produits en stock bas
    const lowStockProducts = products
      .map((product) => ({
        ...product,
        current_stock: stockByProduct[product.id] || 0,
      }))
      .filter((p) => p.current_stock <= p.min_stock_level)
      .sort((a, b) => a.current_stock - b.current_stock) // Trier par stock croissant

    return NextResponse.json({ data: lowStockProducts })
  } catch (error) {
    console.error("Error fetching low stock products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
