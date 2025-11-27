import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/menus - Liste des menus/formules
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const menuType = searchParams.get("type")
  const activeOnly = searchParams.get("active") !== "false"

  try {
    let query = supabase
      .from("menus")
      .select(`
        *,
        menu_items (
          id,
          quantity,
          is_optional,
          products (id, name, sku, sale_price_xof)
        )
      `)
      .order("name")

    if (activeOnly) {
      query = query.eq("is_active", true)
    }
    if (menuType) {
      query = query.eq("menu_type", menuType)
    }

    // Filtrer par disponibilité horaire
    const now = new Date()
    const currentTime = now.toTimeString().split(" ")[0]

    const { data, error } = await query
    if (error) throw error

    // Filtrer les menus disponibles à l'heure actuelle
    const availableMenus = data?.filter((menu) => {
      if (!menu.available_from || !menu.available_until) return true
      return currentTime >= menu.available_from && currentTime <= menu.available_until
    })

    return NextResponse.json({
      data: availableMenus,
      all_menus: data,
      current_time: currentTime,
    })
  } catch (error) {
    console.error("Error fetching menus:", error)
    return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 })
  }
}

// POST /api/menus - Créer un menu/formule
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const {
      name,
      description,
      menu_type,
      price_xof,
      price_eur,
      price_usd,
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
        available_from,
        available_until,
      })
      .select()
      .single()

    if (menuError) throw menuError

    // Ajouter les items
    if (items && items.length > 0) {
      const menuItems = items.map((item: any) => ({
        menu_id: menu.id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        is_optional: item.is_optional || false,
      }))

      const { error: itemsError } = await supabase.from("menu_items").insert(menuItems)

      if (itemsError) throw itemsError
    }

    return NextResponse.json({ data: menu }, { status: 201 })
  } catch (error) {
    console.error("Error creating menu:", error)
    return NextResponse.json({ error: "Failed to create menu" }, { status: 500 })
  }
}
