// Types pour la base de données Duty Free

export interface PointOfSale {
  id: string
  code: string
  name: string
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  exchange_rate: number
  is_default: boolean
  is_active: boolean
  updated_at: string
}

export interface PaymentMethod {
  id: string
  code: string
  name: string
  type: "cash" | "card" | "mobile_money" | "tpe"
  is_active: boolean
  created_at: string
}

export interface Role {
  id: string
  code: string
  name: string
  description: string | null
  permissions: Record<string, boolean>
  created_at: string
}

export interface User {
  id: string
  employee_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role_id: string | null
  point_of_sale_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  role?: Role
  point_of_sale?: PointOfSale
}

export interface Supplier {
  id: string
  code: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  country: string | null
  tax_id: string | null
  payment_terms: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductCategory {
  id: string
  code: string
  name_fr: string
  name_en: string
  parent_id: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  children?: ProductCategory[]
}

export interface Product {
  id: string
  code: string
  barcode: string | null
  name_fr: string
  name_en: string
  description_fr: string | null
  description_en: string | null
  category_id: string | null
  supplier_id: string | null
  purchase_price: number
  selling_price_xof: number
  selling_price_eur: number | null
  selling_price_usd: number | null
  tax_rate: number
  is_tax_included: boolean
  min_stock_level: number
  max_stock_level: number
  image_url: string | null
  is_active: boolean
  is_promotional: boolean
  created_at: string
  updated_at: string
  category?: ProductCategory
  supplier?: Supplier
  current_stock?: number
}

export interface ProductLot {
  id: string
  lot_number: string
  product_id: string
  customs_ledger_id: string | null
  storage_location_id: string | null
  initial_quantity: number
  current_quantity: number
  purchase_price: number | null
  approach_costs: number
  total_cost: number | null
  expiry_date: string | null
  received_date: string
  status: "available" | "depleted" | "expired" | "blocked"
  created_at: string
  updated_at: string
  product?: Product
}

export interface CustomsLedger {
  id: string
  ledger_number: string
  point_of_sale_id: string | null
  start_date: string
  end_date: string | null
  status: "open" | "closed" | "purged"
  purge_deadline: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  lot_id: string | null
  point_of_sale_id: string | null
  movement_type: "entry" | "exit" | "adjustment" | "transfer" | "waste" | "return"
  quantity: number
  previous_stock: number | null
  new_stock: number | null
  reference_type: string | null
  reference_id: string | null
  reason: string | null
  user_id: string | null
  created_at: string
  product?: Product
}

export interface CashRegister {
  id: string
  code: string
  name: string
  point_of_sale_id: string | null
  is_active: boolean
  created_at: string
}

export interface CashSession {
  id: string
  session_number: string
  cash_register_id: string
  user_id: string
  opening_time: string
  closing_time: string | null
  opening_cash: number
  closing_cash: number | null
  expected_cash: number | null
  cash_variance: number | null
  status: "open" | "closed" | "validated"
  notes: string | null
  created_at: string
  updated_at: string
  cash_register?: CashRegister
  user?: User
}

export interface Sale {
  id: string
  ticket_number: string
  cash_session_id: string | null
  cash_register_id: string | null
  point_of_sale_id: string | null
  seller_id: string | null
  customer_name: string | null
  flight_reference: string | null
  airline: string | null
  destination: string | null
  boarding_pass_data: Record<string, unknown> | null
  subtotal: number
  discount_amount: number
  discount_type: string | null
  discount_reason: string | null
  tax_amount: number
  total_ht: number
  total_ttc: number
  currency_code: string
  exchange_rate: number
  status: "pending" | "completed" | "cancelled" | "refunded"
  header_message: string | null
  footer_message: string | null
  sale_date: string
  created_at: string
  updated_at: string
  lines?: SaleLine[]
  payments?: Payment[]
  seller?: User
}

export interface SaleLine {
  id: string
  sale_id: string
  product_id: string
  lot_id: string | null
  quantity: number
  unit_price: number
  discount_percentage: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  line_total: number
  created_at: string
  product?: Product
}

export interface Payment {
  id: string
  sale_id: string
  cash_session_id: string | null
  payment_method_id: string
  amount: number
  currency_code: string
  exchange_rate: number
  amount_in_base_currency: number
  card_last_digits: string | null
  authorization_code: string | null
  tpe_reference: string | null
  mobile_number: string | null
  transaction_reference: string | null
  status: "pending" | "completed" | "failed" | "refunded"
  created_at: string
  payment_method?: PaymentMethod
}

export interface Promotion {
  id: string
  code: string
  name: string
  description: string | null
  discount_type: "percentage" | "fixed" | "buy_x_get_y"
  discount_value: number
  min_purchase_amount: number | null
  max_discount_amount: number | null
  applicable_to: "all" | "category" | "product"
  applicable_ids: string[] | null
  start_date: string
  end_date: string
  is_active: boolean
  usage_limit: number | null
  usage_count: number
  created_at: string
  updated_at: string
}

export interface LoyaltyCard {
  id: string
  card_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  points_balance: number
  total_points_earned: number
  total_amount_spent: number
  tier: "standard" | "silver" | "gold" | "platinum"
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  order_number: string
  supplier_id: string
  point_of_sale_id: string | null
  status: "draft" | "sent" | "confirmed" | "partially_received" | "received" | "cancelled"
  order_date: string
  expected_delivery_date: string | null
  subtotal: number
  approach_costs: number
  total: number
  currency_code: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  supplier?: Supplier
  lines?: PurchaseOrderLine[]
}

export interface PurchaseOrderLine {
  id: string
  purchase_order_id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_price: number
  line_total: number
  created_at: string
  product?: Product
}

export interface Inventory {
  id: string
  code: string
  point_of_sale_id: string | null
  inventory_date: string
  status: "draft" | "in_progress" | "completed" | "validated"
  started_by: string | null
  validated_by: string | null
  started_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  lines?: InventoryLine[]
}

export interface InventoryLine {
  id: string
  inventory_id: string
  product_id: string
  lot_id: string | null
  theoretical_quantity: number
  counted_quantity: number | null
  variance: number | null
  counted_by: string | null
  counted_at: string | null
  notes: string | null
  product?: Product
}

export interface AirportPassengerData {
  id: string
  year: number
  month: number
  total_passengers: number
  departing_passengers: number | null
  arriving_passengers: number | null
  transit_passengers: number | null
  notes: string | null
  entered_by: string | null
  created_at: string
  updated_at: string
}

export interface CompanyInfo {
  id: string
  name: string
  legal_name: string | null
  tax_id: string | null
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  updated_at: string
}

// Types pour les rapports
export interface SalesReport {
  period: string
  total_sales: number
  total_ttc: number
  total_ht: number
  total_tax: number
  total_discount: number
  average_ticket: number
  by_payment_method: { method: string; amount: number; count: number }[]
  by_category: { category: string; amount: number; quantity: number }[]
  by_seller: { seller: string; amount: number; ticket_count: number }[]
}

export interface StockReport {
  total_products: number
  total_value: number
  low_stock_items: Product[]
  movements_summary: {
    entries: number
    exits: number
    adjustments: number
  }
  by_category: { category: string; quantity: number; value: number }[]
}
