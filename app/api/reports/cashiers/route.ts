import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/reports/cashiers - Rapport par caissier
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams

  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const cashierId = searchParams.get("cashier_id")

  try {
    // Récupérer les ventes directement
    let salesQuery = supabase
      .from("sales")
      .select(`
        id,
        ticket_number,
        sale_date,
        total_ttc,
        tax_amount,
        discount_amount,
        seller_id,
        users!sales_seller_id_fkey (id, first_name, last_name, employee_id),
        payments (payment_method_id, amount, currency_code, payment_methods(code, name))
      `)
      .eq("status", "completed")
      .order("sale_date", { ascending: false })

    if (startDate) {
      salesQuery = salesQuery.gte("sale_date", startDate)
    }
    if (endDate) {
      salesQuery = salesQuery.lte("sale_date", `${endDate}T23:59:59`)
    }
    if (cashierId) {
      salesQuery = salesQuery.eq("seller_id", cashierId)
    }

    const { data: sales, error } = await salesQuery
    if (error) throw error

    // Compter les ventes sans caissier assigné
    const salesWithoutCashier = sales?.filter(sale => !sale.seller_id || !(sale.users as any)?.id) || []
    const totalSalesWithoutCashier = salesWithoutCashier.reduce((sum, sale) => sum + Number(sale.total_ttc), 0)

    // Agréger par caissier
    const cashierStats: Record<
      string,
      {
        id: string
        name: string
        employee_id: string
        sales_count: number
        total_revenue: number
        average_ticket: number
        payment_methods: Record<string, number>
      }
    > = {}

    sales?.forEach((sale) => {
      const user = sale.users as any
      const cashierId = user?.id || "unknown"
      const cashierName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Inconnu" : "Inconnu"
      const employeeId = user?.employee_id || ""

      if (!cashierStats[cashierId]) {
        cashierStats[cashierId] = {
          id: cashierId,
          name: cashierName,
          employee_id: employeeId,
          sales_count: 0,
          total_revenue: 0,
          average_ticket: 0,
          payment_methods: {},
        }
      }

      cashierStats[cashierId].sales_count++
      cashierStats[cashierId].total_revenue += Number(sale.total_ttc)

      sale.payments?.forEach((payment: any) => {
        const method = payment.payment_methods?.name || "Autre"
        cashierStats[cashierId].payment_methods[method] =
          (cashierStats[cashierId].payment_methods[method] || 0) + Number(payment.amount)
      })
    })

    // Calculer le ticket moyen
    Object.values(cashierStats).forEach((stat) => {
      stat.average_ticket = stat.sales_count > 0 ? stat.total_revenue / stat.sales_count : 0
    })

    // Classement des caissiers
    const ranking = Object.values(cashierStats).sort((a, b) => b.total_revenue - a.total_revenue)

    return NextResponse.json({
      summary: {
        total_cashiers: Object.keys(cashierStats).length,
        total_sales: sales?.length || 0,
        total_revenue: Object.values(cashierStats).reduce((sum, c) => sum + c.total_revenue, 0),
        sales_without_cashier: salesWithoutCashier.length,
        revenue_without_cashier: totalSalesWithoutCashier,
      },
      cashiers: ranking,
      period: { start: startDate, end: endDate },
      warnings: salesWithoutCashier.length > 0 ? [
        `${salesWithoutCashier.length} vente(s) sans caissier assigné pour un total de ${totalSalesWithoutCashier.toFixed(2)} XOF`
      ] : [],
    })
  } catch (error) {
    console.error("Error generating cashiers report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
