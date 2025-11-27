import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - Session ouverte de l'utilisateur connecté
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { data: session, error } = await supabase
      .from("cash_sessions")
      .select(`
        *,
        cash_register:cash_registers(
          id, 
          code, 
          name,
          point_of_sale:point_of_sales(id, code, name)
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "open")
      .single()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: session || null })
  } catch (error) {
    console.error("Error fetching current session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
