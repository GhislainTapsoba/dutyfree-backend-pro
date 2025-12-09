import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Informations entreprise
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase.from("company_info").select("*").limit(1).maybeSingle()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Récupérer les messages de ticket depuis system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["receipt_header_message", "receipt_footer_message"])

    const receiptMessages: any = {}
    if (settings) {
      settings.forEach((s: any) => {
        if (s.key === "receipt_header_message") receiptMessages.header = s.value
        if (s.key === "receipt_footer_message") receiptMessages.footer = s.value
      })
    }

    return NextResponse.json({ 
      data: data ? { ...data, ...receiptMessages } : null 
    })
  } catch (error) {
    console.error("Error fetching company info:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour les informations entreprise
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    console.log("[COMPANY_INFO] Received data:", body)

    const { company_name, company_address, company_phone, company_email, tax_id, logo_url, receipt_header, receipt_footer } = body

    // Vérifier si une entrée existe déjà
    const { data: existing, error: existingError } = await supabase
      .from("company_info")
      .select("id")
      .maybeSingle()

    console.log("[COMPANY_INFO] Existing record:", existing, "Error:", existingError)

    const companyData = {
      name: company_name,
      address: company_address,
      phone: company_phone,
      email: company_email,
      tax_id,
      logo_url,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing) {
      console.log("[COMPANY_INFO] Updating existing record:", existing.id)
      result = await supabase
        .from("company_info")
        .update(companyData)
        .eq("id", existing.id)
        .select()
        .maybeSingle()
    } else {
      console.log("[COMPANY_INFO] Creating new record")
      result = await supabase
        .from("company_info")
        .insert(companyData)
        .select()
        .maybeSingle()
    }

    console.log("[COMPANY_INFO] Result:", result)

    if (result.error) {
      console.error("[COMPANY_INFO] Database error:", result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    // Sauvegarder les messages de ticket dans system_settings
    if (receipt_header !== undefined) {
      await supabase
        .from("system_settings")
        .upsert({ key: "receipt_header_message", value: receipt_header, value_type: "string" }, { onConflict: "key" })
    }
    if (receipt_footer !== undefined) {
      await supabase
        .from("system_settings")
        .upsert({ key: "receipt_footer_message", value: receipt_footer, value_type: "string" }, { onConflict: "key" })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error("[COMPANY_INFO] Error updating company info:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
