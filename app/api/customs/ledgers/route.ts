import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des sommiers douaniers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const pointOfSaleId = searchParams.get("pos_id")
    const alertPurge = searchParams.get("alert_purge") === "true"

    let query = supabase.from("customs_ledgers").select(`
        *,
        point_of_sale:point_of_sales(id, code, name)
      `)

    if (status) {
      query = query.eq("status", status)
    }

    if (pointOfSaleId) {
      query = query.eq("point_of_sale_id", pointOfSaleId)
    }

    if (alertPurge) {
      // Sommiers dont la date d'apurement approche (< 30 jours)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      query = query
        .eq("status", "open")
        .not("purge_deadline", "is", null)
        .lte("purge_deadline", thirtyDaysFromNow.toISOString().split("T")[0])
    }

    const { data, error } = await query.order("start_date", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching ledgers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un sommier douanier
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

    const { ledger_number, point_of_sale_id, start_date, purge_deadline, notes } = body

    if (!ledger_number || !start_date) {
      return NextResponse.json({ error: "Champs obligatoires: ledger_number, start_date" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("customs_ledgers")
      .insert({
        ledger_number,
        point_of_sale_id,
        start_date,
        purge_deadline,
        notes,
        status: "open",
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Numéro de sommier déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating ledger:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
