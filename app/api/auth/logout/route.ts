import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Récupérer l'utilisateur actuel
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Log de l'activité
      await supabase.from("user_activity_logs").insert({
        user_id: user.id,
        action: "logout",
        entity_type: "auth",
        details: {},
      });
    }

    // Déconnexion
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { message: "Erreur lors de la déconnexion" },
      { status: 500 }
    );
  }
}
