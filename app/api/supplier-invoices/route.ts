import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des factures fournisseurs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const supplierId = searchParams.get("supplier_id")

    const offset = (page - 1) * limit

    let query = supabase.from("supplier_invoices").select(
      `
        *,
        supplier:suppliers(id, code, name),
        purchase_order:purchase_orders(order_number),
        goods_receipt:goods_receipts(receipt_number)
      `,
      { count: "exact" }
    )

    if (status) {
      query = query.eq("status", status)
    }

    if (supplierId) {
      query = query.eq("supplier_id", supplierId)
    }

    query = query.order("invoice_date", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching supplier invoices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une facture fournisseur
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

    const {
      supplier_id,
      purchase_order_id,
      goods_receipt_id,
      invoice_number,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      discount_amount,
      other_charges,
      currency_code,
      notes,
    } = body

    if (!supplier_id || !invoice_number || !invoice_date) {
      return NextResponse.json(
        { error: "Champs obligatoires: supplier_id, invoice_number, invoice_date" },
        { status: 400 }
      )
    }

    // Vérifier unicité invoice_number par fournisseur
    const { data: existing } = await supabase
      .from("supplier_invoices")
      .select("id")
      .eq("supplier_id", supplier_id)
      .eq("invoice_number", invoice_number)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Ce numéro de facture existe déjà pour ce fournisseur" },
        { status: 409 }
      )
    }

    const total =
      (subtotal || 0) + (tax_amount || 0) + (other_charges || 0) - (discount_amount || 0)

    const { data, error } = await supabase
      .from("supplier_invoices")
      .insert({
        supplier_id,
        purchase_order_id,
        goods_receipt_id,
        invoice_number,
        invoice_date,
        due_date,
        subtotal: subtotal || 0,
        tax_amount: tax_amount || 0,
        discount_amount: discount_amount || 0,
        other_charges: other_charges || 0,
        total,
        currency_code: currency_code || "XOF",
        status: "pending",
        notes,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error creating supplier invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
