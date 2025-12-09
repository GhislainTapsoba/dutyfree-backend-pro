import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Récupérer les notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams

    const userId = '00000000-0000-0000-0000-000000000000'

    // Paramètres de pagination et filtrage
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const unreadOnly = searchParams.get("unread_only") === "true"

    // Construire la requête
    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtre optionnel pour les non lues
    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une notification (admin uniquement)
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier les permissions (admin)
    const { data: userData } = await supabase
      .from("users")
      .select("role:roles(code)")
      .eq("id", user.id)
      .single()

    const isAdmin = (userData?.role as any)?.code === "ADMIN"
    if (!isAdmin) {
      return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 })
    }

    const { user_id, title, message, type = "info" } = body

    // Validation des données
    if (!user_id || !title || !message) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
    }

    // Créer la notification
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        title,
        message,
        type,
        is_read: false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
