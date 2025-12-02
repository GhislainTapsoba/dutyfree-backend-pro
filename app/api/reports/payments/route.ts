import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/reports/payments - Rapport des paiements par mode et devise
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams

  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const cashierId = searchParams.get("cashier_id")
  const paymentMethod = searchParams.get("payment_method")

  try {
    let query = supabase
      .from("payments")
      .select(`
        id,
        sale_id,
        payment_method_id,
        payment_methods (name, code),
        amount,
        currency_code,
        exchange_rate,
        amount_in_base_currency,
        created_at,
        sale:sales (
          ticket_number,
          sale_date,
          seller_id,
          seller:users!sales_seller_id_fkey (full_name, employee_id),
          cash_session_id,
          cash_sessions (
            cash_register_id,
            cash_registers (name, point_of_sales (name))
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }
    if (paymentMethod) {
      query = query.eq("payment_method_id", paymentMethod)
    }

    const { data: payments, error } = await query
    if (error) throw error

    // Total par méthode de paiement
    const byMethod: Record<string, { count: number; amount: number; amount_base: number }> = {}
    payments?.forEach((p: any) => {
      const method = p.payment_methods?.name || "Inconnu"
      if (!byMethod[method]) {
        byMethod[method] = { count: 0, amount: 0, amount_base: 0 }
      }
      byMethod[method].count++
      byMethod[method].amount += Number(p.amount)
      byMethod[method].amount_base += Number(p.amount_in_base_currency)
    })

    // Total par devise
    const byCurrency: Record<string, { count: number; amount: number }> = {}
    payments?.forEach((p) => {
      const currency = p.currency_code
      if (!byCurrency[currency]) {
        byCurrency[currency] = { count: 0, amount: 0 }
      }
      byCurrency[currency].count++
      byCurrency[currency].amount += Number(p.amount)
    })

    // Total par jour
    const byDay: Record<string, { count: number; amount: number }> = {}
    payments?.forEach((p) => {
      const day = new Date(p.created_at).toISOString().split("T")[0]
      if (!byDay[day]) {
        byDay[day] = { count: 0, amount: 0 }
      }
      byDay[day].count++
      byDay[day].amount += Number(p.amount_in_base_currency)
    })

    // Total par caissier
    const byCashier: Record<string, { count: number; amount: number }> = {}
    payments?.forEach((p: any) => {
      const cashierName = p.sale?.seller?.full_name || "Inconnu"
      if (!byCashier[cashierName]) {
        byCashier[cashierName] = { count: 0, amount: 0 }
      }
      byCashier[cashierName].count++
      byCashier[cashierName].amount += Number(p.amount_in_base_currency)
    })

    const totalAmount = payments?.reduce((sum, p) => sum + Number(p.amount_in_base_currency), 0) || 0
    const totalTransactions = payments?.length || 0

    return NextResponse.json({
      summary: {
        total_transactions: totalTransactions,
        total_amount_base_currency: totalAmount,
        average_transaction: totalTransactions > 0 ? totalAmount / totalTransactions : 0,
      },
      breakdown: {
        by_method: byMethod,
        by_currency: byCurrency,
        by_day: byDay,
        by_cashier: byCashier,
      },
      period: { start: startDate, end: endDate },
      transactions: payments,
    })
  } catch (error) {
    console.error("Error generating payments report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
