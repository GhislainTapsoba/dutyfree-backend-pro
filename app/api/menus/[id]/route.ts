import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser, checkUserRole } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détails d'un menu
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[Menu Details] 📊 Requête pour menu:", id)

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    // Vérifier le rôle (admin, supervisor ou cashier)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin", "supervisor", "cashier"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Rôle insuffisant. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()

    // Récupérer le menu avec ses items
    const { data: menu, error: menuError } = await supabase
      .from("menus")
      .select(`
        *,
        menu_items (
          id,
          quantity,
          is_optional,
          products (
            id,
            name_fr,
            selling_price_xof
          )
        )
      `)
      .eq("id", id)
      .single()

    if (menuError || !menu) {
      console.error("[Menu Details] ❌ Menu non trouvé:", menuError?.message)
      return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 })
    }

    console.log("[Menu Details] ✅ Menu récupéré:", menu.name)

    return NextResponse.json({ data: menu })
  } catch (error) {
    console.error("[Menu Details] Error fetching menu:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Modifier un menu
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[Menu Update] 📝 Modification du menu:", id)

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    // Vérifier le rôle (admin ou supervisor)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin", "supervisor"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Seuls les administrateurs et superviseurs peuvent modifier des menus. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const body = await request.json()

    console.log("[Menu Update] 📦 Body reçu:", JSON.stringify(body, null, 2))

    const {
      name,
      description,
      menu_type,
      price_xof,
      price_eur,
      price_usd,
      is_active,
      available_from,
      available_until,
      items,
    } = body

    // Vérifier que le menu existe
    const { data: existingMenu, error: checkError } = await supabase
      .from("menus")
      .select("id")
      .eq("id", id)
      .single()

    if (checkError || !existingMenu) {
      return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 })
    }

    // Mettre à jour le menu
    const { data, error } = await supabase
      .from("menus")
      .update({
        name,
        description,
        menu_type,
        price_xof,
        price_eur,
        price_usd,
        is_active,
        available_from,
        available_until,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Menu Update] ❌ Erreur:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Si des items sont fournis, les mettre à jour
    if (items && Array.isArray(items)) {
      // Supprimer les anciens items
      await supabase.from("menu_items").delete().eq("menu_id", id)

      // Insérer les nouveaux items
      if (items.length > 0) {
        const menuItems = items.map((item: any) => ({
          menu_id: id,
          product_id: item.product_id,
          quantity: item.quantity || 1,
          is_optional: item.is_optional || false,
        }))

        const { error: itemsError } = await supabase.from("menu_items").insert(menuItems)

        if (itemsError) {
          console.error("[Menu Update] ❌ Erreur items:", itemsError)
        }
      }
    }

    console.log("[Menu Update] ✅ Menu modifié:", name)

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[Menu Update] Error updating menu:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer un menu (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("[Menu Delete] 🗑️ Suppression du menu:", id)

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error("[Menu Delete] ❌ Authentification échouée")
      return NextResponse.json({
        error: "Non autorisé",
        details: "Authentification requise"
      }, { status: 401 })
    }

    // Vérifier le rôle (admin uniquement)
    const { authorized, roleCode } = await checkUserRole(user.id, ["admin"])

    if (!authorized) {
      return NextResponse.json({
        error: "Accès refusé",
        details: `Seuls les administrateurs peuvent supprimer des menus. Votre rôle: ${roleCode || "non défini"}`
      }, { status: 403 })
    }

    const supabase = await createAdminClient()

    // Vérifier que le menu existe
    const { data: existingMenu, error: checkError } = await supabase
      .from("menus")
      .select("id, name")
      .eq("id", id)
      .single()

    if (checkError || !existingMenu) {
      return NextResponse.json({ error: "Menu non trouvé" }, { status: 404 })
    }

    // Soft delete : désactiver le menu au lieu de le supprimer
    const { data, error } = await supabase
      .from("menus")
      .update({
        is_active: false,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Menu Delete] ❌ Erreur:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[Menu Delete] ✅ Menu désactivé:", existingMenu.name)

    return NextResponse.json({
      data,
      message: "Menu désactivé avec succès"
    })
  } catch (error) {
    console.error("[Menu Delete] Error deleting menu:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
