import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des catégories
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name_fr", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Organiser en arbre hiérarchique
    const rootCategories = data?.filter((c) => !c.parent_id) || []
    const childCategories = data?.filter((c) => c.parent_id) || []

    const categoriesWithChildren = rootCategories.map((parent) => ({
      ...parent,
      children: childCategories.filter((child) => child.parent_id === parent.id),
    }))

    return NextResponse.json(categoriesWithChildren)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une catégorie
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

    const { code, name_fr, name_en, parent_id, sort_order } = body

    if (!code || !name_fr || !name_en) {
      return NextResponse.json({ error: "Champs obligatoires: code, name_fr, name_en" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("product_categories")
      .insert({
        code,
        name_fr,
        name_en,
        parent_id,
        sort_order: sort_order || 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
