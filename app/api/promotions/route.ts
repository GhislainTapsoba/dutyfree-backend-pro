import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des promotions
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const activeOnly = searchParams.get("active_only") === "true"
    const currentOnly = searchParams.get("current_only") === "true"

    let query = supabase.from("promotions").select("*")

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    if (currentOnly) {
      const now = new Date().toISOString()
      query = query.eq("is_active", true).lte("start_date", now).gte("end_date", now)
    }

    const { data, error } = await query.order("start_date", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching promotions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une promotion
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      applicable_to,
      applicable_ids,
      start_date,
      end_date,
      usage_limit,
    } = body

    if (!code || !name || !discount_type || !discount_value || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Champs obligatoires: code, name, discount_type, discount_value, start_date, end_date" },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from("promotions")
      .insert({
        code,
        name,
        description,
        discount_type,
        discount_value,
        min_purchase_amount,
        max_discount_amount,
        applicable_to: applicable_to || "all",
        applicable_ids,
        start_date,
        end_date,
        usage_limit,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code promotion déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating promotion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
