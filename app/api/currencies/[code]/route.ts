import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'une devise avec conversion
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const amount = Number.parseFloat(searchParams.get("amount") || "1")

    const { data, error } = await supabase.from("currencies").select("*").eq("code", code.toUpperCase()).single()

    if (error || !data) {
      return NextResponse.json({ error: "Devise non trouvée" }, { status: 404 })
    }

    // Calculer la conversion vers XOF
    const amountInXof = amount * data.exchange_rate

    return NextResponse.json({
      data: {
        ...data,
        conversion: {
          original_amount: amount,
          original_currency: code.toUpperCase(),
          converted_amount: amountInXof,
          target_currency: "XOF",
        },
      },
    })
  } catch (error) {
    console.error("Error fetching currency:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour le taux de change
export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { exchange_rate, name, symbol, is_active } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (exchange_rate !== undefined) updateData.exchange_rate = exchange_rate
    if (name !== undefined) updateData.name = name
    if (symbol !== undefined) updateData.symbol = symbol
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabase
      .from("currencies")
      .update(updateData)
      .eq("code", code.toUpperCase())
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: "update_exchange_rate",
      entity_type: "currency",
      details: { currency_code: code, new_rate: exchange_rate },
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating currency:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
