// app/api/users/me/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// ========================
// Récupérer l'utilisateur via Supabase
// ========================
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return null

  const token = authHeader.replace("Bearer ", "").trim()
  const supabase = await createClient()

  // Supabase fournit une méthode pour récupérer l'utilisateur à partir du token
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    console.error("Utilisateur non authentifié:", error)
    return null
  }

  return data.user
}

// ========================
// GET - Récupérer le profil
// ========================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        role:roles(id, code, name, permissions),
        point_of_sale:point_of_sales(id, code, name)
      `)
      .eq("id", user.id)
      .single()

    if (error || !data) {
      console.error("[/api/users/me] Profil non trouvé", error)
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 404 })
    }

    return NextResponse.json({
      id: data.id,
      username: data.employee_id || data.email,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role?.code || "guest",
      isActive: data.active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      permissions: data.role?.permissions || [],
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ========================
// PUT - Mettre à jour son profil
// ========================
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { first_name, last_name, phone } = body
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    if (phone !== undefined) updateData.phone = phone

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id)
      .select(`
        *,
        role:roles(id, code, name, permissions),
        point_of_sale:point_of_sales(id, code, name)
      `)
      .single()

    if (error) {
      console.error("[/api/users/me PUT] Erreur update:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[/api/users/me PUT] Erreur interne:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
