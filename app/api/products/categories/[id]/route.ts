import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// PUT - Modifier une catégorie
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { name_fr, name_en } = body

    if (!name_fr || !name_en) {
      return NextResponse.json({ error: "Champs obligatoires: name_fr, name_en" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("product_categories")
      .update({ name_fr, name_en })
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