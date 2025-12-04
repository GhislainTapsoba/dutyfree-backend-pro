import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser, checkUserRole } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// POST - Créer un nouvel utilisateur (admin uniquement)
export async function POST(request: NextRequest) {
  try {
    console.log("[Register] 📝 Tentative de création d'utilisateur")

    // Vérifier l'authentification
    const currentUser = await getAuthenticatedUser(request)

    if (!currentUser) {
      console.error("[Register] ❌ Authentification échouée")
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    console.log("[Register] ✅ User authentifié:", currentUser.email)

    // Vérifier le rôle (admin uniquement)
    const { authorized, roleCode } = await checkUserRole(currentUser.id, ["admin"])

    if (!authorized) {
      console.error("[Register] ❌ Accès refusé. Rôle:", roleCode)
      return NextResponse.json({
        error: "Accès refusé",
        details: `Seuls les administrateurs peuvent créer des utilisateurs. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const body = await request.json()

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

    console.log("[Register] ✅ Utilisateur créé:", email)

    return NextResponse.json({ data: userProfile }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
