import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST /api/offline/sync - Synchroniser les données collectées hors ligne
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { session_id, sales, payments, stock_movements } = body

    // Mettre à jour le statut de la session
    await supabase.from("offline_sessions").update({ sync_status: "syncing" }).eq("id", session_id)

    const errors: string[] = []
    let syncedSales = 0
    let syncedPayments = 0
    let syncedMovements = 0

    // Synchroniser les ventes
    if (sales && sales.length > 0) {
      for (const sale of sales) {
        try {
          // Insérer la vente avec sa date originale
          const { data: newSale, error: saleError } = await supabase
            .from("sales")
            .insert({
              ...sale,
              synced_from_offline: true,
              offline_session_id: session_id,
            })
            .select()
            .single()

          if (saleError) throw saleError

          // Insérer les items de vente
          if (sale.items) {
            const items = sale.items.map((item: any) => ({
              ...item,
              sale_id: newSale.id,
            }))
            await supabase.from("sale_items").insert(items)
          }

          syncedSales++
        } catch (e: any) {
          errors.push(`Sale ${sale.ticket_number}: ${e.message}`)
        }
      }
    }

    // Synchroniser les paiements
    if (payments && payments.length > 0) {
      for (const payment of payments) {
        try {
          await supabase.from("payments").insert({
            ...payment,
            synced_from_offline: true,
          })
          syncedPayments++
        } catch (e: any) {
          errors.push(`Payment: ${e.message}`)
        }
      }
    }

    // Synchroniser les mouvements de stock
    if (stock_movements && stock_movements.length > 0) {
      for (const movement of stock_movements) {
        try {
          await supabase.from("stock_movements").insert({
            ...movement,
            synced_from_offline: true,
          })

          // Mettre à jour le stock du produit
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", movement.product_id)
            .single()

          if (product) {
            const newQuantity =
              movement.movement_type === "in"
                ? product.stock_quantity + movement.quantity
                : product.stock_quantity - movement.quantity

            await supabase.from("products").update({ stock_quantity: newQuantity }).eq("id", movement.product_id)
          }

          syncedMovements++
        } catch (e: any) {
          errors.push(`Stock movement: ${e.message}`)
        }
      }
    }

    // Mettre à jour le statut final
    const finalStatus = errors.length > 0 ? "error" : "synced"
    await supabase
      .from("offline_sessions")
      .update({
        sync_status: finalStatus,
        synced_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", session_id)

    return NextResponse.json({
      success: errors.length === 0,
      synced: {
        sales: syncedSales,
        payments: syncedPayments,
        stock_movements: syncedMovements,
      },
      errors: errors.length > 0 ? errors : null,
    })
  } catch (error) {
    console.error("Error syncing offline data:", error)
    return NextResponse.json({ error: "Failed to sync offline data" }, { status: 500 })
  }
}

// GET /api/offline/sync - Statut des sessions hors ligne
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const registerId = searchParams.get("register_id")
  const status = searchParams.get("status")

  try {
    let query = supabase
      .from("offline_sessions")
      .select(`
        *,
        cash_registers (name, pos_id)
      `)
      .order("created_at", { ascending: false })

    if (registerId) {
      query = query.eq("cash_register_id", registerId)
    }
    if (status) {
      query = query.eq("sync_status", status)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error fetching offline sessions:", error)
    return NextResponse.json({ error: "Failed to fetch offline sessions" }, { status: 500 })
  }
}
