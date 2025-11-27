import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Rechercher une vente par numéro de ticket
export async function GET(request: NextRequest, { params }: { params: Promise<{ ticketNumber: string }> }) {
  try {
    const { ticketNumber } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        seller:users(id, first_name, last_name),
        lines:sale_lines(
          *,
          product:products(id, code, name_fr, name_en)
        ),
        payments:payments(
          *,
          payment_method:payment_methods(code, name)
        )
      `)
      .eq("ticket_number", ticketNumber)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching sale by ticket:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
