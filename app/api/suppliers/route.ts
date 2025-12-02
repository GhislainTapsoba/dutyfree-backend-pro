import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des fournisseurs
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search")
    const isActive = searchParams.get("is_active")

    let query = supabase.from("suppliers").select("*")

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true")
    }

    const { data, error } = await query.order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer un fournisseur
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    console.log("[SUPPLIER CREATE] Request body:", body)

    let { code, name, contact_name, email, phone, address, country, tax_id, payment_terms } = body

    if (!name) {
      console.log("[SUPPLIER CREATE] Missing required fields")
      return NextResponse.json({ error: "Champs obligatoires: name" }, { status: 400 })
    }
    
    // Générer un code automatiquement si non fourni
    if (!code) {
      const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
      const timestamp = Date.now().toString().slice(-6)
      code = `SUP-${prefix}-${timestamp}`
      console.log("[SUPPLIER CREATE] Generated code:", code)
    }
    
    console.log("[SUPPLIER CREATE] Code:", code, "Name:", name)

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        code,
        name,
        contact_name,
        email,
        phone,
        address,
        country,
        tax_id,
        payment_terms: payment_terms || 30,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code fournisseur déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
