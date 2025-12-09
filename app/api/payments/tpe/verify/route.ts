import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Vérifier le statut d'un paiement TPE
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionRef = searchParams.get("transaction_reference")

    if (!transactionRef) {
      return NextResponse.json({ error: "transaction_reference requis" }, { status: 400 })
    }

    // TODO: Vérifier auprès du fournisseur TPE
    // const status = await fetch(`https://api-tpe.com/verify/${transactionRef}`)

    // Simulation: 80% de succès après 3 secondes
    const isSuccess = Math.random() > 0.2
    
    return NextResponse.json({ 
      data: {
        transaction_reference: transactionRef,
        status: isSuccess ? "completed" : "pending",
        authorization_code: isSuccess ? `AUTH${Math.floor(Math.random() * 1000000)}` : null
      }
    })
  } catch (error: any) {
    console.error("Error verifying TPE payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
