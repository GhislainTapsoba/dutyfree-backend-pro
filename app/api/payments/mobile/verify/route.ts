import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Vérifier le statut d'un paiement Mobile Money
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionRef = searchParams.get("transaction_reference")

    if (!transactionRef) {
      return NextResponse.json({ error: "transaction_reference requis" }, { status: 400 })
    }

    // TODO: Vérifier auprès du fournisseur Mobile Money
    // const status = await fetch(`https://api.orange.com/orange-money-webpay/dev/v1/transactionstatus/${transactionRef}`)

    // Simulation: 70% de succès
    const isSuccess = Math.random() > 0.3
    
    return NextResponse.json({ 
      data: {
        transaction_reference: transactionRef,
        status: isSuccess ? "completed" : "pending",
        transaction_id: isSuccess ? `TXN${Math.floor(Math.random() * 1000000)}` : null
      }
    })
  } catch (error: any) {
    console.error("Error verifying mobile payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
