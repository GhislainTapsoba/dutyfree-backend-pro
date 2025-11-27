import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST - Inscription publique d'un nouvel utilisateur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { email, password, firstName, lastName, first_name, last_name } = body

    // Support des deux formats de noms (camelCase et snake_case)
    const userFirstName = firstName || first_name
    const userLastName = lastName || last_name

    // Validation des champs obligatoires
    if (!email || !password || !userFirstName || !userLastName) {
      return NextResponse.json(
        { error: "Champs obligatoires: email, password, firstName (ou first_name), lastName (ou last_name)" },
        { status: 400 },
      )
    }

    // Validation du mot de passe
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 },
      )
    }

    // Vérifier si l'email existe déjà
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: "Un compte avec cet email existe déjà" }, { status: 400 })
    }

    // Récupérer le rôle par défaut (cashier ou le premier rôle NON-ADMIN disponible)
    const { data: defaultRole } = await supabase
      .from("roles")
      .select("id")
      .eq("code", "cashier")
      .single()

    let roleId = defaultRole?.id

    // Si pas de rôle cashier, prendre le premier rôle NON-ADMIN disponible
    if (!roleId) {
      const { data: firstRole } = await supabase
        .from("roles")
        .select("id")
        .neq("code", "admin") // Exclure le rôle admin
        .limit(1)
        .single()

      roleId = firstRole?.id
    }

    // Vérifier qu'un rôle a été trouvé
    if (!roleId) {
      return NextResponse.json(
        { error: "Aucun rôle disponible pour l'inscription. Contactez l'administrateur." },
        { status: 500 },
      )
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmer l'email (pas besoin de validation)
    })

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Erreur lors de la création de l'utilisateur" }, { status: 500 })
    }

    // Créer le profil utilisateur dans la table users
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        first_name: userFirstName,
        last_name: userLastName,
        role_id: roleId,
        active: true, // Actif par défaut
      })
      .select(`
        *,
        role:roles(id, code, name, permissions),
        point_of_sale:point_of_sales(id, code, name)
      `)
      .single()

    if (profileError) {
      console.error("Profile error:", profileError)
      // Rollback: supprimer l'utilisateur auth si le profil échoue
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Log de l'activité (auto-inscription)
    await supabase.from("user_activity_logs").insert({
      user_id: authData.user.id,
      action: "self_register",
      entity_type: "user",
      entity_id: authData.user.id,
      details: { email, role_id: roleId },
    })

    // Retourner le profil créé
    return NextResponse.json(
      {
        success: true,
        message: "Compte créé avec succès",
        data: userProfile,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error in signup:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
