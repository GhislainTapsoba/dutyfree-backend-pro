import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { username, password, email } = body;

    // Support both username and email login
    const loginEmail = email || username;

    if (!loginEmail || !password) {
      return NextResponse.json(
        { message: "Email/Username et mot de passe requis" },
        { status: 400 }
      );
    }

    // Si c'est un username (pas d'@), chercher l'email correspondant
    let userEmail = loginEmail;
    if (!loginEmail.includes("@")) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("employee_id", loginEmail)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { message: "Identifiants invalides" },
          { status: 401 }
        );
      }

      userEmail = userData.email;
    }

    // Authentification avec Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (authError) {
      console.error("[LOGIN] Auth error:", authError);
      return NextResponse.json(
        { message: "Identifiants invalides" },
        { status: 401 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: "Erreur d'authentification" },
        { status: 500 }
      );
    }

    // Récupérer le profil utilisateur
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select(`
        *,
        role:roles(id, code, name, permissions)
      `)
      .eq("id", authData.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("[LOGIN] Profile error:", profileError);
      return NextResponse.json(
        { message: "Profil utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur est actif
    const isActive = userProfile.is_active ?? userProfile.active ?? true;
    if (isActive === false) {
      return NextResponse.json(
        { message: "Compte désactivé" },
        { status: 403 }
      );
    }

    // Mettre à jour la dernière connexion avec admin client
    const adminClient = createAdminClient();
    await adminClient
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", authData.user.id);

    // Log de l'activité
    await supabase.from("user_activity_logs").insert({
      user_id: authData.user.id,
      action: "login",
      entity_type: "auth",
      details: { email: userEmail },
    });

    // Définir le cookie user_id
    const cookieStore = await cookies();
    cookieStore.set('user_id', authData.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 jours
    });

    // Formater la réponse selon le format attendu par le frontend
    return NextResponse.json({
      token: authData.session?.access_token || "",
      user: {
        id: userProfile.id,
        username: userProfile.employee_id || userProfile.email,
        email: userProfile.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: userProfile.role?.code || "user",
        pointOfSaleId: userProfile.point_of_sale_id,
        isActive: isActive,
        createdAt: userProfile.created_at,
        updatedAt: userProfile.updated_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
