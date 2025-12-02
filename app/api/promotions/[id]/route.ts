import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détails d'une promotion
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Promotion introuvable" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching promotion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour une promotion
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      applicable_to,
      applicable_ids,
      start_date,
      end_date,
      usage_limit,
      is_active,
    } = body

    const updates: any = {}

    if (code !== undefined) updates.code = code
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (discount_type !== undefined) updates.discount_type = discount_type
    if (discount_value !== undefined) updates.discount_value = discount_value
    if (min_purchase_amount !== undefined) updates.min_purchase_amount = min_purchase_amount
    if (max_discount_amount !== undefined) updates.max_discount_amount = max_discount_amount
    if (applicable_to !== undefined) updates.applicable_to = applicable_to
    if (applicable_ids !== undefined) updates.applicable_ids = applicable_ids
    if (start_date !== undefined) updates.start_date = start_date
    if (end_date !== undefined) updates.end_date = end_date
    if (usage_limit !== undefined) updates.usage_limit = usage_limit
    if (is_active !== undefined) updates.is_active = is_active

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("promotions")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Code promotion déjà existant" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Promotion introuvable" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating promotion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer une promotion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase.from("promotions").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Promotion supprimée" })
  } catch (error) {
    console.error("Error deleting promotion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
