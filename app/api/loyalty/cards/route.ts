import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser, checkUserRole } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des cartes de fidélité
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search")
    const tier = searchParams.get("tier")
    const cardNumber = searchParams.get("card_number")

    let query = supabase.from("loyalty_cards").select("*")

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,card_number.ilike.%${search}%`)
    }

    if (tier) {
      query = query.eq("tier", tier)
    }

    if (cardNumber) {
      query = query.eq("card_number", cardNumber)
    }

    query = query.eq("is_active", true).order("created_at", { ascending: false })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching loyalty cards:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une carte de fidélité
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification avec auth_token cookie
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({
        error: "Non autorisé - Authentification requise",
        details: "Token invalide ou expiré"
      }, { status: 401 })
    }

    // Vérifier le rôle (admin ou supervisor)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin", "supervisor"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé - Rôle insuffisant",
        details: `Seuls les administrateurs et superviseurs peuvent créer des cartes de fidélité. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()
    const body = await request.json()

    const { customer_name, customer_email, customer_phone } = body

    if (!customer_name) {
      return NextResponse.json({ error: "Champ obligatoire: customer_name" }, { status: 400 })
    }

    // Générer numéro de carte
    const cardNumber = `LYL-${Date.now().toString(36).toUpperCase()}`

    const { data, error } = await adminSupabase
      .from("loyalty_cards")
      .insert({
        card_number: cardNumber,
        customer_name,
        customer_email,
        customer_phone,
        tier: "standard",
        points_balance: 0,
        total_points_earned: 0,
        total_amount_spent: 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating loyalty card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
