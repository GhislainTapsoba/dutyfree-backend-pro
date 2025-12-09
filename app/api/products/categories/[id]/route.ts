import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// PUT - Modifier une catégorie
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()
    const { name_fr, name_en, sort_order, image_url, is_active } = body

    if (!name_fr || !name_en) {
      return NextResponse.json({ error: "Champs obligatoires: name_fr, name_en" }, { status: 400 })
    }

    // Vérifier si sort_order existe déjà (sauf pour cette catégorie)
    if (sort_order !== undefined && sort_order !== null) {
      const { data: existing } = await supabase
        .from("product_categories")
        .select("id")
        .eq("sort_order", sort_order)
        .neq("id", id)
        .maybeSingle()
      
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
    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data, error } = await supabase
      .from("product_categories")
      .update(updateData)
      .eq("id", id)
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

//VIEW - Voir une catégorie
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer une catégorie (soft ou hard delete)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    // Vérifier si des produits utilisent cette catégorie
    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", id)
      .limit(1)

    if (products && products.length > 0) {
      return NextResponse.json({ 
        error: "Impossible de supprimer: des produits utilisent cette catégorie" 
      }, { status: 400 })
    }

    if (permanent) {
      // Suppression définitive
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Soft delete - désactiver
      const { error } = await supabase
        .from("product_categories")
        .update({ is_active: false })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}