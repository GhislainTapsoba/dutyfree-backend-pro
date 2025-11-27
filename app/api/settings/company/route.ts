import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Informations entreprise
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("company_info").select("*").limit(1).single()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || null })
  } catch (error) {
    console.error("Error fetching company info:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour les informations entreprise
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { data: userProfile } = await supabase.from("users").select("role:roles(code)").eq("id", user.id).single()

    const userRole = Array.isArray(userProfile?.role) ? userProfile.role[0] : userProfile?.role
    if (userRole?.code !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { name, legal_name, tax_id, address, phone, email, logo_url } = body

    // Vérifier si une entrée existe déjà
    const { data: existing } = await supabase.from("company_info").select("id").limit(1).single()

    const companyData = {
      name,
      legal_name,
      tax_id,
      address,
      phone,
      email,
      logo_url,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing) {
      result = await supabase.from("company_info").update(companyData).eq("id", existing.id).select().single()
    } else {
      result = await supabase.from("company_info").insert(companyData).select().single()
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error("Error updating company info:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
