import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// POST - Initier un paiement Mobile Money
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    const { amount, currency_code, phone_number, provider, sale_id } = body

    if (!amount || !currency_code || !phone_number || !provider) {
      return NextResponse.json({ 
        error: "amount, currency_code, phone_number et provider requis" 
      }, { status: 400 })
    }

    const transactionRef = `MM${Date.now()}`

    // TODO: Intégration avec Orange Money / Moov Money
    // Orange Money API: https://developer.orange.com/apis/orange-money-webpay/
    // Moov Money: Contacter Moov Africa pour l'API
    
    // Exemple Orange Money:
    // const response = await fetch('https://api.orange.com/orange-money-webpay/dev/v1/webpayment', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.ORANGE_MONEY_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     merchant_key: process.env.ORANGE_MERCHANT_KEY,
    //     currency: currency_code,
    //     order_id: transactionRef,
    //     amount: amount,
    //     return_url: `${process.env.APP_URL}/api/payments/mobile/callback`,
    //     cancel_url: `${process.env.APP_URL}/pos`,
    //     notif_url: `${process.env.APP_URL}/api/payments/mobile/webhook`,
    //     lang: 'fr',
    //     reference: transactionRef
    //   })
    // })

    // Simulation
    const mockResponse = {
      transaction_reference: transactionRef,
      status: "pending",
      message: `Code de confirmation envoyé au ${phone_number}`,
      provider,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    }

    if (sale_id) {
      await supabase.from("payments").insert({
        sale_id,
        payment_method_id: (await supabase
          .from("payment_methods")
          .select("id")
          .eq("code", "MOBILE")
          .single()).data?.id,
        amount,
        currency_code,
        mobile_number: phone_number,
        transaction_reference: transactionRef,
        status: "pending"
      })
    }

    return NextResponse.json({ data: mockResponse })
  } catch (error: any) {
    console.error("Error initiating mobile payment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
