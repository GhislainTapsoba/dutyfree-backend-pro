import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des rôles
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("roles").select("*").order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching roles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un rôle
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier que c'est un admin
    const { data: userProfile } = await supabase.from("users").select("role:roles(code)").eq("id", user.id).single()

    const userRole = Array.isArray(userProfile?.role) ? userProfile.role[0] : userProfile?.role
    if (userRole?.code !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { code, name, description, permissions } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Champs obligatoires: code, name" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("roles")
      .insert({
        code,
        name,
        description,
        permissions: permissions || {},
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code rôle déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
