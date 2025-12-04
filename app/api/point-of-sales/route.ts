import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des points de vente
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("point_of_sales")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching point of sales:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un point de vente
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

    const { code, name, location } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Champs obligatoires: code, name" }, { status: 400 })
    }

    const { data, error } = await supabase.from("point_of_sales").insert({ code, name, location }).select().single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code point de vente déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating point of sale:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
