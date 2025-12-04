import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des clients hébergés
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search")
    const badgeNumber = searchParams.get("badge")
    const activeOnly = searchParams.get("active_only") === "true"

    let query = supabase.from("hotel_guests").select("*")

    if (search) {
      query = query.or(`guest_name.ilike.%${search}%,hotel_name.ilike.%${search}%`)
    }

    if (badgeNumber) {
      query = query.or(
        `badge_number.eq.${badgeNumber},professional_card.eq.${badgeNumber},chip_card_id.eq.${badgeNumber}`,
      )
    }

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching hotel guests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Enregistrer un client hébergé
export async function POST(request: NextRequest) {
  try {
    console.log("[Hotel Guests] 📝 Tentative de création de client hébergé")

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error("[Hotel Guests] ❌ Authentification échouée")
      return NextResponse.json({
        error: "Non autorisé",
        details: "Token invalide"
      }, { status: 401 })
    }

    console.log("[Hotel Guests] ✅ User authentifié:", user.email)

    const supabase = await createClient()
    const body = await request.json()

    console.log("[Hotel Guests] 📦 Body reçu:", JSON.stringify(body, null, 2))

    const {
      badge_number,
      professional_card,
      chip_card_id,
      guest_name,
      hotel_name,
      check_in_date,
      check_out_date,
      discount_percentage,
      electronic_wallet_balance,
    } = body

    if (!guest_name) {
      console.error("[Hotel Guests] ❌ Champ guest_name manquant")
      return NextResponse.json({ error: "Champ obligatoire: guest_name" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("hotel_guests")
      .insert({
        badge_number,
        professional_card,
        chip_card_id,
        guest_name,
        hotel_name,
        check_in_date,
        check_out_date,
        discount_percentage: discount_percentage || 0,
        electronic_wallet_balance: electronic_wallet_balance || 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating hotel guest:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
