import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des devises
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("currencies")
      .select("*")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("code", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching currencies:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Ajouter une devise
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({
        error: "Non autorisé",
        details: "Token invalide"
      }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    const { code, name, symbol, exchange_rate } = body

    if (!code || !name || !symbol || !exchange_rate) {
      return NextResponse.json({ error: "Champs obligatoires: code, name, symbol, exchange_rate" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("currencies")
      .insert({
        code: code.toUpperCase(),
        name,
        symbol,
        exchange_rate,
        is_default: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code devise déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating currency:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
