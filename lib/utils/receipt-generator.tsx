// Générateur de tickets de caisse conforme aux exigences légales

interface ReceiptData {
  ticketNumber: string
  date: Date
  pointOfSale: {
    name: string
    companyName: string
    taxId: string
    address: string
    phone: string
    logo?: string
  }
  cashier: {
    name: string
    id: string
  }
  items: Array<{
    code: string
    nameFr: string
    nameEn: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  taxAmount: number
  taxRate: number
  discount: number
  total: number
  payments: Array<{
    method: string
    amount: number
    currency: string
  }>
  headerMessage?: string
  footerMessage?: string
}

export function generateReceiptText(data: ReceiptData): string {
  const lines: string[] = []
  const width = 48 // Largeur standard ticket thermique

  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2))
    return " ".repeat(padding) + text
  }

  const line = (char = "-") => char.repeat(width)

  const formatPrice = (amount: number, currency = "XOF") => {
    return `${amount.toLocaleString("fr-FR")} ${currency}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // En-tête
  if (data.headerMessage) {
    lines.push(center(data.headerMessage))
    lines.push("")
  }

  lines.push(center(data.pointOfSale.companyName))
  lines.push(center(data.pointOfSale.name))
  lines.push(center(data.pointOfSale.address))
  lines.push(center(`Tél: ${data.pointOfSale.phone}`))
  lines.push(center(`NIF: ${data.pointOfSale.taxId}`))
  lines.push(line("="))

  // Infos ticket
  lines.push(`Ticket N°: ${data.ticketNumber}`)
  lines.push(`Date: ${formatDate(data.date)}`)
  lines.push(`Vendeur: ${data.cashier.name} (${data.cashier.id})`)
  lines.push(line())

  // Articles
  data.items.forEach((item) => {
    // Ligne 1: Code et nom français
    lines.push(`${item.code} ${item.nameFr}`)
    // Ligne 2: Nom anglais (en italique conceptuellement)
    if (item.nameEn && item.nameEn !== item.nameFr) {
      lines.push(`  ${item.nameEn}`)
    }
    // Ligne 3: Quantité x Prix = Total
    const qtyPrice = `${item.quantity} x ${formatPrice(item.unitPrice)}`
    const total = formatPrice(item.totalPrice)
    const spacing = width - qtyPrice.length - total.length
    lines.push(`${qtyPrice}${" ".repeat(Math.max(1, spacing))}${total}`)
  })

  lines.push(line())

  // Totaux
  const addTotal = (label: string, amount: number, bold = false) => {
    const amountStr = formatPrice(amount)
    const spacing = width - label.length - amountStr.length
    const line = `${label}${" ".repeat(Math.max(1, spacing))}${amountStr}`
    lines.push(bold ? line.toUpperCase() : line)
  }

  addTotal("Sous-total HT:", data.subtotal - data.taxAmount)
  addTotal(`TVA (${data.taxRate}%)`, data.taxAmount)
  if (data.discount > 0) {
    addTotal("Remise:", -data.discount)
  }
  lines.push(line("="))
  addTotal("TOTAL TTC:", data.total, true)
  lines.push(line())

  // Paiements
  lines.push("PAIEMENT(S):")
  data.payments.forEach((payment) => {
    const methodLabels: Record<string, string> = {
      cash: "Espèces",
      card: "Carte bancaire",
      mobile_money: "Mobile Money",
    }
    addTotal(`  ${methodLabels[payment.method] || payment.method}:`, payment.amount)
  })

  lines.push(line())

  // Pied de page
  if (data.footerMessage) {
    lines.push("")
    lines.push(center(data.footerMessage))
  }

  lines.push("")
  lines.push(center("Merci de votre visite !"))
  lines.push(center("Thank you for your visit!"))
  lines.push(center("Au plaisir de vous revoir"))

  return lines.join("\n")
}

export function generateReceiptHTML(data: ReceiptData): string {
  const formatPrice = (amount: number, currency = "XOF") => {
    return `${amount.toLocaleString("fr-FR")} ${currency}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 5mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 5px 0; }
    .double-line { border-top: 2px solid #000; margin: 5px 0; }
    .item { margin: 3px 0; }
    .item-detail { display: flex; justify-content: space-between; }
    .item-name-en { font-style: italic; color: #666; margin-left: 10px; }
    .total-row { display: flex; justify-content: space-between; }
    .grand-total { font-size: 14px; font-weight: bold; }
    .header-message { font-weight: bold; margin-bottom: 10px; }
    .footer { margin-top: 10px; font-size: 11px; }
    .logo { max-width: 60mm; margin: 0 auto 10px; display: block; }
  </style>
</head>
<body>
  ${data.pointOfSale.logo ? `<img src="${data.pointOfSale.logo}" class="logo" alt="Logo">` : ""}
  
  ${data.headerMessage ? `<div class="center header-message">${data.headerMessage}</div>` : ""}
  
  <div class="center bold">${data.pointOfSale.companyName}</div>
  <div class="center">${data.pointOfSale.name}</div>
  <div class="center">${data.pointOfSale.address}</div>
  <div class="center">Tél: ${data.pointOfSale.phone}</div>
  <div class="center">NIF: ${data.pointOfSale.taxId}</div>
  
  <div class="double-line"></div>
  
  <div>Ticket N°: ${data.ticketNumber}</div>
  <div>Date: ${formatDate(data.date)}</div>
  <div>Vendeur: ${data.cashier.name} (${data.cashier.id})</div>
  
  <div class="line"></div>
  
  ${data.items
    .map(
      (item) => `
    <div class="item">
      <div><strong>${item.code}</strong> ${item.nameFr}</div>
      ${item.nameEn && item.nameEn !== item.nameFr ? `<div class="item-name-en">${item.nameEn}</div>` : ""}
      <div class="item-detail">
        <span>${item.quantity} x ${formatPrice(item.unitPrice)}</span>
        <span>${formatPrice(item.totalPrice)}</span>
      </div>
    </div>
  `,
    )
    .join("")}
  
  <div class="line"></div>
  
  <div class="total-row">
    <span>Sous-total HT:</span>
    <span>${formatPrice(data.subtotal - data.taxAmount)}</span>
  </div>
  <div class="total-row">
    <span>TVA (${data.taxRate}%):</span>
    <span>${formatPrice(data.taxAmount)}</span>
  </div>
  ${
    data.discount > 0
      ? `
  <div class="total-row">
    <span>Remise:</span>
    <span>-${formatPrice(data.discount)}</span>
  </div>
  `
      : ""
  }
  
  <div class="double-line"></div>
  
  <div class="total-row grand-total">
    <span>TOTAL TTC:</span>
    <span>${formatPrice(data.total)}</span>
  </div>
  
  <div class="line"></div>
  
  <div class="bold">PAIEMENT(S):</div>
  ${data.payments
    .map((p) => {
      const labels: Record<string, string> = { cash: "Espèces", card: "Carte bancaire", mobile_money: "Mobile Money" }
      return `<div class="total-row"><span>${labels[p.method] || p.method}:</span><span>${formatPrice(p.amount, p.currency)}</span></div>`
    })
    .join("")}
  
  <div class="footer center">
    ${data.footerMessage ? `<div>${data.footerMessage}</div>` : ""}
    <div>Merci de votre visite !</div>
    <div>Thank you for your visit!</div>
    <div>Au plaisir de vous revoir</div>
  </div>
</body>
</html>
  `
}
