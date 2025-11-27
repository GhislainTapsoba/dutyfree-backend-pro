import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/reports/export - Export des données en CSV/Excel
export async function GET(request: NextRequest) {
  const supabase = await createClient()
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
            total_amount,
            total_tax,
            discount_amount,
            currency_code,
            status,
            shift,
            users!sales_cashier_id_fkey (full_name),
            cash_sessions (cash_registers (name, point_of_sales (name)))
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
          "Vacation",
          "Caissier",
          "Caisse",
          "Point de vente",
        ]
        data =
          sales?.map((s) => ({
            ticket: s.ticket_number,
            date: s.sale_date,
            amount: s.total_amount,
            tax: s.total_tax,
            discount: s.discount_amount,
            currency: s.currency_code,
            status: s.status,
            shift: s.shift,
            cashier: (s.users as any)?.full_name,
            register: (s.cash_sessions as any)?.cash_registers?.name,
            pos: (s.cash_sessions as any)?.cash_registers?.point_of_sales?.name,
          })) || []
        break

      case "stock":
        const { data: products } = await supabase
          .from("products")
          .select(`
            sku,
            barcode,
            name,
            stock_quantity,
            min_stock_level,
            purchase_price,
            sale_price_xof,
            sale_price_eur,
            sale_price_usd,
            product_categories (name)
          `)
          .eq("is_active", true)
          .order("name")

        headers = [
          "SKU",
          "Code-barres",
          "Produit",
          "Stock",
          "Seuil min",
          "Prix achat",
          "Prix XOF",
          "Prix EUR",
          "Prix USD",
          "Catégorie",
        ]
        data =
          products?.map((p) => ({
            sku: p.sku,
            barcode: p.barcode,
            name: p.name,
            stock: p.stock_quantity,
            min_level: p.min_stock_level,
            purchase_price: p.purchase_price,
            price_xof: p.sale_price_xof,
            price_eur: p.sale_price_eur,
            price_usd: p.sale_price_usd,
            category: (p.product_categories as any)?.name,
          })) || []
        break

      case "payments":
        const { data: payments } = await supabase
          .from("payments")
          .select(`
            sales (ticket_number, sale_date, users!sales_cashier_id_fkey (full_name)),
            payment_method,
            amount,
            currency_code,
            exchange_rate,
            amount_in_base_currency,
            reference_number,
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
          "Référence",
          "Caissier",
        ]
        data =
          payments?.map((p) => ({
            ticket: (p.sales as any)?.ticket_number,
            date: p.created_at,
            method: p.payment_method,
            amount: p.amount,
            currency: p.currency_code,
            exchange_rate: p.exchange_rate,
            base_amount: p.amount_in_base_currency,
            reference: p.reference_number,
            cashier: (p.sales as any)?.users?.full_name,
          })) || []
        break
    }

    if (format === "csv") {
      // Générer CSV
      const csvRows = [headers.join(";")]
      data.forEach((row) => {
        csvRows.push(
          Object.values(row)
            .map((v) => `"${v || ""}"`)
            .join(";"),
        )
      })
      const csv = csvRows.join("\n")

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
