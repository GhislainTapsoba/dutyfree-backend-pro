import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/reports/export - Export des données en CSV/Excel
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams

  const reportType = searchParams.get("type") || "sales" // sales, stock, payments
  const format = searchParams.get("format") || "csv" // csv, json
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  try {
    let data: any[] = []
    let headers: string[] = []

    switch (reportType) {
      case "sales":
        const { data: sales } = await supabase
          .from("sales")
          .select(`
            ticket_number,
            sale_date,
            total_ttc,
            tax_amount,
            discount_amount,
            currency_code,
            status,
            seller:users!seller_id(first_name, last_name),
            cash_register:cash_registers(name),
            point_of_sale:point_of_sales(name)
          `)
          .gte("sale_date", startDate || "1900-01-01")
          .lte("sale_date", endDate || "2100-12-31")
          .order("sale_date", { ascending: false })

        headers = [
          "Ticket",
          "Date",
          "Montant TTC",
          "TVA",
          "Remise",
          "Devise",
          "Statut",
          "Caissier",
          "Caisse",
          "Point de vente",
        ]
        data =
          sales?.map((s) => {
            const date = new Date(s.sale_date)
            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
            return {
              ticket: s.ticket_number,
              date: dateStr,
              amount: s.total_ttc,
              tax: s.tax_amount,
              discount: s.discount_amount,
              currency: s.currency_code,
              status: s.status,
              cashier: s.seller ? `${s.seller.first_name} ${s.seller.last_name}` : '',
              register: s.cash_register?.name || '',
              pos: s.point_of_sale?.name || '',
            }
          }) || []
        break

      case "stock":
        const { data: products } = await supabase
          .from("products")
          .select(`
            code,
            barcode,
            name_fr,
            min_stock_level,
            purchase_price,
            selling_price_xof,
            selling_price_eur,
            selling_price_usd,
            category:product_categories(name_fr)
          `)
          .eq("is_active", true)
          .order("name_fr")

        headers = [
          "Code",
          "Code-barres",
          "Produit",
          "Seuil min",
          "Prix achat",
          "Prix XOF",
          "Prix EUR",
          "Prix USD",
          "Catégorie",
        ]
        data =
          products?.map((p) => ({
            code: p.code,
            barcode: p.barcode || '',
            name: p.name_fr,
            min_level: p.min_stock_level,
            purchase_price: p.purchase_price || 0,
            price_xof: p.selling_price_xof,
            price_eur: p.selling_price_eur || 0,
            price_usd: p.selling_price_usd || 0,
            category: p.category?.name_fr || '',
          })) || []
        break

      case "payments":
        const { data: payments } = await supabase
          .from("payments")
          .select(`
            sale:sales(ticket_number, sale_date, seller:users!seller_id(first_name, last_name)),
            payment_methods(name),
            amount,
            currency_code,
            exchange_rate,
            amount_in_base_currency,
            created_at
          `)
          .gte("created_at", startDate || "1900-01-01")
          .lte("created_at", endDate || "2100-12-31")
          .order("created_at", { ascending: false })

        headers = [
          "Ticket",
          "Date",
          "Méthode",
          "Montant",
          "Devise",
          "Taux change",
          "Montant base",
          "Caissier",
        ]
        data =
          payments?.map((p) => {
            const date = new Date(p.created_at)
            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
            return {
              ticket: p.sale?.ticket_number || '',
              date: dateStr,
              method: p.payment_methods?.name || '',
              amount: p.amount,
              currency: p.currency_code,
              exchange_rate: p.exchange_rate,
              base_amount: p.amount_in_base_currency,
              cashier: p.sale?.seller ? `${p.sale.seller.first_name} ${p.sale.seller.last_name}` : '',
            }
          }) || []
        break
    }

    if (format === "csv") {
      // Générer CSV avec BOM UTF-8 pour Excel
      const csvRows = [headers.join(",")]
      data.forEach((row) => {
        csvRows.push(
          Object.values(row)
            .map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
            .join(","),
        )
      })
      const csv = "\uFEFF" + csvRows.join("\r\n") // BOM UTF-8 + CRLF pour Windows

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${reportType}_export_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({ headers, data, count: data.length })
  } catch (error) {
    console.error("Error exporting report:", error)
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 })
  }
}
