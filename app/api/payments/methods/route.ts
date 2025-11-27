import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des méthodes de paiement
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching payment methods:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une méthode de paiement
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

    const { code, name, type } = body

    if (!code || !name || !type) {
      return NextResponse.json({ error: "Champs obligatoires: code, name, type" }, { status: 400 })
    }

    const validTypes = ["cash", "card", "mobile_money", "tpe"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Type invalide. Types valides: cash, card, mobile_money, tpe" },
        { status: 400 },
      )
    }

    const { data, error } = await supabase.from("payment_methods").insert({ code, name, type }).select().single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating payment method:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
