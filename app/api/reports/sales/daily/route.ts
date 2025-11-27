import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Rapport des ventes quotidiennes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const date = searchParams.get("date")
    const posId = searchParams.get("pos_id")
    const cashierId = searchParams.get("cashier_id")

    if (!date) {
      return NextResponse.json(
        { error: "Le paramètre date est requis (format: YYYY-MM-DD)" },
        { status: 400 }
      )
    }

    // Définir les bornes de la journée
    const startDate = `${date}T00:00:00.000Z`
    const endDate = `${date}T23:59:59.999Z`

    let query = supabase
      .from("sales")
      .select(`
        *,
        seller:users(id, first_name, last_name, employee_id),
        cash_register:cash_registers(id, code, name),
        point_of_sale:point_of_sales(id, code, name),
        lines:sale_lines(
          *,
          product:products(
            id,
            code,
            name_fr,
            name_en,
            category:product_categories(id, code, name_fr, name_en)
          )
        ),
        payments:payments(
          *,
          payment_method:payment_methods(code, name)
        )
      `)
      .gte("sale_date", startDate)
      .lte("sale_date", endDate)
      .eq("status", "completed")

    if (posId) {
      query = query.eq("point_of_sale_id", posId)
    }

    if (cashierId) {
      query = query.eq("seller_id", cashierId)
    }

    query = query.order("sale_date", { ascending: true })

    const { data: sales, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculer les statistiques globales
    const totalSales = sales?.length || 0
    const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.total_ttc || 0), 0) || 0
    const totalTax = sales?.reduce((sum, sale) => sum + Number(sale.tax_amount || 0), 0) || 0
    const totalDiscount = sales?.reduce((sum, sale) => sum + Number(sale.discount_amount || 0), 0) || 0
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    // Répartition par méthode de paiement
    const paymentBreakdown: Record<string, { count: number; amount: number }> = {}
    sales?.forEach((sale) => {
      sale.payments?.forEach((payment: any) => {
        const method = payment.payment_method?.name || "Inconnu"
        if (!paymentBreakdown[method]) {
          paymentBreakdown[method] = { count: 0, amount: 0 }
        }
        paymentBreakdown[method].count++
        paymentBreakdown[method].amount += Number(payment.amount || 0)
      })
    })

    // Répartition par catégorie
    const categoryBreakdown: Record<string, { quantity: number; revenue: number }> = {}
    sales?.forEach((sale) => {
      sale.lines?.forEach((line: any) => {
        const categoryName = line.product?.category?.name_fr || "Non catégorisé"
        if (!categoryBreakdown[categoryName]) {
          categoryBreakdown[categoryName] = { quantity: 0, revenue: 0 }
        }
        categoryBreakdown[categoryName].quantity += line.quantity || 0
        categoryBreakdown[categoryName].revenue += Number(line.line_total || 0)
      })
    })

    // Répartition par caissier
    const cashierBreakdown: Record<string, { sales: number; revenue: number }> = {}
    sales?.forEach((sale) => {
      const cashierName = sale.seller
        ? `${(sale.seller as any).first_name} ${(sale.seller as any).last_name}`
        : "Inconnu"
      if (!cashierBreakdown[cashierName]) {
        cashierBreakdown[cashierName] = { sales: 0, revenue: 0 }
      }
      cashierBreakdown[cashierName].sales++
      cashierBreakdown[cashierName].revenue += Number(sale.total_ttc || 0)
    })

    // Répartition horaire
    const hourlyBreakdown: Record<string, { sales: number; revenue: number }> = {}
    sales?.forEach((sale) => {
      const hour = new Date(sale.sale_date).getHours()
      const hourKey = `${hour.toString().padStart(2, "0")}:00`
      if (!hourlyBreakdown[hourKey]) {
        hourlyBreakdown[hourKey] = { sales: 0, revenue: 0 }
      }
      hourlyBreakdown[hourKey].sales++
      hourlyBreakdown[hourKey].revenue += Number(sale.total_ttc || 0)
    })

    return NextResponse.json({
      summary: {
        date,
        total_sales: totalSales,
        total_revenue: totalRevenue,
        total_revenue_ht: totalRevenue - totalTax,
        total_tax: totalTax,
        total_discount: totalDiscount,
        average_ticket: averageTicket,
      },
      breakdown: {
        by_payment_method: paymentBreakdown,
        by_category: categoryBreakdown,
        by_cashier: cashierBreakdown,
        by_hour: hourlyBreakdown,
      },
      sales,
    })
  } catch (error) {
    console.error("Error generating daily sales report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
