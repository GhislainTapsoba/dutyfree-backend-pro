import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// PUT - Modifier une catégorie
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { name_fr, name_en, sort_order, image_url } = body

    if (!name_fr || !name_en) {
      return NextResponse.json({ error: "Champs obligatoires: name_fr, name_en" }, { status: 400 })
    }

    // Vérifier si sort_order existe déjà (sauf pour cette catégorie)
    if (sort_order !== undefined && sort_order !== null) {
      const { data: existing } = await supabase
        .from("product_categories")
        .select("id")
        .eq("sort_order", sort_order)
        .neq("id", params.id)
        .single()
      
      if (existing) {
        return NextResponse.json({ error: "Cet ordre de tri est déjà utilisé" }, { status: 409 })
      }
    }

    const updateData: any = { name_fr, name_en }
    if (sort_order !== undefined) {
      updateData.sort_order = sort_order
    }
    if (image_url !== undefined) {
      updateData.image_url = image_url
    }

    const { data, error } = await supabase
      .from("product_categories")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer une catégorie
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}