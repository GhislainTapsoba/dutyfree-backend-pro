import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - État des stocks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const pointOfSaleId = searchParams.get("pos_id")
    const productId = searchParams.get("product_id")
    const status = searchParams.get("status")
    const lowStock = searchParams.get("low_stock") === "true"

    let query = supabase.from("product_lots").select(`
        *,
        product:products(id, code, name_fr, name_en, min_stock_level, category_id),
        storage_location:storage_locations(id, code, name, point_of_sale_id),
        customs_ledger:customs_ledgers(id, ledger_number, status)
      `)

    if (productId) {
      query = query.eq("product_id", productId)
    }

    if (status) {
      query = query.eq("status", status)
    } else {
      query = query.eq("status", "available")
    }

    if (pointOfSaleId) {
      query = query.eq("storage_location.point_of_sale_id", pointOfSaleId)
    }

    const { data: lots, error } = await query.order("received_date", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Agréger par produit
    const stockByProduct: Record<
      string,
      {
        product: unknown
        total_quantity: number
        lots: unknown[]
      }
    > = {}

    lots?.forEach((lot) => {
      const pid = lot.product_id
      if (!stockByProduct[pid]) {
        stockByProduct[pid] = {
          product: lot.product,
          total_quantity: 0,
          lots: [],
        }
      }
      stockByProduct[pid].total_quantity += lot.current_quantity
      stockByProduct[pid].lots.push(lot)
    })

    let result = Object.values(stockByProduct)

    // Filtrer par stock bas
    if (lowStock) {
      result = result.filter((item) => {
        const minLevel = (item.product as { min_stock_level: number })?.min_stock_level || 5
        return item.total_quantity <= minLevel
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching stock:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
