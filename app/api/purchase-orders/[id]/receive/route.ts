import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST - Réceptionner une commande (créer bordereau de réception)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { customs_ledger_id, storage_location_id, lines, notes } = body

    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: "Lignes de réception requises" }, { status: 400 })
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        lines:purchase_order_lines(*)
      `)
      .eq("id", id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 })
    }

    // Générer numéro de bordereau
    const receiptNumber = `GR-${Date.now().toString(36).toUpperCase()}`

    // Créer le bordereau de réception
    const { data: receipt, error: receiptError } = await supabase
      .from("goods_receipts")
      .insert({
        receipt_number: receiptNumber,
        purchase_order_id: id,
        customs_ledger_id,
        receipt_date: new Date().toISOString().split("T")[0],
        received_by: user.id,
        status: "draft",
        notes,
      })
      .select()
      .single()

    if (receiptError) {
      return NextResponse.json({ error: receiptError.message }, { status: 500 })
    }

    // Traiter chaque ligne
    for (const line of lines) {
      const orderLine = order.lines.find((ol: { id: string }) => ol.id === line.purchase_order_line_id)

      if (!orderLine) continue

      // Créer le lot
      const lotNumber = `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

      // Calculer coût unitaire avec frais d'approche répartis
      const approachCostPerUnit =
        order.approach_costs /
        order.lines.reduce((sum: number, l: { quantity_ordered: number }) => sum + l.quantity_ordered, 0)
      const totalCost = orderLine.unit_price + approachCostPerUnit

      const { data: lot } = await supabase
        .from("product_lots")
        .insert({
          lot_number: lotNumber,
          product_id: orderLine.product_id,
          customs_ledger_id,
          storage_location_id,
          initial_quantity: line.quantity_received,
          current_quantity: line.quantity_received,
          purchase_price: orderLine.unit_price,
          approach_costs: approachCostPerUnit * line.quantity_received,
          total_cost: totalCost * line.quantity_received,
          expiry_date: line.expiry_date,
          received_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single()

      // Créer la ligne de bordereau
      await supabase.from("goods_receipt_lines").insert({
        goods_receipt_id: receipt.id,
        purchase_order_line_id: line.purchase_order_line_id,
        product_id: orderLine.product_id,
        lot_id: lot?.id,
        quantity_received: line.quantity_received,
      })

      // Mettre à jour la quantité reçue sur la ligne de commande
      await supabase
        .from("purchase_order_lines")
        .update({
          quantity_received: orderLine.quantity_received + line.quantity_received,
        })
        .eq("id", line.purchase_order_line_id)

      // Enregistrer le mouvement de stock
      if (lot) {
        await supabase.from("stock_movements").insert({
          product_id: orderLine.product_id,
          lot_id: lot.id,
          movement_type: "entry",
          quantity: line.quantity_received,
          previous_stock: 0,
          new_stock: line.quantity_received,
          reference_type: "goods_receipt",
          reference_id: receipt.id,
          user_id: user.id,
        })
      }
    }

    // Mettre à jour le statut de la commande
    const totalOrdered = order.lines.reduce(
      (sum: number, l: { quantity_ordered: number }) => sum + l.quantity_ordered,
      0,
    )
    const totalReceived =
      order.lines.reduce((sum: number, l: { quantity_received: number }) => sum + l.quantity_received, 0) +
      lines.reduce((sum: number, l: { quantity_received: number }) => sum + l.quantity_received, 0)

    const newStatus = totalReceived >= totalOrdered ? "received" : "partially_received"

    await supabase
      .from("purchase_orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)

    return NextResponse.json({ data: receipt }, { status: 201 })
  } catch (error) {
    console.error("Error receiving purchase order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
