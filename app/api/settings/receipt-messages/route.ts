import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Messages de ticket
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const type = searchParams.get("type")
    const activeOnly = searchParams.get("active_only") === "true"

    let query = supabase.from("receipt_messages").select("*")

    if (type) {
      query = query.eq("message_type", type)
    }

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching receipt messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un message de ticket
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

    const { point_of_sale_id, message_type, message_fr, message_en, start_date, end_date } = body

    if (!message_type || !message_fr || !message_en) {
      return NextResponse.json({ error: "Champs obligatoires: message_type, message_fr, message_en" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("receipt_messages")
      .insert({
        point_of_sale_id,
        message_type,
        message_fr,
        message_en,
        start_date,
        end_date,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating receipt message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
