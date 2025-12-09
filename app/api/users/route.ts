import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des utilisateurs
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search")
    const roleId = searchParams.get("role_id")
    const pointOfSaleId = searchParams.get("pos_id")
    const isActive = searchParams.get("is_active")

    let query = supabase.from("users").select(`
        *,
        role:roles(id, code, name),
        point_of_sale:point_of_sales(id, code, name)
      `)

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`,
      )
    }

    if (roleId) {
      query = query.eq("role_id", roleId)
    }

    if (pointOfSaleId) {
      query = query.eq("point_of_sale_id", pointOfSaleId)
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true")
    }

    const { data, error } = await query.order("last_name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
