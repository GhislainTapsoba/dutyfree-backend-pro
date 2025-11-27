import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des cartes de fidélité
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
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
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { customer_name, customer_email, customer_phone } = body

    if (!customer_name) {
      return NextResponse.json({ error: "Champ obligatoire: customer_name" }, { status: 400 })
    }

    // Générer numéro de carte
    const cardNumber = `LYL-${Date.now().toString(36).toUpperCase()}`

    const { data, error } = await supabase
      .from("loyalty_cards")
      .insert({
        card_number: cardNumber,
        customer_name,
        customer_email,
        customer_phone,
        tier: "standard",
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
