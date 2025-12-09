import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Session ouverte de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "user_id requis" }, { status: 400 })
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
      .eq("user_id", userId)
      .eq("status", "open")
      .maybeSingle()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: session || null })
  } catch (error) {
    console.error("Error fetching current session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
