import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    let query = supabase
      .from("users")
      .select(`
        *,
        role:roles(id, code, name, permissions),
        point_of_sale:point_of_sales(id, code, name)
      `)
    
    if (userId) {
      query = query.eq("id", userId)
    } else {
      // Fallback: retourner le premier admin
      console.log('[/api/users/me] No user_id, returning first admin')
      const { data: adminRole } = await supabase.from("roles").select("id").eq("code", "admin").single()
      if (adminRole) {
        query = query.eq("role_id", adminRole.id).limit(1)
      }
    }
    
    const { data, error } = await query.maybeSingle()

    if (error || !data) {
      console.error("[/api/users/me] Profil non trouvé", error)
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
