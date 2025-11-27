import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/external-data - Récupérer données externes (passagers mensuels, etc.)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const dataType = searchParams.get("type")
  const month = searchParams.get("month")
  const year = searchParams.get("year")

  try {
    let query = supabase.from("external_data").select("*").order("data_date", { ascending: false })

    if (dataType) {
      query = query.eq("data_type", dataType)
    }
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, "0")}-01`
      const endDate = `${year}-${month.padStart(2, "0")}-31`
      query = query.gte("data_date", startDate).lte("data_date", endDate)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching external data:", error)
    return NextResponse.json({ error: "Failed to fetch external data" }, { status: 500 })
  }
}

// POST /api/external-data - Saisir données externes manuellement
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { data_type, data_date, value, source, notes } = body

    // Vérifier si une entrée existe déjà pour cette date et ce type
    const { data: existing } = await supabase
      .from("external_data")
      .select("id")
      .eq("data_type", data_type)
      .eq("data_date", data_date)
      .single()

    if (existing) {
      // Mettre à jour
      const { data, error } = await supabase
        .from("external_data")
        .update({ value, source, notes, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ data, updated: true })
    }

    // Créer nouvelle entrée
    const { data, error } = await supabase
      .from("external_data")
      .insert({ data_type, data_date, value, source, notes })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, created: true }, { status: 201 })
  } catch (error) {
    console.error("Error saving external data:", error)
    return NextResponse.json({ error: "Failed to save external data" }, { status: 500 })
  }
}
