import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des sessions de caisse
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const cashRegisterId = searchParams.get("cash_register_id")
    const userId = searchParams.get("user_id")
    const date = searchParams.get("date")

    const offset = (page - 1) * limit

    let query = supabase.from("cash_sessions").select(
      `
        *,
        cash_register:cash_registers(id, code, name, point_of_sale_id),
        user:users(id, first_name, last_name, employee_id)
      `,
      { count: "exact" },
    )

    if (status) {
      query = query.eq("status", status)
    }

    if (cashRegisterId) {
      query = query.eq("cash_register_id", cashRegisterId)
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    if (date) {
      query = query.gte("opening_time", `${date}T00:00:00`).lte("opening_time", `${date}T23:59:59`)
    }

    query = query.order("opening_time", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching cash sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Ouvrir une session de caisse
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { cash_register_id, user_id, opening_cash, vacation_type } = body

    if (!cash_register_id || !user_id) {
      return NextResponse.json({ error: "Champs obligatoires: cash_register_id, user_id" }, { status: 400 })
    }

    if (opening_cash === undefined || opening_cash === null) {
      return NextResponse.json({ error: "Le fond de caisse (opening_cash) est obligatoire" }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas de session ouverte sur cette caisse
    const { data: existingSession } = await supabase
      .from("cash_sessions")
      .select("id")
      .eq("cash_register_id", cash_register_id)
      .eq("status", "open")
      .maybeSingle()

    if (existingSession) {
      return NextResponse.json({ error: "Une session est déjà ouverte sur cette caisse" }, { status: 409 })
    }

    // Vérifier que l'utilisateur n'a pas déjà une session ouverte
    const { data: userSession } = await supabase
      .from("cash_sessions")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "open")
      .maybeSingle()

    if (userSession) {
      return NextResponse.json({ error: "L'utilisateur a déjà une session ouverte" }, { status: 409 })
    }

    // Déterminer la vacation automatiquement si non fournie
    const openingTime = new Date()
    let finalVacationType = vacation_type
    if (!finalVacationType) {
      const hour = openingTime.getHours()
      if (hour >= 6 && hour < 14) finalVacationType = 'morning'
      else if (hour >= 14 && hour < 22) finalVacationType = 'afternoon'
      else finalVacationType = 'night'
    }

    // Générer numéro de session
    const sessionNumber = `CS-${Date.now().toString(36).toUpperCase()}`

    const { data, error } = await supabase
      .from("cash_sessions")
      .insert({
        session_number: sessionNumber,
        cash_register_id,
        user_id,
        opening_time: openingTime.toISOString(),
        opening_cash,
        vacation_type: finalVacationType,
        status: "open",
      })
      .select(`
        *,
        cash_register:cash_registers(id, code, name),
        user:users(id, first_name, last_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id,
      action: "open_session",
      entity_type: "cash_session",
      entity_id: data.id,
      details: { opening_cash, vacation_type: finalVacationType },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error opening cash session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
