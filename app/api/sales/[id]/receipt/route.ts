import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Générer les données du ticket de caisse
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Récupérer la vente complète
    const { data: sale, error } = await supabase
      .from("sales")
      .select(`
        *,
        seller:users(id, first_name, last_name, employee_id),
        point_of_sale:point_of_sales(id, code, name, location),
        lines:sale_lines(
          *,
          product:products(id, code, name_fr, name_en)
        ),
        payments:payments(
          *,
          payment_method:payment_methods(code, name)
        )
      `)
      .eq("id", id)
      .single()

    if (error || !sale) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 })
    }

    // Récupérer les infos de l'entreprise
    const { data: company } = await supabase.from("company_info").select("*").limit(1).single()

    // Récupérer le message promotionnel actif
    const { data: promoMessage } = await supabase
      .from("receipt_messages")
      .select("message_fr, message_en")
      .eq("message_type", "promotional")
      .eq("is_active", true)
      .lte("start_date", new Date().toISOString().split("T")[0])
      .gte("end_date", new Date().toISOString().split("T")[0])
      .limit(1)
      .single()

    // Formater le ticket
    const receipt = {
      // En-tête
      company: {
        name: company?.name || "Duty Free Ouagadougou",
        legal_name: company?.legal_name,
        tax_id: company?.tax_id,
        address: company?.address,
        phone: company?.phone,
        logo_url: company?.logo_url,
      },
      point_of_sale: sale.point_of_sale,

      // Informations ticket
      ticket_number: sale.ticket_number,
      date: sale.sale_date,
      seller: sale.seller ? `${sale.seller.first_name} ${sale.seller.last_name}` : null,
      seller_id: sale.seller?.employee_id,

      // Client/Passager
      customer: sale.customer_name
        ? {
            name: sale.customer_name,
            flight: sale.flight_reference,
            airline: sale.airline,
            destination: sale.destination,
          }
        : null,

      // Messages
      header_message: sale.header_message || promoMessage?.message_fr || "Bienvenue!",
      header_message_en: promoMessage?.message_en || "Welcome!",

      // Lignes de produits
      lines: sale.lines.map(
        (line: {
          quantity: number
          unit_price: number
          discount_amount: number
          tax_rate: number
          tax_amount: number
          line_total: number
          product: {
            code: string
            name_fr: string
            name_en: string
          }
        }) => ({
          code: line.product.code,
          name_fr: line.product.name_fr,
          name_en: line.product.name_en,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount: line.discount_amount,
          tax_rate: line.tax_rate,
          tax_amount: line.tax_amount,
          total: line.line_total,
        }),
      ),

      // Totaux
      subtotal: sale.subtotal,
      discount: sale.discount_amount,
      discount_type: sale.discount_type,
      tax_amount: sale.tax_amount,
      total_ht: sale.total_ht,
      total_ttc: sale.total_ttc,
      currency: sale.currency_code,

      // Paiements
      payments: sale.payments.map(
        (p: {
          amount: number
          currency_code: string
          payment_method: { name: string }
        }) => ({
          method: p.payment_method.name,
          amount: p.amount,
          currency: p.currency_code,
        }),
      ),

      // Pied de page
      footer_message:
        sale.footer_message ||
        "Merci de votre visite et bon voyage! / Thank you for your visit and have a safe flight!",
    }

    return NextResponse.json({ data: receipt })
  } catch (error) {
    console.error("Error generating receipt:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
