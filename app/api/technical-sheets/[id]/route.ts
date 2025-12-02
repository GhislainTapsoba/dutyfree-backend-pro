import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'une fiche technique
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params

  try {
    const { data, error } = await supabase
      .from("technical_sheets")
      .select(`
        *,
        product:products(id, code, name_fr, name_en)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching technical sheet:", error)
    return NextResponse.json({ error: "Failed to fetch technical sheet" }, { status: 500 })
  }
}

// PUT - Modifier une fiche technique
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params

  try {
    const body = await request.json()
    const {
      product_id,
      sheet_code,
      ingredients,
      allergens,
      nutritional_info,
      storage_conditions,
      origin_country,
      certifications,
      hs_code,
      net_weight,
      gross_weight,
      dimensions,
      shelf_life_days,
    } = body

    const specifications = {
      allergens,
      nutritional_info,
      storage_conditions,
      certifications,
      hs_code,
      gross_weight,
      shelf_life_days,
    }

    const updateData: any = {
      product_id,
      ingredients,
      allergens: typeof allergens === 'string' ? [allergens] : (allergens || []),
      nutritional_info,
      storage_conditions,
      origin_country,
      certifications: typeof certifications === 'string' ? [certifications] : (certifications || []),
      customs_code: hs_code,
      net_weight,
      gross_weight,
      dimensions,
      updated_at: new Date().toISOString(),
    }
    
    if (sheet_code) {
      updateData.sheet_code = sheet_code
    }

    const { data, error } = await supabase
      .from("technical_sheets")
      .update(updateData)
      .eq("id", id)
      .select()

    if (error) {
      console.error('Error updating technical sheet:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Technical sheet not found' }, { status: 404 })
    }

    return NextResponse.json({ data: data[0] })
  } catch (error) {
    console.error("Error updating technical sheet:", error)
    return NextResponse.json({ error: "Failed to update technical sheet" }, { status: 500 })
  }
}

// DELETE - Supprimer une fiche technique
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params

  try {
    console.log('Deleting technical sheet:', id)
    
    const { data, error } = await supabase
      .from("technical_sheets")
      .delete()
      .eq("id", id)
      .select()

    if (error) {
      console.error('Supabase delete error:', error)
      throw error
    }

    console.log('Delete successful:', data)
    return NextResponse.json({ message: "Technical sheet deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting technical sheet:", error)
    return NextResponse.json({ 
      error: "Failed to delete technical sheet",
      details: error.message 
    }, { status: 500 })
  }
}
