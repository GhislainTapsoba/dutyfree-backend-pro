import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Détails facture
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("supplier_invoices")
      .select(
        `
        *,
        supplier:suppliers(*),
        purchase_order:purchase_orders(*),
        goods_receipt:goods_receipts(*)
      `
      )
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching supplier invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Mettre à jour facture
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      discount_amount,
      other_charges,
      status,
      payment_date,
      payment_method,
      payment_reference,
      notes,
    } = body

    const updates: any = {}

    if (invoice_date) updates.invoice_date = invoice_date
    if (due_date) updates.due_date = due_date
    if (subtotal !== undefined) updates.subtotal = subtotal
    if (tax_amount !== undefined) updates.tax_amount = tax_amount
    if (discount_amount !== undefined) updates.discount_amount = discount_amount
    if (other_charges !== undefined) updates.other_charges = other_charges
    if (status) updates.status = status
    if (payment_date) updates.payment_date = payment_date
    if (payment_method) updates.payment_method = payment_method
    if (payment_reference) updates.payment_reference = payment_reference
    if (notes !== undefined) updates.notes = notes

    // Recalculer total si montants modifiés
    if (subtotal !== undefined || tax_amount !== undefined || discount_amount !== undefined || other_charges !== undefined) {
      const { data: currentInvoice } = await supabase
        .from("supplier_invoices")
        .select("subtotal, tax_amount, discount_amount, other_charges")
        .eq("id", id)
        .single()

      updates.total =
        (updates.subtotal ?? currentInvoice?.subtotal ?? 0) +
        (updates.tax_amount ?? currentInvoice?.tax_amount ?? 0) +
        (updates.other_charges ?? currentInvoice?.other_charges ?? 0) -
        (updates.discount_amount ?? currentInvoice?.discount_amount ?? 0)
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("supplier_invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error updating supplier invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer facture
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase.from("supplier_invoices").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Facture supprimée" })
  } catch (error) {
    console.error("Error deleting supplier invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
