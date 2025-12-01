import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/technical-sheets - Fiches techniques produits
export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const searchParams = request.nextUrl.searchParams

  const productId = searchParams.get("product_id")

  try {
    let query = supabase
      .from("product_technical_sheets")
      .select(`
        *,
        product:products(id, code, name_fr, name_en)
      `)
      .order("created_at", { ascending: false })

    if (productId) {
      query = query.eq("product_id", productId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching technical sheets:", error)
    return NextResponse.json({ error: "Failed to fetch technical sheets" }, { status: 500 })
  }
}

// POST /api/technical-sheets - Créer fiche technique
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const {
      product_id,
      ingredients,
      allergens,
      nutritional_info,
      storage_conditions,
      origin_country,
      certifications,
      customs_code,
      net_weight,
      gross_weight,
      dimensions,
    } = body

    const { data, error } = await supabase
      .from("product_technical_sheets")
      .insert({
        product_id,
        ingredients,
        allergens,
        nutritional_info,
        storage_conditions,
        origin_country,
        certifications,
        customs_code,
        net_weight,
        gross_weight,
        dimensions,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating technical sheet:", error)
    return NextResponse.json({ error: "Failed to create technical sheet" }, { status: 500 })
  }
}
