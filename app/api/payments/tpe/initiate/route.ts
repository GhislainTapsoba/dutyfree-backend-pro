import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// POST - Initier un paiement TPE
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    const { amount, currency_code, sale_id } = body

    if (!amount || !currency_code) {
      return NextResponse.json({ 
        error: "amount et currency_code requis" 
      }, { status: 400 })
    }

    const transactionRef = `TPE${Date.now()}`

    // TODO: Intégration avec votre fournisseur TPE (Monetbil, CinetPay, etc.)
    // const tpeResponse = await fetch('https://api-tpe.com/initiate', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${process.env.TPE_API_KEY}` },
    //   body: JSON.stringify({ amount, currency: currency_code, reference: transactionRef })
    // })

    // Simulation
    const mockResponse = {
      transaction_reference: transactionRef,
      status: "pending",
      message: "En attente de validation sur le TPE",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    }

    if (sale_id) {
      await supabase.from("payments").insert({
        sale_id,
        payment_method_id: (await supabase
          .from("payment_methods")
          .select("id")
          .eq("code", "TPE")
          .single()).data?.id,
        amount,
        currency_code,
        transaction_reference: transactionRef,
        status: "pending"
      })
    }

    return NextResponse.json({ data: mockResponse })
  } catch (error: any) {
    console.error("Error initiating TPE payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
