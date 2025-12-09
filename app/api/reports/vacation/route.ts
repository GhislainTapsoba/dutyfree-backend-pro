import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Rapport par vacation (matin/après-midi/nuit)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const vacationType = searchParams.get("vacation_type")
    const pointOfSaleId = searchParams.get("pos_id")

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "start_date et end_date requis" }, { status: 400 })
    }

    let query = supabase
      .from("cash_sessions")
      .select(`
        id,
        session_number,
        vacation_type,
        opening_time,
        closing_time,
        opening_cash,
        closing_cash,
        expected_cash,
        cash_variance,
        status,
        user:users(id, first_name, last_name, employee_id),
        cash_register:cash_registers(id, code, name, point_of_sale:point_of_sales(id, name))
      `)
      .gte("opening_time", startDate)
      .lte("opening_time", `${endDate}T23:59:59`)

    if (vacationType) {
      query = query.eq("vacation_type", vacationType)
    }

    const { data: sessions, error } = await query.order("opening_time", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sessionIds = sessions?.map(s => s.id) || []
    
    const { data: sales } = await supabase
      .from("sales")
      .select("id, cash_session_id, total_ttc, status")
      .in("cash_session_id", sessionIds)
      .eq("status", "completed")

    const { data: payments } = await supabase
      .from("payments")
      .select("cash_session_id, amount_in_base_currency, payment_method:payment_methods(code, name)")
      .in("cash_session_id", sessionIds)
      .eq("status", "completed")

    const salesBySession = new Map()
    const paymentsBySession = new Map()

    sales?.forEach(sale => {
      if (!salesBySession.has(sale.cash_session_id)) {
        salesBySession.set(sale.cash_session_id, { count: 0, total: 0 })
      }
      const stats = salesBySession.get(sale.cash_session_id)
      stats.count++
      stats.total += sale.total_ttc
    })

    payments?.forEach(payment => {
      if (!paymentsBySession.has(payment.cash_session_id)) {
        paymentsBySession.set(payment.cash_session_id, {})
      }
      const methods = paymentsBySession.get(payment.cash_session_id)
      const method = Array.isArray(payment.payment_method) ? payment.payment_method[0] : payment.payment_method
      const code = method?.code || "unknown"
      if (!methods[code]) {
        methods[code] = { name: method?.name || "Inconnu", total: 0 }
      }
      methods[code].total += payment.amount_in_base_currency
    })

    const enrichedSessions = sessions?.map(session => {
      const salesStats = salesBySession.get(session.id) || { count: 0, total: 0 }
      const paymentMethods = paymentsBySession.get(session.id) || {}

      return {
        ...session,
        stats: {
          ticket_count: salesStats.count,
          total_sales: salesStats.total,
          average_ticket: salesStats.count > 0 ? salesStats.total / salesStats.count : 0,
          payments_by_method: Object.entries(paymentMethods).map(([code, data]: [string, any]) => ({
            code,
            ...data,
          })),
        },
      }
    })

    const byVacation = {
      morning: { sessions: 0, tickets: 0, revenue: 0, variance: 0 },
      afternoon: { sessions: 0, tickets: 0, revenue: 0, variance: 0 },
      night: { sessions: 0, tickets: 0, revenue: 0, variance: 0 },
    }

    enrichedSessions?.forEach(session => {
      const type = session.vacation_type as keyof typeof byVacation
      if (byVacation[type]) {
        byVacation[type].sessions++
        byVacation[type].tickets += session.stats.ticket_count
        byVacation[type].revenue += session.stats.total_sales
        byVacation[type].variance += session.cash_variance || 0
      }
    })

    return NextResponse.json({
      data: {
        sessions: enrichedSessions,
        summary: byVacation,
        period: { start_date: startDate, end_date: endDate },
      },
    })
  } catch (error) {
    console.error("Error fetching vacation report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
