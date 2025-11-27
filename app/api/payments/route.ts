import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste/Journal des paiements
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const saleId = searchParams.get("sale_id")
    const sessionId = searchParams.get("session_id")
    const methodId = searchParams.get("method_id")
    const currencyCode = searchParams.get("currency")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const status = searchParams.get("status")

    const offset = (page - 1) * limit

    let query = supabase.from("payments").select(
      `
        *,
        sale:sales(id, ticket_number, total_ttc),
        payment_method:payment_methods(id, code, name, type),
        cash_session:cash_sessions(id, session_number)
      `,
      { count: "exact" },
    )

    if (saleId) {
      query = query.eq("sale_id", saleId)
    }

    if (sessionId) {
      query = query.eq("cash_session_id", sessionId)
    }

    if (methodId) {
      query = query.eq("payment_method_id", methodId)
    }

    if (currencyCode) {
      query = query.eq("currency_code", currencyCode)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (startDate) {
      query = query.gte("created_at", startDate)
    }

    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59`)
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculer les totaux par devise
    const totals: Record<string, number> = {}
    data?.forEach((payment) => {
      if (payment.status === "completed") {
        totals[payment.currency_code] = (totals[payment.currency_code] || 0) + payment.amount
      }
    })

    return NextResponse.json({
      data,
      totals,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Ajouter un paiement à une vente existante
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const {
      sale_id,
      payment_method_id,
      amount,
      currency_code,
      card_last_digits,
      authorization_code,
      tpe_reference,
      mobile_number,
      transaction_reference,
    } = body

    if (!sale_id || !payment_method_id || !amount || !currency_code) {
      return NextResponse.json(
        { error: "Champs obligatoires: sale_id, payment_method_id, amount, currency_code" },
        { status: 400 },
      )
    }

    // Récupérer la vente
    const { data: sale } = await supabase
      .from("sales")
      .select("id, total_ttc, cash_session_id, status")
      .eq("id", sale_id)
      .single()

    if (!sale) {
      return NextResponse.json({ error: "Vente non trouvée" }, { status: 404 })
    }

    if (sale.status === "cancelled" || sale.status === "refunded") {
      return NextResponse.json({ error: "Cette vente ne peut plus recevoir de paiements" }, { status: 400 })
    }

    // Récupérer le taux de change
    let exchangeRate = 1
    if (currency_code !== "XOF") {
      const { data: currency } = await supabase
        .from("currencies")
        .select("exchange_rate")
        .eq("code", currency_code)
        .single()

      exchangeRate = currency?.exchange_rate || 1
    }

    const amountInBase = amount * exchangeRate

    // Créer le paiement
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        sale_id,
        cash_session_id: sale.cash_session_id,
        payment_method_id,
        amount,
        currency_code,
        exchange_rate: exchangeRate,
        amount_in_base_currency: amountInBase,
        card_last_digits,
        authorization_code,
        tpe_reference,
        mobile_number,
        transaction_reference,
        status: "completed",
      })
      .select(`
        *,
        payment_method:payment_methods(id, code, name)
      `)
      .single()

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 })
    }

    // Vérifier si la vente est entièrement payée
    const { data: allPayments } = await supabase
      .from("payments")
      .select("amount_in_base_currency")
      .eq("sale_id", sale_id)
      .eq("status", "completed")

    const totalPaid = allPayments?.reduce((sum, p) => sum + p.amount_in_base_currency, 0) || 0

    if (totalPaid >= sale.total_ttc) {
      await supabase
        .from("sales")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", sale_id)
    }

    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
