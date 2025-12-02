import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/reports/kpi - KPIs et indicateurs de performance
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams

  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const passengerCount = searchParams.get("passenger_count") // Donnée externe aéroport

  try {
    // Ventes sur la période
    let salesQuery = supabase.from("sales").select("id, total_ttc, sale_date, status").eq("status", "completed")

    if (startDate) {
      salesQuery = salesQuery.gte("sale_date", startDate)
    }
    if (endDate) {
      salesQuery = salesQuery.lte("sale_date", endDate)
    }

    const { data: sales, error: salesError } = await salesQuery
    if (salesError) throw salesError

    const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total_ttc), 0) || 0
    const ticketCount = sales?.length || 0
    const averageTicket = ticketCount > 0 ? totalRevenue / ticketCount : 0

    // Taux de capture (si nombre de passagers fourni)
    const passengers = passengerCount ? Number.parseInt(passengerCount) : null
    const captureRate = passengers && passengers > 0 ? (ticketCount / passengers) * 100 : null
    const revenuePerPassenger = passengers && passengers > 0 ? totalRevenue / passengers : null

    // Comparaison avec période précédente
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      const prevStart = new Date(start)
      prevStart.setDate(prevStart.getDate() - periodDays)
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)

      const { data: prevSales } = await supabase
        .from("sales")
        .select("id, total_ttc")
        .eq("status", "completed")
        .gte("sale_date", prevStart.toISOString())
        .lte("sale_date", prevEnd.toISOString())

      const prevRevenue = prevSales?.reduce((sum, s) => sum + Number(s.total_ttc), 0) || 0
      const prevTickets = prevSales?.length || 0

      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
      const ticketGrowth = prevTickets > 0 ? ((ticketCount - prevTickets) / prevTickets) * 100 : 0

      // Top produits
      const { data: topProducts } = await supabase
        .from("sale_lines")
        .select(`
          product_id,
          products (name_fr, code),
          quantity,
          line_total
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)

      const productAggregates: Record<string, { name: string; quantity: number; revenue: number }> = {}
      topProducts?.forEach((item: any) => {
        const productName = item.products?.name_fr || "Inconnu"
        if (!productAggregates[productName]) {
          productAggregates[productName] = { name: productName, quantity: 0, revenue: 0 }
        }
        productAggregates[productName].quantity += item.quantity
        productAggregates[productName].revenue += Number(item.line_total)
      })

      const topByRevenue = Object.values(productAggregates)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      const topByQuantity = Object.values(productAggregates)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      return NextResponse.json({
        kpis: {
          total_revenue: totalRevenue,
          ticket_count: ticketCount,
          average_ticket: averageTicket,
          capture_rate: captureRate,
          revenue_per_passenger: revenuePerPassenger,
          passenger_count: passengers,
        },
        comparison: {
          previous_period: {
            revenue: prevRevenue,
            tickets: prevTickets,
          },
          growth: {
            revenue_percent: revenueGrowth,
            tickets_percent: ticketGrowth,
          },
        },
        top_products: {
          by_revenue: topByRevenue,
          by_quantity: topByQuantity,
        },
        period: { start: startDate, end: endDate, days: periodDays },
      })
    }

    return NextResponse.json({
      kpis: {
        total_revenue: totalRevenue,
        ticket_count: ticketCount,
        average_ticket: averageTicket,
        capture_rate: captureRate,
        revenue_per_passenger: revenuePerPassenger,
        passenger_count: passengers,
      },
      period: { start: startDate, end: endDate },
    })
  } catch (error) {
    console.error("Error generating KPI report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
