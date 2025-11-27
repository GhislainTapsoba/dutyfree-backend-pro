import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail session avec statistiques
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Récupérer la session
    const { data: session, error } = await supabase
      .from("cash_sessions")
      .select(`
        *,
        cash_register:cash_registers(id, code, name, point_of_sale_id),
        user:users(id, first_name, last_name, employee_id)
      `)
      .eq("id", id)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 })
    }

    // Récupérer les statistiques de ventes pour cette session
    const { data: salesStats } = await supabase
      .from("sales")
      .select("id, total_ttc, status")
      .eq("cash_session_id", id)
      .eq("status", "completed")

    // Récupérer les paiements par méthode
    const { data: paymentsData } = await supabase
      .from("payments")
      .select(`
        amount_in_base_currency,
        payment_method:payment_methods(code, name)
      `)
      .eq("cash_session_id", id)
      .eq("status", "completed")

    // Agréger par méthode de paiement
    const paymentsByMethod: Record<string, { name: string; total: number; count: number }> = {}
    paymentsData?.forEach((payment) => {
      const method = Array.isArray(payment.payment_method) ? payment.payment_method[0] : payment.payment_method
      const code = method?.code || "unknown"
      const name = method?.name || "Inconnu"
      if (!paymentsByMethod[code]) {
        paymentsByMethod[code] = { name, total: 0, count: 0 }
      }
      paymentsByMethod[code].total += payment.amount_in_base_currency
      paymentsByMethod[code].count += 1
    })

    const totalSales = salesStats?.reduce((sum, s) => sum + s.total_ttc, 0) || 0
    const ticketCount = salesStats?.length || 0
    const cashPayments = paymentsByMethod["CASH"]?.total || 0

    return NextResponse.json({
      data: {
        ...session,
        stats: {
          total_sales: totalSales,
          ticket_count: ticketCount,
          average_ticket: ticketCount > 0 ? totalSales / ticketCount : 0,
          expected_cash: session.opening_cash + cashPayments,
          payments_by_method: Object.entries(paymentsByMethod).map(([code, data]) => ({
            code,
            ...data,
          })),
        },
      },
    })
  } catch (error) {
    console.error("Error fetching cash session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Fermer une session de caisse
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { closing_cash, notes, status } = body

    // Récupérer la session actuelle
    const { data: currentSession } = await supabase.from("cash_sessions").select("*").eq("id", id).single()

    if (!currentSession) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 })
    }

    if (currentSession.status !== "open" && status === "closed") {
      return NextResponse.json({ error: "Session déjà fermée" }, { status: 400 })
    }

    // Calculer le montant espèces attendu
    const { data: cashPayments } = await supabase
      .from("payments")
      .select("amount_in_base_currency")
      .eq("cash_session_id", id)
      .eq("status", "completed")
      .eq(
        "payment_method_id",
        await supabase
          .from("payment_methods")
          .select("id")
          .eq("code", "CASH")
          .single()
          .then((r) => r.data?.id),
      )

    const totalCash = cashPayments?.reduce((sum, p) => sum + p.amount_in_base_currency, 0) || 0
    const expectedCash = currentSession.opening_cash + totalCash
    const variance = closing_cash !== undefined ? closing_cash - expectedCash : null

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status === "closed") {
      updateData.status = "closed"
      updateData.closing_time = new Date().toISOString()
      updateData.closing_cash = closing_cash
      updateData.expected_cash = expectedCash
      updateData.cash_variance = variance
    }

    if (status === "validated") {
      updateData.status = "validated"
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data, error } = await supabase.from("cash_sessions").update(updateData).eq("id", id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: status === "closed" ? "close_session" : "validate_session",
      entity_type: "cash_session",
      entity_id: id,
      details: { closing_cash, variance },
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating cash session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
