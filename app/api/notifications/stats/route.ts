import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// GET - Récupérer les statistiques des notifications
export async function GET() {
  try {
    const supabase = createAdminClient()
    const userId = '00000000-0000-0000-0000-000000000000'

    // Compter le total de notifications
    const { count: total, error: totalError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (totalError) throw totalError

    // Compter les notifications non lues
    const { count: unread, error: unreadError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (unreadError) throw unreadError

    return NextResponse.json({
      total: total || 0,
      unread: unread || 0,
    })
  } catch (error) {
    console.error("Error fetching notification stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
