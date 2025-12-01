import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des catégories
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("name_fr", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une catégorie
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { name_fr, name_en, description } = body

    if (!name_fr || !name_en) {
      return NextResponse.json({ error: "Champs obligatoires: name_fr, name_en" }, { status: 400 })
    }

    // Générer un code automatique
    const code = name_fr.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 20)

    const { data, error } = await supabase
      .from("product_categories")
      .insert({
        code,
        name_fr,
        name_en,
        description,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
