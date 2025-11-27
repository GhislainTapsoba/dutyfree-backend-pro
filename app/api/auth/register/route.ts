import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST - Créer un nouvel utilisateur (admin uniquement)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Vérifier que l'utilisateur actuel est admin
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { data: currentUserProfile } = await supabase
      .from("users")
      .select("role:roles(code)")
      .eq("id", currentUser.id)
      .single()

    const userRole = Array.isArray(currentUserProfile?.role) ? currentUserProfile.role[0] : currentUserProfile?.role
    if (userRole?.code !== "admin") {
      return NextResponse.json({ error: "Seuls les administrateurs peuvent créer des utilisateurs" }, { status: 403 })
    }

    const { email, password, first_name, last_name, employee_id, phone, role_id, point_of_sale_id } = body

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: "Champs obligatoires: email, password, first_name, last_name" },
        { status: 400 },
      )
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Créer le profil utilisateur
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        employee_id,
        phone,
        role_id,
        point_of_sale_id,
      })
      .select(`
        *,
        role:roles(id, code, name, permissions),
        point_of_sale:point_of_sales(id, code, name)
      `)
      .single()

    if (profileError) {
      // Rollback: supprimer l'utilisateur auth si le profil échoue
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: currentUser.id,
      action: "create_user",
      entity_type: "user",
      entity_id: authData.user.id,
      details: { email, role_id },
    })

    return NextResponse.json({ data: userProfile }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
