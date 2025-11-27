import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST - Ajouter/Retirer des points
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { transaction_type, points, sale_id, description } = body

    if (!transaction_type || !points) {
      return NextResponse.json({ error: "Champs obligatoires: transaction_type, points" }, { status: 400 })
    }

    // Récupérer la carte
    const { data: card } = await supabase.from("loyalty_cards").select("*").eq("id", id).single()

    if (!card) {
      return NextResponse.json({ error: "Carte non trouvée" }, { status: 404 })
    }

    // Calculer le nouveau solde
    let newBalance = card.points_balance
    let newTotalEarned = card.total_points_earned

    if (transaction_type === "earn") {
      newBalance += points
      newTotalEarned += points
    } else if (transaction_type === "redeem") {
      if (card.points_balance < points) {
        return NextResponse.json({ error: "Solde de points insuffisant" }, { status: 400 })
      }
      newBalance -= points
    } else if (transaction_type === "adjust") {
      newBalance += points // Peut être négatif
    }

    // Créer la transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("loyalty_transactions")
      .insert({
        loyalty_card_id: id,
        sale_id,
        transaction_type,
        points: transaction_type === "redeem" ? -points : points,
        points_balance_after: newBalance,
        description,
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

    if (transaction_type === "earn") {
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
