import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des clients
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")
    const loyaltyCard = searchParams.get("loyalty_card")

    const offset = (page - 1) * limit

    let query = supabase.from("customers").select(
      `
        *,
        loyalty_card:loyalty_cards(*)
      `,
      { count: "exact" },
    )

    // Filtres
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    if (loyaltyCard === "true") {
      query = query.not("loyalty_card_id", "is", null)
    }

    // Pagination et tri
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data: customers, error, count } = await query

    if (error) {
      console.error("[API Customers] Supabase error:", error)
      // Si la table n'existe pas, retourner un tableau vide au lieu d'une erreur
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.warn("[API Customers] Table 'customers' does not exist, returning empty array")
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            total_pages: 0,
          },
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: customers || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error("[API Customers] Error fetching customers:", error)
    // En cas d'erreur, retourner un tableau vide pour ne pas bloquer le frontend
    return NextResponse.json({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
      },
    })
  }
}

// POST - Créer un client
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      country,
      postal_code,
      date_of_birth,
      nationality,
      passport_number,
      loyalty_card_id,
    } = body

    // Validation
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "Champs obligatoires: first_name, last_name" },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        first_name,
        last_name,
        email,
        phone,
        address,
        city,
        country,
        postal_code,
        date_of_birth,
        nationality,
        passport_number,
        loyalty_card_id,
      })
      .select(`
        *,
        loyalty_card:loyalty_cards(*)
      `)
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Email ou téléphone déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: "create",
      entity_type: "customer",
      entity_id: data.id,
      details: { customer_name: `${first_name} ${last_name}` },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
