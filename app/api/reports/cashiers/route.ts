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
    // Récupérer les sessions de caisse
    let sessionsQuery = supabase
      .from("cash_sessions")
      .select(`
        id,
        user_id,
        users (full_name, employee_id),
        cash_register_id,
        cash_registers (name, point_of_sales (name)),
        opening_time,
        closing_time,
        opening_cash,
        closing_cash,
        expected_cash,
        cash_variance,
        status,
        sales (
          id,
          total_ttc,
          tax_amount,
          discount_amount,
          payments (payment_method, amount, currency_code)
        )
      `)
      .order("opening_time", { ascending: false })

    if (startDate) {
      sessionsQuery = sessionsQuery.gte("opening_time", startDate)
    }
    if (endDate) {
      sessionsQuery = sessionsQuery.lte("opening_time", endDate)
    }
    if (cashierId) {
      sessionsQuery = sessionsQuery.eq("user_id", cashierId)
    }

    const { data: sessions, error } = await sessionsQuery
    if (error) throw error

    // Agréger par caissier
    const cashierStats: Record<
      string,
      {
        name: string
        employee_id: string
        sessions_count: number
        sales_count: number
        total_revenue: number
        total_variance: number
        average_ticket: number
        payment_methods: Record<string, number>
      }
    > = {}

    sessions?.forEach((session) => {
      const cashierName = (session.users as any)?.full_name || "Inconnu"
      const employeeId = (session.users as any)?.employee_id || ""

      if (!cashierStats[cashierName]) {
        cashierStats[cashierName] = {
          name: cashierName,
          employee_id: employeeId,
          sessions_count: 0,
          sales_count: 0,
          total_revenue: 0,
          total_variance: 0,
          average_ticket: 0,
          payment_methods: {},
        }
      }

      cashierStats[cashierName].sessions_count++
      cashierStats[cashierName].total_variance += Number(session.cash_variance) || 0

      session.sales?.forEach((sale: any) => {
        cashierStats[cashierName].sales_count++
        cashierStats[cashierName].total_revenue += Number(sale.total_ttc)

        sale.payments?.forEach((payment: any) => {
          const method = payment.payment_method
          cashierStats[cashierName].payment_methods[method] =
            (cashierStats[cashierName].payment_methods[method] || 0) + Number(payment.amount)
        })
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
        total_sessions: sessions?.length || 0,
        total_revenue: Object.values(cashierStats).reduce((sum, c) => sum + c.total_revenue, 0),
        total_variance: Object.values(cashierStats).reduce((sum, c) => sum + c.total_variance, 0),
      },
      cashiers: ranking,
      sessions_detail: sessions,
      period: { start: startDate, end: endDate },
    })
  } catch (error) {
    console.error("Error generating cashiers report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
