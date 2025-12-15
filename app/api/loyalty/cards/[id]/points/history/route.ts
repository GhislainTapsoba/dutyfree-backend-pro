import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser, checkUserRole } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// GET - Récupérer l'historique des transactions de points
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    // Vérifier le rôle (admin, supervisor ou cashier)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin", "supervisor", "cashier"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Rôle insuffisant. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()

    // Vérifier que la carte existe
    const { data: card, error: cardError } = await supabase
      .from("loyalty_cards")
      .select("id, card_number, customer_name")
      .eq("id", id)
      .single()

    if (cardError || !card) {
      return NextResponse.json({ error: "Carte non trouvée" }, { status: 404 })
    }

    // Récupérer l'historique des transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("loyalty_card_id", id)
      .order("created_at", { ascending: false })

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError)
      return NextResponse.json({ error: transactionsError.message }, { status: 500 })
    }

    // Formater les données pour le frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      card_id: transaction.loyalty_card_id,
      transaction_type: transaction.transaction_type,
      points: transaction.points,
      reason: transaction.description || null,
      created_at: transaction.created_at,
      balance_after: transaction.points_balance_after,
      sale_id: transaction.sale_id || null
    }))

    return NextResponse.json({ data: formattedTransactions }, { status: 200 })
  } catch (error) {
    console.error("Error fetching loyalty points history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
