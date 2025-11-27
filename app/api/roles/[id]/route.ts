import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'un rôle
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.from("roles").select("*").eq("id", id).single()

    if (error || !data) {
      return NextResponse.json({ error: "Rôle non trouvé" }, { status: 404 })
    }

    // Compter les utilisateurs avec ce rôle
    const { count } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("role_id", id)

    return NextResponse.json({
      data: {
        ...data,
        users_count: count || 0,
      },
    })
  } catch (error) {
    console.error("Error fetching role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour un rôle
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { data: userProfile } = await supabase.from("users").select("role:roles(code)").eq("id", user.id).single()

    const userRole = Array.isArray(userProfile?.role) ? userProfile.role[0] : userProfile?.role
    if (userRole?.code !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { name, description, permissions } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (permissions !== undefined) updateData.permissions = permissions

    const { data, error } = await supabase.from("roles").update(updateData).eq("id", id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
