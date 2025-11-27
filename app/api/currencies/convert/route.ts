import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST - Convertir un montant entre devises
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { amount, from_currency, to_currency } = body

    if (!amount || !from_currency || !to_currency) {
      return NextResponse.json({ error: "Champs obligatoires: amount, from_currency, to_currency" }, { status: 400 })
    }

    // Récupérer les deux devises
    const { data: currencies } = await supabase
      .from("currencies")
      .select("code, exchange_rate")
      .in("code", [from_currency.toUpperCase(), to_currency.toUpperCase()])

    if (!currencies || currencies.length < 2) {
      return NextResponse.json({ error: "Devise(s) non trouvée(s)" }, { status: 404 })
    }

    const fromCurrency = currencies.find((c) => c.code === from_currency.toUpperCase())
    const toCurrency = currencies.find((c) => c.code === to_currency.toUpperCase())

    if (!fromCurrency || !toCurrency) {
      return NextResponse.json({ error: "Devise(s) non trouvée(s)" }, { status: 404 })
    }

    // Conversion: d'abord en XOF (base), puis vers la devise cible
    const amountInXof = amount * fromCurrency.exchange_rate
    const convertedAmount = amountInXof / toCurrency.exchange_rate

    return NextResponse.json({
      data: {
        original: {
          amount,
          currency: from_currency.toUpperCase(),
        },
        converted: {
          amount: Math.round(convertedAmount * 100) / 100,
          currency: to_currency.toUpperCase(),
        },
        rate: fromCurrency.exchange_rate / toCurrency.exchange_rate,
      },
    })
  } catch (error) {
    console.error("Error converting currency:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
