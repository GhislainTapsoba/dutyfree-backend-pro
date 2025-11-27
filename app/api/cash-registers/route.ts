import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des caisses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const pointOfSaleId = searchParams.get("pos_id")
    const isActive = searchParams.get("is_active")

    let query = supabase.from("cash_registers").select(`
        *,
        point_of_sale:point_of_sales(id, code, name)
      `)

    if (pointOfSaleId) {
      query = query.eq("point_of_sale_id", pointOfSaleId)
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true")
    }

    const { data, error } = await query.order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching cash registers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une caisse
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

    const { code, name, point_of_sale_id } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Champs obligatoires: code, name" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("cash_registers")
      .insert({ code, name, point_of_sale_id })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code caisse déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating cash register:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
