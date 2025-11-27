import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détail d'un utilisateur
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        role:roles(id, code, name, permissions),
        point_of_sale:point_of_sales(id, code, name)
      `)
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour un utilisateur (admin uniquement)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier les permissions (admin ou superviseur)
    const { data: currentUserProfile } = await supabase
      .from("users")
      .select("role:roles(code)")
      .eq("id", currentUser.id)
      .single()

    const userRole = Array.isArray(currentUserProfile?.role) ? currentUserProfile.role[0] : currentUserProfile?.role
    if (!["admin", "supervisor"].includes(userRole?.code || "")) {
      return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 })
    }

    const { first_name, last_name, employee_id, phone, role_id, point_of_sale_id, is_active } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    if (employee_id !== undefined) updateData.employee_id = employee_id
    if (phone !== undefined) updateData.phone = phone
    if (role_id !== undefined) updateData.role_id = role_id
    if (point_of_sale_id !== undefined) updateData.point_of_sale_id = point_of_sale_id
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        role:roles(id, code, name),
        point_of_sale:point_of_sales(id, code, name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: currentUser.id,
      action: "update_user",
      entity_type: "user",
      entity_id: id,
      details: { updated_fields: Object.keys(updateData) },
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Désactiver un utilisateur
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier que c'est un admin
    const { data: currentUserProfile } = await supabase
      .from("users")
      .select("role:roles(code)")
      .eq("id", currentUser.id)
      .single()

    const userRole = Array.isArray(currentUserProfile?.role) ? currentUserProfile.role[0] : currentUserProfile?.role
    if (userRole?.code !== "admin") {
      return NextResponse.json(
        { error: "Seuls les administrateurs peuvent désactiver des utilisateurs" },
        { status: 403 },
      )
    }

    // Ne pas permettre de se désactiver soi-même
    if (id === currentUser.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte" }, { status: 400 })
    }

    const { error } = await supabase
      .from("users")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: currentUser.id,
      action: "deactivate_user",
      entity_type: "user",
      entity_id: id,
    })

    return NextResponse.json({ message: "Utilisateur désactivé" })
  } catch (error) {
    console.error("Error deactivating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
