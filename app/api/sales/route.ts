import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// GET - Liste des ventes
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const sessionId = searchParams.get("session_id")
    const pointOfSaleId = searchParams.get("pos_id")
    const sellerId = searchParams.get("seller_id")
    const status = searchParams.get("status")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const ticketNumber = searchParams.get("ticket_number")

    const offset = (page - 1) * limit

    let query = supabase.from("sales").select(
      `
        *,
        seller:users!sales_seller_id_fkey(id, first_name, last_name, employee_id),
        cash_register:cash_registers(id, code, name),
        point_of_sale:point_of_sales(id, code, name)
      `,
      { count: "exact" },
    )

    if (sessionId) {
      query = query.eq("cash_session_id", sessionId)
    }

    if (pointOfSaleId) {
      query = query.eq("point_of_sale_id", pointOfSaleId)
    }

    if (sellerId) {
      query = query.eq("seller_id", sellerId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (ticketNumber) {
      query = query.ilike("ticket_number", `%${ticketNumber}%`)
    }

    if (startDate) {
      query = query.gte("sale_date", startDate)
    }

    if (endDate) {
      query = query.lte("sale_date", `${endDate}T23:59:59`)
    }

    query = query.order("sale_date", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching sales:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Créer une vente
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    
    console.log('[Sales POST] Request body:', JSON.stringify(body, null, 2))
    
    // Récupérer un utilisateur valide
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .single()
    
    const user_id = user?.id
    if (!user_id) {
      return NextResponse.json({ error: "Aucun utilisateur disponible" }, { status: 400 })
    }

    const {
      cash_session_id,
      customer_name,
      flight_reference,
      airline,
      destination,
      boarding_pass_data,
      discount_amount,
      discount_type,
      discount_reason,
      currency_code,
      header_message,
      footer_message,
      lines,
      payments,
    } = body

    if (!lines || lines.length === 0) {
      console.log('[Sales POST] Error: No lines provided')
      return NextResponse.json({ error: "Au moins une ligne de vente requise" }, { status: 400 })
    }

    // Vérifier la session (optionnel)
    let sessionData = null
    let cashRegisterId = null
    let pointOfSaleId = null
    
    if (cash_session_id) {
      const { data: session } = await supabase
        .from("cash_sessions")
        .select("*, cash_register:cash_registers(*)")
        .eq("id", cash_session_id)
        .eq("status", "open")
        .single()

      if (session) {
        sessionData = session
        cashRegisterId = session.cash_register_id
        pointOfSaleId = session.cash_register?.point_of_sale_id
      }
    }
    
    // Si pas de session, utiliser le premier point de vente disponible
    if (!pointOfSaleId) {
      const { data: defaultPos } = await supabase
        .from("point_of_sales")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single()
      
      pointOfSaleId = defaultPos?.id
    }

    // Récupérer le taux de change si devise différente de XOF
    let exchangeRate = 1
    if (currency_code && currency_code !== "XOF") {
      const { data: currency } = await supabase
        .from("currencies")
        .select("exchange_rate")
        .eq("code", currency_code)
        .single()

      exchangeRate = currency?.exchange_rate || 1
    }

    // Récupérer les informations des produits et lots
    const productIds = lines.map((l: { product_id: string }) => l.product_id)
    console.log('[Sales POST] Fetching products:', productIds)
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, selling_price_xof, tax_rate")
      .in("id", productIds)
    
    if (productsError) {
      console.error('[Sales POST] Error fetching products:', productsError)
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }
    console.log('[Sales POST] Products found:', products?.length)

    const productsMap = new Map(products?.map((p) => [p.id, p]) || [])

    // Calculer les totaux
    let subtotal = 0
    let totalTax = 0

    const processedLines = []
    for (const line of lines) {
      const product = productsMap.get(line.product_id)
      if (!product) continue

      const unitPrice = line.unit_price || product.selling_price_xof
      const lineDiscount = line.discount_amount || 0
      const lineTotal = unitPrice * line.quantity - lineDiscount
      const taxRate = product.tax_rate || 0
      const taxAmount = lineTotal * (taxRate / 100)

      // Trouver un lot disponible pour ce produit (FIFO)
      let lotId = line.lot_id
      if (!lotId) {
        const { data: availableLot } = await supabase
          .from("product_lots")
          .select("id, current_quantity")
          .eq("product_id", line.product_id)
          .eq("status", "available")
          .gt("current_quantity", 0)
          .order("received_date", { ascending: true })
          .limit(1)
          .single()

        lotId = availableLot?.id
      }

      processedLines.push({
        product_id: line.product_id,
        lot_id: lotId,
        quantity: line.quantity,
        unit_price: unitPrice,
        discount_percentage: line.discount_percentage || 0,
        discount_amount: lineDiscount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        line_total: lineTotal,
      })

      subtotal += lineTotal
      totalTax += taxAmount
    }

    const totalDiscount = discount_amount || 0
    const totalHT = subtotal - totalDiscount
    const totalTTC = totalHT + totalTax

    // Générer le numéro de ticket via la fonction SQL
    console.log('[Sales POST] Generating ticket number')
    const { data: ticketData, error: ticketError } = await supabase.rpc("generate_ticket_number")
    if (ticketError) {
      console.error('[Sales POST] Error generating ticket:', ticketError)
    }
    const ticketNumber = ticketData || `TK${Date.now()}`
    console.log('[Sales POST] Ticket number:', ticketNumber)

    // Créer la vente
    console.log('[Sales POST] Creating sale with data:', {
      ticket_number: ticketNumber,
      point_of_sale_id: pointOfSaleId,
      seller_id: user_id,
      subtotal,
      total_ttc: totalTTC
    })
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        ticket_number: ticketNumber,
        cash_session_id,
        cash_register_id: cashRegisterId,
        point_of_sale_id: pointOfSaleId,
        seller_id: user_id,
        customer_name,
        flight_reference,
        airline,
        destination,
        boarding_pass_data,
        subtotal,
        discount_amount: totalDiscount,
        discount_type,
        discount_reason,
        tax_amount: totalTax,
        total_ht: totalHT,
        total_ttc: totalTTC,
        currency_code: currency_code || "XOF",
        exchange_rate: exchangeRate,
        header_message,
        footer_message,
        status: "pending",
        sale_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (saleError) {
      console.error('[Sales POST] Error creating sale:', saleError)
      return NextResponse.json({ error: saleError.message, details: saleError }, { status: 500 })
    }
    console.log('[Sales POST] Sale created:', sale.id)

    // Créer les lignes de vente
    const saleLines = processedLines.map((line) => ({
      ...line,
      sale_id: sale.id,
    }))
    console.log('[Sales POST] Inserting sale lines:', saleLines.length)
    const { error: saleLinesError } = await supabase.from("sale_lines").insert(saleLines)
    if (saleLinesError) {
      console.error('[Sales POST] Error inserting sale lines:', saleLinesError)
      return NextResponse.json({ error: saleLinesError.message }, { status: 500 })
    }

    // Traiter les paiements si fournis
    if (payments && payments.length > 0) {
      const processedPayments = []
      let totalPaid = 0

      for (const payment of payments) {
        const paymentExchangeRate = payment.currency_code === "XOF" ? 1 : exchangeRate
        const amountInBase = payment.amount * paymentExchangeRate
        
        // Si payment_method_id est null, récupérer un par défaut
        let paymentMethodId = payment.payment_method_id
        if (!paymentMethodId) {
          const { data: defaultMethod } = await supabase
            .from("payment_methods")
            .select("id")
            .eq("is_active", true)
            .limit(1)
            .single()
          paymentMethodId = defaultMethod?.id
        }

        processedPayments.push({
          sale_id: sale.id,
          cash_session_id,
          payment_method_id: paymentMethodId,
          amount: payment.amount,
          currency_code: payment.currency_code || "XOF",
          exchange_rate: paymentExchangeRate,
          amount_in_base_currency: amountInBase,
          card_last_digits: payment.card_last_digits,
          authorization_code: payment.authorization_code,
          tpe_reference: payment.tpe_reference,
          mobile_number: payment.mobile_number,
          transaction_reference: payment.transaction_reference,
          status: "completed",
        })

        totalPaid += amountInBase
      }

      const { error: paymentsError } = await supabase.from("payments").insert(processedPayments)
      if (paymentsError) {
        console.error('[Sales POST] Error inserting payments:', paymentsError)
      }

      // Mettre à jour le statut si entièrement payé
      if (totalPaid >= totalTTC) {
        await supabase.from("sales").update({ status: "completed" }).eq("id", sale.id)
      }
    }

    // Récupérer la vente complète
    const { data: completeSale } = await supabase
      .from("sales")
      .select(`
        *,
        seller:users!sales_seller_id_fkey(id, first_name, last_name),
        lines:sale_lines(
          *,
          product:products(id, code, name_fr, name_en)
        ),
        payments:payments(
          *,
          payment_method:payment_methods(code, name)
        )
      `)
      .eq("id", sale.id)
      .single()

    return NextResponse.json({ data: completeSale }, { status: 201 })
  } catch (error: any) {
    console.error("[Sales POST] Error creating sale:", error)
    console.error("[Sales POST] Error details:", error.message, error.stack)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 })
  }
}
