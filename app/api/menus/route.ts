import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/menus - Liste des menus/formules
export async function GET(request: NextRequest) {
  console.log("[Menus] 📋 Requête GET pour menus")

  const supabase = await createAdminClient()
  const searchParams = request.nextUrl.searchParams

  const search = searchParams.get("search")

  console.log("[Menus] Paramètres:", { search })

  try {
    let query = supabase
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
      .order("name")

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error("[Menus] ❌ Erreur lors de la requête:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[Menus] ✅ Formules trouvées:", data?.length || 0)

    return NextResponse.json({
      data,
    })
  } catch (error: any) {
    console.error("Error fetching menus:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch menus" }, { status: 500 })
  }
}

// POST /api/menus - Créer un menu/formule
export async function POST(request: NextRequest) {
  try {
    console.log("[Menus] 📝 Tentative de création de menu")

    // Vérifier l'authentification
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error("[Menus] ❌ Authentification échouée")
      return NextResponse.json({
        error: "Non autorisé",
        details: "Token invalide"
      }, { status: 401 })
    }

    console.log("[Menus] ✅ User authentifié:", user.email)

    const supabase = await createAdminClient()

    const body = await request.json()
    console.log("[Menus] 📦 Body reçu:", JSON.stringify(body, null, 2))

    const {
      name,
      description,
      menu_type,
      price_xof,
      price_eur,
      price_usd,
      is_active = true,
      available_from,
      available_until,
      items, // [{product_id, quantity, is_optional}]
    } = body

    // Créer le menu
    const { data: menu, error: menuError } = await supabase
      .from("menus")
      .insert({
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
      .select()
      .single()

    if (menuError) {
      console.error("Error creating menu:", menuError)
      return NextResponse.json({ error: menuError.message }, { status: 500 })
    }

    // Ajouter les items
    if (items && items.length > 0) {
      const menuItems = items.map((item: any) => ({
        menu_id: menu.id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        is_optional: item.is_optional || false,
      }))

      const { error: itemsError } = await supabase.from("menu_items").insert(menuItems)

      if (itemsError) {
        console.error("Error creating menu items:", itemsError)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ data: menu }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating menu:", error)
    return NextResponse.json({ error: error?.message || "Failed to create menu" }, { status: 500 })
  }
}
