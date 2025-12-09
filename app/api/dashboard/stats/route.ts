import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Statistiques du dashboard (CA du jour, tickets du jour, etc.)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Date par défaut: aujourd'hui
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    // Définir les bornes de la journée
    const startDate = `${date}T00:00:00.000Z`
    const endDate = `${date}T23:59:59.999Z`

    // 1. CA du jour (Chiffre d'affaires)
    const { data: todaySales, error: salesError } = await supabase
      .from("sales")
      .select("total_ttc, tax_amount, discount_amount")
      .gte("sale_date", startDate)
      .lte("sale_date", endDate)
      .eq("status", "completed")

    if (salesError) {
      console.error("Error fetching today's sales:", salesError)
      throw salesError
    }

    const todayRevenue = todaySales?.reduce((sum, sale) => sum + Number(sale.total_ttc || 0), 0) || 0
    const todayRevenueTax = todaySales?.reduce((sum, sale) => sum + Number(sale.tax_amount || 0), 0) || 0
    const todayRevenueHT = todayRevenue - todayRevenueTax
    const todayDiscount = todaySales?.reduce((sum, sale) => sum + Number(sale.discount_amount || 0), 0) || 0

    // 2. Tickets du jour
    const todayTickets = todaySales?.length || 0

    // 3. Ticket moyen du jour
    const averageTicket = todayTickets > 0 ? todayRevenue / todayTickets : 0

    // 4. Comparaison avec hier pour CA et tickets
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = yesterday.toISOString().split("T")[0]
    const yesterdayStart = `${yesterdayDate}T00:00:00.000Z`
    const yesterdayEnd = `${yesterdayDate}T23:59:59.999Z`

    const { data: yesterdaySales } = await supabase
      .from("sales")
      .select("total_ttc")
      .gte("sale_date", yesterdayStart)
      .lte("sale_date", yesterdayEnd)
      .eq("status", "completed")

    const yesterdayRevenue = yesterdaySales?.reduce((sum, sale) => sum + Number(sale.total_ttc || 0), 0) || 0
    const yesterdayTickets = yesterdaySales?.length || 0

    const revenueGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
    const ticketsGrowth = yesterdayTickets > 0 ? ((todayTickets - yesterdayTickets) / yesterdayTickets) * 100 : 0

    // 5. Nombre de sessions de caisse actives
    const { data: activeSessions, error: sessionsError } = await supabase
      .from("cash_sessions")
      .select("id")
      .eq("status", "open")
      .gte("opened_at", startDate)

    if (sessionsError) {
      console.error("Error fetching active sessions:", sessionsError)
    }

    const activeSessionsCount = activeSessions?.length || 0

    // 6. Produits les plus vendus du jour
    const { data: topProducts, error: productsError } = await supabase
      .from("sale_lines")
      .select(`
        product_id,
        quantity,
        line_total,
        products (
          id,
          code,
          name_fr,
          name_en
        )
      `)
      .gte("created_at", startDate)
      .lte("created_at", endDate)

    if (productsError) {
      console.error("Error fetching top products:", productsError)
    }

    const productAggregates: Record<string, {
      product_id: string,
      name: string,
      code: string,
      quantity: number,
      revenue: number
    }> = {}

    topProducts?.forEach((item: any) => {
      const productId = item.product_id
      if (!productAggregates[productId]) {
        productAggregates[productId] = {
          product_id: productId,
          name: item.products?.name_fr || "Inconnu",
          code: item.products?.code || "",
          quantity: 0,
          revenue: 0
        }
      }
      productAggregates[productId].quantity += item.quantity || 0
      productAggregates[productId].revenue += Number(item.line_total || 0)
    })

    const topProductsByQuantity = Object.values(productAggregates)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    const topProductsByRevenue = Object.values(productAggregates)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // 7. Répartition par méthode de paiement
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        amount,
        payment_method_id,
        payment_methods (
          code,
          name
        )
      `)
      .gte("created_at", startDate)
      .lte("created_at", endDate)

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError)
    }

    const paymentBreakdown: Record<string, { method: string, amount: number, count: number }> = {}
    payments?.forEach((payment: any) => {
      const methodName = payment.payment_methods?.name || "Inconnu"
      if (!paymentBreakdown[methodName]) {
        paymentBreakdown[methodName] = { method: methodName, amount: 0, count: 0 }
      }
      paymentBreakdown[methodName].amount += Number(payment.amount || 0)
      paymentBreakdown[methodName].count++
    })

    return NextResponse.json({
      date,
      revenue: {
        today_ttc: todayRevenue,
        today_ht: todayRevenueHT,
        today_tax: todayRevenueTax,
        yesterday_ttc: yesterdayRevenue,
        growth_percent: revenueGrowth,
      },
      tickets: {
        today: todayTickets,
        yesterday: yesterdayTickets,
        growth_percent: ticketsGrowth,
        average_amount: averageTicket,
      },
      discount: {
        today: todayDiscount,
      },
      active_sessions: activeSessionsCount,
      top_products: {
        by_quantity: topProductsByQuantity,
        by_revenue: topProductsByRevenue,
      },
      payment_methods: Object.values(paymentBreakdown),
    })
  } catch (error) {
    console.error("Error generating dashboard stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
