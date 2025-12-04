import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser, checkUserRole } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détails d'une carte de fidélité
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[Loyalty Card Details] 📊 Requête pour carte:", id)

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error("[Loyalty Card Details] ❌ Authentification échouée")
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    console.log("[Loyalty Card Details] ✅ User authentifié:", user.email)

    // Vérifier le rôle (admin, supervisor ou cashier)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin", "supervisor", "cashier"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Rôle insuffisant. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()

    // Récupérer la carte avec l'historique des transactions
    const { data: card, error: cardError } = await supabase
      .from("loyalty_cards")
      .select(`
        *,
        transactions:loyalty_transactions(
          id,
          transaction_type,
          points,
          points_balance_after,
          description,
          created_at
        )
      `)
      .eq("id", id)
      .order("created_at", {
        referencedTable: "loyalty_transactions",
        ascending: false
      })
      .single()

    if (cardError || !card) {
      console.error("[Loyalty Card Details] ❌ Carte non trouvée:", cardError?.message)
      return NextResponse.json({ error: "Carte non trouvée" }, { status: 404 })
    }

    console.log("[Loyalty Card Details] ✅ Carte récupérée:", card.card_number)

    return NextResponse.json({ data: card })
  } catch (error) {
    console.error("[Loyalty Card Details] Error fetching loyalty card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Modifier une carte de fidélité
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    // Vérifier le rôle (admin ou supervisor)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin", "supervisor"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Seuls les administrateurs et superviseurs peuvent modifier des cartes. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const { id } = await params
    const body = await request.json()

    const {
      customer_name,
      customer_email,
      customer_phone,
      tier,
      is_active,
      expiry_date,
    } = body

    // Vérifier que la carte existe
    const { data: existingCard, error: checkError } = await supabase
      .from("loyalty_cards")
      .select("id")
      .eq("id", id)
      .single()

    if (checkError || !existingCard) {
      return NextResponse.json({ error: "Carte non trouvée" }, { status: 404 })
    }

    // Mettre à jour la carte
    const { data, error } = await supabase
      .from("loyalty_cards")
      .update({
        customer_name,
        customer_email,
        customer_phone,
        tier,
        is_active,
        expiry_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating loyalty card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer une carte de fidélité (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    // Vérifier le rôle (admin uniquement)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Seuls les administrateurs peuvent supprimer des cartes. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const { id } = await params

    // Vérifier que la carte existe
    const { data: existingCard, error: checkError } = await supabase
      .from("loyalty_cards")
      .select("id")
      .eq("id", id)
      .single()

    if (checkError || !existingCard) {
      return NextResponse.json({ error: "Carte non trouvée" }, { status: 404 })
    }

    // Soft delete : désactiver la carte au lieu de la supprimer
    const { data, error } = await supabase
      .from("loyalty_cards")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      message: "Carte désactivée avec succès"
    })
  } catch (error) {
    console.error("Error deleting loyalty card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
