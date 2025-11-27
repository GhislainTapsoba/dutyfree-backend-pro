import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Récupérer les paramètres système
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.from("system_settings").select("*")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transformer en objet clé-valeur
    const settings: Record<string, unknown> = {}
    data?.forEach((setting) => {
      let value: unknown = setting.value
      if (setting.value_type === "number") {
        value = Number.parseFloat(setting.value)
      } else if (setting.value_type === "boolean") {
        value = setting.value === "true"
      } else if (setting.value_type === "json") {
        try {
          value = JSON.parse(setting.value)
        } catch {
          value = setting.value
        }
      }
      settings[setting.key] = value
    })

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour les paramètres système
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

    // Vérifier que c'est un admin
    const { data: userProfile } = await supabase.from("users").select("role:roles(code)").eq("id", user.id).single()

    const userRole = Array.isArray(userProfile?.role) ? userProfile.role[0] : userProfile?.role
    if (userRole?.code !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { settings } = body

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 })
    }

    // Mettre à jour chaque paramètre
    for (const [key, value] of Object.entries(settings)) {
      let valueType = "string"
      let stringValue = String(value)

      if (typeof value === "number") {
        valueType = "number"
      } else if (typeof value === "boolean") {
        valueType = "boolean"
      } else if (typeof value === "object") {
        valueType = "json"
        stringValue = JSON.stringify(value)
      }

      await supabase.from("system_settings").upsert(
        {
          key,
          value: stringValue,
          value_type: valueType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
    }

    // Log activité
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      action: "update_settings",
      entity_type: "system_settings",
      details: { updated_keys: Object.keys(settings) },
    })

    return NextResponse.json({ message: "Paramètres mis à jour" })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
