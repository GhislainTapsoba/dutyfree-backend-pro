import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// GET - Récupérer les statistiques des notifications
export async function GET() {
  try {
    const supabase = createAdminClient()
    const userId = '00000000-0000-0000-0000-000000000000'

    // Compter le total de notifications
    const { count: total } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    // Compter les notifications non lues
    const { count: unread } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    const read = (total || 0) - (unread || 0)

    return NextResponse.json({
      data: {
        total: total || 0,
        unread: unread || 0,
        read: read,
        by_type: {},
        by_priority: {}
      }
    })
  } catch (error) {
    console.error("Error fetching notification stats:", error)
    return NextResponse.json({ 
      data: {
        total: 0,
        unread: 0,
        read: 0,
        by_type: {},
        by_priority: {}
      }
    })
  }
}
