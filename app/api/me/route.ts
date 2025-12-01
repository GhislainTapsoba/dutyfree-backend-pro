import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // ✅ EXTRAIT Bearer token du header (comme ton client fait)
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    console.log('[DEBUG] Bearer token extrait:', token ? 'OK' : 'NULL')

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // ✅ VALIDATION JWT avec Supabase (comme getAuthenticatedUser interne)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.log('[DEBUG] JWT invalide')
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { data, error: profileError } = await supabase
      .from("users")
      .select(`
        *,
        role:roles(id, code, name, permissions),
        point_of_sale:point_of_sales(id, code, name)
      `)
      .eq("id", user.id)
      .single()

    if (profileError || !data) {
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 })
    }

    return NextResponse.json({
      id: data.id,
      username: data.employee_id || data.email,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role?.code || "user",
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // ✅ Même extraction Bearer token
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { first_name, last_name, phone } = body
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    if (phone !== undefined) updateData.phone = phone

    const { data, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id)
      .select(`
        *,
        role:roles(id, code, name, permissions),
        point_of_sale:point_of_sales(id, code, name)
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
