import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const cardNumber = searchParams.get("card_number")

  try {
    if (cardNumber) {
      const { data, error } = await supabase
        .from("guest_cards")
        .select("*")
        .eq("card_number", cardNumber)
        .eq("is_active", true)
        .maybeSingle()

      if (error) throw error
      
      if (data) {
        const today = new Date().toISOString().split('T')[0]
        const isValid = data.valid_from <= today && (!data.valid_until || data.valid_until >= today)
        if (!isValid) {
          return NextResponse.json({ error: "Carte expirée" }, { status: 400 })
        }
      }

      return NextResponse.json({ data })
    }

    const { data, error } = await supabase
      .from("guest_cards")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  try {
    const { data, error } = await supabase
      .from("guest_cards")
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
