import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser, checkUserRole } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// POST - Ajouter/Retirer des points
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json()

    const { type, points, sale_id, reason, transaction_type } = body

    // Support both 'type' (from frontend) and 'transaction_type' (legacy)
    const txType = type || transaction_type

    if (!points) {
      return NextResponse.json({ error: "Champs obligatoires: points" }, { status: 400 })
    }

    // Récupérer la carte
    const { data: card } = await supabase.from("loyalty_cards").select("*").eq("id", id).single()

    if (!card) {
      return NextResponse.json({ error: "Carte non trouvée" }, { status: 404 })
    }

    // Calculer le nouveau solde
    let newBalance = card.points_balance
    let newTotalEarned = card.total_points_earned
    let finalTransactionType = txType
    let pointsValue = points

    // Gérer les différents types de transactions
    if (txType === "credit") {
      // Ajout de points
      newBalance += Math.abs(pointsValue)
      newTotalEarned += Math.abs(pointsValue)
      pointsValue = Math.abs(pointsValue)
      finalTransactionType = "earn"
    } else if (txType === "debit") {
      // Déduction de points
      const pointsToDeduct = Math.abs(pointsValue)
      if (card.points_balance < pointsToDeduct) {
        return NextResponse.json({ error: "Solde de points insuffisant" }, { status: 400 })
      }
      newBalance -= pointsToDeduct
      pointsValue = -pointsToDeduct
      finalTransactionType = "redeem"
    } else if (txType === "adjustment") {
      // Ajustement (peut être positif ou négatif)
      newBalance += pointsValue
      if (pointsValue > 0) {
        newTotalEarned += pointsValue
      }
      finalTransactionType = "adjust"
    } else if (txType === "earn") {
      // Legacy support
      newBalance += Math.abs(pointsValue)
      newTotalEarned += Math.abs(pointsValue)
      pointsValue = Math.abs(pointsValue)
    } else if (txType === "redeem") {
      // Legacy support
      const pointsToDeduct = Math.abs(pointsValue)
      if (card.points_balance < pointsToDeduct) {
        return NextResponse.json({ error: "Solde de points insuffisant" }, { status: 400 })
      }
      newBalance -= pointsToDeduct
      pointsValue = -pointsToDeduct
    } else if (txType === "purchase") {
      // Utilisation pour achat
      const pointsToDeduct = Math.abs(pointsValue)
      if (card.points_balance < pointsToDeduct) {
        return NextResponse.json({ error: "Solde de points insuffisant" }, { status: 400 })
      }
      newBalance -= pointsToDeduct
      pointsValue = -pointsToDeduct
    } else {
      return NextResponse.json({ error: "Type de transaction invalide" }, { status: 400 })
    }

    // Créer la transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("loyalty_transactions")
      .insert({
        loyalty_card_id: id,
        sale_id,
        transaction_type: finalTransactionType,
        points: pointsValue,
        points_balance_after: newBalance,
        description: reason || body.description,
      })
      .select()
      .single()

    if (transactionError) {
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    // Mettre à jour la carte
    const updateData: Record<string, unknown> = {
      points_balance: newBalance,
      updated_at: new Date().toISOString(),
    }

    if (pointsValue > 0 && (txType === "credit" || txType === "earn" || txType === "adjustment")) {
      updateData.total_points_earned = newTotalEarned
    }

    // Mettre à jour le tier si nécessaire
    if (newTotalEarned >= 50000) {
      updateData.tier = "platinum"
    } else if (newTotalEarned >= 20000) {
      updateData.tier = "gold"
    } else if (newTotalEarned >= 5000) {
      updateData.tier = "silver"
    }

    await supabase.from("loyalty_cards").update(updateData).eq("id", id)

    return NextResponse.json({ data: transaction }, { status: 201 })
  } catch (error) {
    console.error("Error managing loyalty points:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
