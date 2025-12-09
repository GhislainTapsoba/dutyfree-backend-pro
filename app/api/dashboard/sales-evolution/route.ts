import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Evolution des ventes sur une période donnée
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Paramètres
    const period = searchParams.get("period") || "7days" // 7days, 30days, 90days, year
    const groupBy = searchParams.get("group_by") || "day" // day, week, month

    // Calculer la date de début en fonction de la période
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case "7days":
        startDate.setDate(endDate.getDate() - 7)
        break
      case "30days":
        startDate.setDate(endDate.getDate() - 30)
        break
      case "90days":
        startDate.setDate(endDate.getDate() - 90)
        break
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    // Récupérer toutes les ventes sur la période
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("sale_date, total_ttc, status")
      .gte("sale_date", startDate.toISOString())
      .lte("sale_date", endDate.toISOString())
      .eq("status", "completed")
      .order("sale_date", { ascending: true })

    if (salesError) {
      console.error("Error fetching sales evolution:", salesError)
      throw salesError
    }

    // Grouper les ventes selon le paramètre group_by
    const groupedSales: Record<string, { date: string; revenue: number; tickets: number }> = {}

    sales?.forEach((sale) => {
      const saleDate = new Date(sale.sale_date)
      let key: string

      if (groupBy === "day") {
        key = saleDate.toISOString().split("T")[0]
      } else if (groupBy === "week") {
        // Début de la semaine (dimanche)
        const weekStart = new Date(saleDate)
        weekStart.setDate(saleDate.getDate() - saleDate.getDay())
        key = weekStart.toISOString().split("T")[0]
      } else if (groupBy === "month") {
        key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`
      } else {
        key = saleDate.toISOString().split("T")[0]
      }

      if (!groupedSales[key]) {
        groupedSales[key] = { date: key, revenue: 0, tickets: 0 }
      }

      groupedSales[key].revenue += Number(sale.total_ttc || 0)
      groupedSales[key].tickets += 1
    })

    // Convertir en tableau et trier par date
    const evolution = Object.values(groupedSales).sort((a, b) => a.date.localeCompare(b.date))

    // Calculer les statistiques globales
    const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.total_ttc || 0), 0) || 0
    const totalTickets = sales?.length || 0
    const averageTicket = totalTickets > 0 ? totalRevenue / totalTickets : 0

    // Calculer la tendance (croissance moyenne)
    let trend = 0
    if (evolution.length > 1) {
      const firstPeriod = evolution[0].revenue
      const lastPeriod = evolution[evolution.length - 1].revenue
      trend = firstPeriod > 0 ? ((lastPeriod - firstPeriod) / firstPeriod) * 100 : 0
    }

    // Trouver le meilleur et le pire jour
    const bestDay = evolution.reduce(
      (max, current) => (current.revenue > max.revenue ? current : max),
      evolution[0] || { date: "", revenue: 0, tickets: 0 }
    )

    const worstDay = evolution.reduce(
      (min, current) => (current.revenue < min.revenue ? current : min),
      evolution[0] || { date: "", revenue: 0, tickets: 0 }
    )

    return NextResponse.json({
      period: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        type: period,
        group_by: groupBy,
      },
      summary: {
        total_revenue: totalRevenue,
        total_tickets: totalTickets,
        average_ticket: averageTicket,
        trend_percent: trend,
      },
      highlights: {
        best_day: bestDay,
        worst_day: worstDay,
      },
      evolution,
    })
  } catch (error) {
    console.error("Error generating sales evolution:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
