import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser, checkUserRole } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détails d'un client hébergé
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[Hotel Guest Details] 📊 Requête pour guest:", id)

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error("[Hotel Guest Details] ❌ Authentification échouée")
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    console.log("[Hotel Guest Details] ✅ User authentifié:", user.email)

    // Vérifier le rôle (admin, supervisor ou cashier)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin", "supervisor", "cashier"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Rôle insuffisant. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()

    // Récupérer le client hébergé
    const { data: guest, error: guestError } = await supabase
      .from("hotel_guests")
      .select("*")
      .eq("id", id)
      .single()

    if (guestError || !guest) {
      console.error("[Hotel Guest Details] ❌ Client non trouvé:", guestError?.message)
      return NextResponse.json({ error: "Client hébergé non trouvé" }, { status: 404 })
    }

    console.log("[Hotel Guest Details] ✅ Client récupéré:", guest.guest_name)

    return NextResponse.json({ data: guest })
  } catch (error) {
    console.error("[Hotel Guest Details] Error fetching hotel guest:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Modifier un client hébergé
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[Hotel Guest Update] 📝 Modification du guest:", id)

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error("[Hotel Guest Update] ❌ Authentification échouée")
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    console.log("[Hotel Guest Update] ✅ User authentifié:", user.email)

    // Vérifier le rôle (admin ou supervisor)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin", "supervisor"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Seuls les administrateurs et superviseurs peuvent modifier des clients. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const body = await request.json()

    console.log("[Hotel Guest Update] 📦 Body reçu:", JSON.stringify(body, null, 2))

    const {
      badge_number,
      professional_card,
      chip_card_id,
      guest_name,
      hotel_name,
      check_in_date,
      check_out_date,
      discount_percentage,
      electronic_wallet_balance,
      is_active,
    } = body

    // Vérifier que le client existe
    const { data: existingGuest, error: checkError } = await supabase
      .from("hotel_guests")
      .select("id")
      .eq("id", id)
      .single()

    if (checkError || !existingGuest) {
      return NextResponse.json({ error: "Client hébergé non trouvé" }, { status: 404 })
    }

    // Mettre à jour le client
    const { data, error } = await supabase
      .from("hotel_guests")
      .update({
        badge_number,
        professional_card,
        chip_card_id,
        guest_name,
        hotel_name,
        check_in_date,
        check_out_date,
        discount_percentage: discount_percentage || 0,
        electronic_wallet_balance: electronic_wallet_balance || 0,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Hotel Guest Update] ❌ Erreur:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[Hotel Guest Update] ✅ Client modifié:", guest_name)

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[Hotel Guest Update] Error updating hotel guest:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer un client hébergé (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[Hotel Guest Delete] 🗑️ Suppression du guest:", id)

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error("[Hotel Guest Delete] ❌ Authentification échouée")
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    console.log("[Hotel Guest Delete] ✅ User authentifié:", user.email)

    // Vérifier le rôle (admin uniquement)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Seuls les administrateurs peuvent supprimer des clients. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()

    // Vérifier que le client existe
    const { data: existingGuest, error: checkError } = await supabase
      .from("hotel_guests")
      .select("id, guest_name")
      .eq("id", id)
      .single()

    if (checkError || !existingGuest) {
      return NextResponse.json({ error: "Client hébergé non trouvé" }, { status: 404 })
    }

    // Soft delete : désactiver le client au lieu de le supprimer
    const { data, error } = await supabase
      .from("hotel_guests")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Hotel Guest Delete] ❌ Erreur:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[Hotel Guest Delete] ✅ Client désactivé:", existingGuest.guest_name)

    return NextResponse.json({
      data,
      message: "Client désactivé avec succès"
    })
  } catch (error) {
    console.error("[Hotel Guest Delete] Error deleting hotel guest:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
