import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Ventes par plage de dates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const posId = searchParams.get("pos_id")
    const cashierId = searchParams.get("cashier_id")
    const status = searchParams.get("status") || "completed"

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Les paramètres startDate et endDate sont requis" },
        { status: 400 }
      )
    }

    let query = supabase
      .from("sales")
      .select(`
        *,
        seller:users(id, first_name, last_name, employee_id),
        cash_register:cash_registers(id, code, name),
        point_of_sale:point_of_sales(id, code, name),
        lines:sale_lines(
          *,
          product:products(id, code, name_fr, name_en)
        ),
        payments:payments(
          *,
          payment_method:payment_methods(code, name)
        )
      `)
      .gte("sale_date", startDate)
      .lte("sale_date", endDate)
      .eq("status", status)

    if (posId) {
      query = query.eq("point_of_sale_id", posId)
    }

    if (cashierId) {
      query = query.eq("seller_id", cashierId)
    }

    query = query.order("sale_date", { ascending: false })

    const { data: sales, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculer les statistiques
    const totalSales = sales?.length || 0
    const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.total_ttc || 0), 0) || 0
    const totalTax = sales?.reduce((sum, sale) => sum + Number(sale.tax_amount || 0), 0) || 0
    const totalDiscount = sales?.reduce((sum, sale) => sum + Number(sale.discount_amount || 0), 0) || 0
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    return NextResponse.json({
      data: sales,
      statistics: {
        total_sales: totalSales,
        total_revenue: totalRevenue,
        total_tax: totalTax,
        total_discount: totalDiscount,
        average_ticket: averageTicket,
      },
      period: {
        start_date: startDate,
        end_date: endDate,
      },
    })
  } catch (error) {
    console.error("Error fetching sales by date range:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
