-- =====================================================
-- DUTY FREE MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Aéroport International de Ouagadougou
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLES DE BASE - CONFIGURATION SYSTÈME
-- =====================================================

-- Points de vente (Business Units)
CREATE TABLE point_of_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devises supportées
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(3) UNIQUE NOT NULL, -- EUR, USD, XOF
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(5) NOT NULL,
  exchange_rate DECIMAL(15, 6) NOT NULL DEFAULT 1, -- Taux par rapport à XOF
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modes de paiement
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'card', 'mobile_money', 'tpe')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. GESTION DES UTILISATEURS ET RÔLES
-- =====================================================

-- Rôles utilisateurs
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Utilisateurs (lié à auth.users de Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id VARCHAR(20) UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role_id UUID REFERENCES roles(id),
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historique des activités utilisateurs
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. GESTION DES FOURNISSEURS
-- =====================================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  country VARCHAR(50),
  tax_id VARCHAR(50),
  payment_terms INTEGER DEFAULT 30, -- Jours
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. GESTION DES PRODUITS
-- =====================================================

-- Catégories/Familles de produits
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES product_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produits
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(50) UNIQUE,
  name_fr VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  category_id UUID REFERENCES product_categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  
  -- Prix
  purchase_price DECIMAL(15, 2) DEFAULT 0, -- Prix d'achat HT
  selling_price_xof DECIMAL(15, 2) NOT NULL, -- Prix de vente en XOF
  selling_price_eur DECIMAL(15, 2), -- Prix de vente en EUR
  selling_price_usd DECIMAL(15, 2), -- Prix de vente en USD
  
  -- Taxes
  tax_rate DECIMAL(5, 2) DEFAULT 0, -- Taux de TVA
  is_tax_included BOOLEAN DEFAULT true,
  
  -- Stock
  min_stock_level INTEGER DEFAULT 5,
  max_stock_level INTEGER DEFAULT 100,
  
  -- Médias
  image_url TEXT,
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  is_promotional BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fiches techniques produits
CREATE TABLE product_technical_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  specifications JSONB,
  ingredients TEXT,
  origin_country VARCHAR(50),
  weight DECIMAL(10, 3),
  volume DECIMAL(10, 3),
  dimensions VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. GESTION DES STOCKS - SOMMIERS DOUANIERS
-- =====================================================

-- Sommiers (registres douaniers)
CREATE TABLE customs_ledgers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ledger_number VARCHAR(50) UNIQUE NOT NULL,
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'purged')),
  purge_deadline DATE, -- Date limite d'apurement
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emplacements de stockage
CREATE TABLE storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  zone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lots de produits (pour traçabilité douanière)
CREATE TABLE product_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_number VARCHAR(50) UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id),
  customs_ledger_id UUID REFERENCES customs_ledgers(id),
  storage_location_id UUID REFERENCES storage_locations(id),
  
  initial_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,
  
  purchase_price DECIMAL(15, 2),
  approach_costs DECIMAL(15, 2) DEFAULT 0, -- Frais d'approche
  total_cost DECIMAL(15, 2), -- Coût total (achat + approche)
  
  expiry_date DATE,
  received_date DATE NOT NULL,
  
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'depleted', 'expired', 'blocked')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mouvements de stock
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  lot_id UUID REFERENCES product_lots(id),
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'transfer', 'waste', 'return')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  
  reference_type VARCHAR(30), -- 'purchase_order', 'sale', 'inventory', 'transfer'
  reference_id UUID,
  
  reason TEXT,
  user_id UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventaires
CREATE TABLE inventories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) UNIQUE NOT NULL,
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  inventory_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'validated')),
  started_by UUID REFERENCES users(id),
  validated_by UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lignes d'inventaire
CREATE TABLE inventory_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventories(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  lot_id UUID REFERENCES product_lots(id),
  
  theoretical_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  variance INTEGER GENERATED ALWAYS AS (counted_quantity - theoretical_quantity) STORED,
  
  counted_by UUID REFERENCES users(id),
  counted_at TIMESTAMPTZ,
  notes TEXT
);

-- =====================================================
-- 6. COMMANDES FOURNISSEURS
-- =====================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(30) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled')),
  
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  
  subtotal DECIMAL(15, 2) DEFAULT 0,
  approach_costs DECIMAL(15, 2) DEFAULT 0, -- Transport, assurance, etc.
  total DECIMAL(15, 2) DEFAULT 0,
  currency_code VARCHAR(3) DEFAULT 'XOF',
  
  notes TEXT,
  created_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lignes de commande fournisseur
CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_price DECIMAL(15, 2) NOT NULL,
  line_total DECIMAL(15, 2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bordereaux de réception
CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number VARCHAR(30) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  customs_ledger_id UUID REFERENCES customs_ledgers(id),
  
  receipt_date DATE NOT NULL,
  
  received_by UUID REFERENCES users(id),
  validated_by UUID REFERENCES users(id),
  
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'invoiced')),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lignes de bordereau de réception
CREATE TABLE goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goods_receipt_id UUID REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id UUID REFERENCES purchase_order_lines(id),
  product_id UUID REFERENCES products(id),
  lot_id UUID REFERENCES product_lots(id),
  
  quantity_received INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Factures fournisseurs
CREATE TABLE supplier_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  goods_receipt_id UUID REFERENCES goods_receipts(id),
  
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  subtotal DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'XOF',
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'paid', 'disputed')),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, invoice_number)
);

-- =====================================================
-- 7. GESTION DES CAISSES
-- =====================================================

-- Caisses enregistreuses
CREATE TABLE cash_registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions de caisse (vacations)
CREATE TABLE cash_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_number VARCHAR(30) UNIQUE NOT NULL,
  cash_register_id UUID REFERENCES cash_registers(id),
  user_id UUID REFERENCES users(id),
  
  opening_time TIMESTAMPTZ NOT NULL,
  closing_time TIMESTAMPTZ,
  
  opening_cash DECIMAL(15, 2) DEFAULT 0,
  closing_cash DECIMAL(15, 2),
  
  expected_cash DECIMAL(15, 2),
  cash_variance DECIMAL(15, 2),
  
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'validated')),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. GESTION DES VENTES
-- =====================================================

-- Ventes/Tickets de caisse
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(30) UNIQUE NOT NULL,
  cash_session_id UUID REFERENCES cash_sessions(id),
  cash_register_id UUID REFERENCES cash_registers(id),
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  seller_id UUID REFERENCES users(id),
  
  -- Informations client/passager
  customer_name VARCHAR(100),
  flight_reference VARCHAR(20),
  airline VARCHAR(50),
  destination VARCHAR(100),
  boarding_pass_data JSONB,
  
  -- Montants
  subtotal DECIMAL(15, 2) NOT NULL,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  discount_type VARCHAR(20), -- 'percentage', 'fixed', 'loyalty', 'hotel_guest'
  discount_reason TEXT,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_ht DECIMAL(15, 2) NOT NULL,
  total_ttc DECIMAL(15, 2) NOT NULL,
  
  -- Devise principale de la vente
  currency_code VARCHAR(3) DEFAULT 'XOF',
  exchange_rate DECIMAL(15, 6) DEFAULT 1,
  
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  
  -- Messages ticket
  header_message TEXT,
  footer_message TEXT DEFAULT 'Merci de votre visite et bon voyage!',
  
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lignes de vente
CREATE TABLE sale_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  lot_id UUID REFERENCES product_lots(id),
  
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paiements
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  cash_session_id UUID REFERENCES cash_sessions(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  
  amount DECIMAL(15, 2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(15, 6) DEFAULT 1,
  amount_in_base_currency DECIMAL(15, 2) NOT NULL, -- Montant en XOF
  
  -- Pour les paiements carte
  card_last_digits VARCHAR(4),
  authorization_code VARCHAR(20),
  tpe_reference VARCHAR(50),
  
  -- Pour mobile money
  mobile_number VARCHAR(20),
  transaction_reference VARCHAR(50),
  
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. PROMOTIONS ET FIDÉLITÉ
-- =====================================================

-- Promotions
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'buy_x_get_y')),
  discount_value DECIMAL(10, 2) NOT NULL,
  
  min_purchase_amount DECIMAL(15, 2),
  max_discount_amount DECIMAL(15, 2),
  
  applicable_to VARCHAR(20) DEFAULT 'all' CHECK (applicable_to IN ('all', 'category', 'product')),
  applicable_ids UUID[], -- IDs des catégories ou produits concernés
  
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cartes de fidélité
CREATE TABLE loyalty_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_number VARCHAR(30) UNIQUE NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(100),
  customer_phone VARCHAR(20),
  
  points_balance INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_amount_spent DECIMAL(15, 2) DEFAULT 0,
  
  tier VARCHAR(20) DEFAULT 'standard' CHECK (tier IN ('standard', 'silver', 'gold', 'platinum')),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions de fidélité
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id),
  sale_id UUID REFERENCES sales(id),
  
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjust', 'expire')),
  points INTEGER NOT NULL,
  points_balance_after INTEGER NOT NULL,
  
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients hébergés (avantages hôtel)
CREATE TABLE hotel_guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  badge_number VARCHAR(50),
  professional_card VARCHAR(50),
  chip_card_id VARCHAR(50),
  
  guest_name VARCHAR(100) NOT NULL,
  hotel_name VARCHAR(100),
  check_in_date DATE,
  check_out_date DATE,
  
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  electronic_wallet_balance DECIMAL(15, 2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. FORMULES ET MENUS
-- =====================================================

CREATE TABLE menu_formulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) UNIQUE NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  
  formula_type VARCHAR(30) NOT NULL CHECK (formula_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'combo')),
  
  price_xof DECIMAL(15, 2) NOT NULL,
  price_eur DECIMAL(15, 2),
  price_usd DECIMAL(15, 2),
  
  is_active BOOLEAN DEFAULT true,
  available_from TIME,
  available_until TIME,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produits inclus dans les formules
CREATE TABLE menu_formula_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formula_id UUID REFERENCES menu_formulas(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

-- =====================================================
-- 11. DONNÉES EXTERNES
-- =====================================================

-- Données passagers aéroport (saisie manuelle mensuelle)
CREATE TABLE airport_passenger_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  total_passengers INTEGER NOT NULL,
  departing_passengers INTEGER,
  arriving_passengers INTEGER,
  transit_passengers INTEGER,
  
  notes TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(year, month)
);

-- =====================================================
-- 12. CONFIGURATION ET PARAMÈTRES
-- =====================================================

-- Paramètres système
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(50) UNIQUE NOT NULL,
  value TEXT,
  value_type VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages tickets de caisse
CREATE TABLE receipt_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('header', 'footer', 'promotional')),
  message_fr TEXT NOT NULL,
  message_en TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Informations entreprise (pour tickets)
CREATE TABLE company_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  legal_name VARCHAR(150),
  tax_id VARCHAR(50), -- NIF
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_session ON sales(cash_session_id);
CREATE INDEX idx_sales_pos ON sales(point_of_sale_id);
CREATE INDEX idx_sales_seller ON sales(seller_id);
CREATE INDEX idx_sales_status ON sales(status);

CREATE INDEX idx_sale_lines_product ON sale_lines(product_id);
CREATE INDEX idx_sale_lines_sale ON sale_lines(sale_id);

CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_method ON payments(payment_method_id);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

CREATE INDEX idx_product_lots_product ON product_lots(product_id);
CREATE INDEX idx_product_lots_ledger ON product_lots(customs_ledger_id);

CREATE INDEX idx_cash_sessions_register ON cash_sessions(cash_register_id);
CREATE INDEX idx_cash_sessions_user ON cash_sessions(user_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);

CREATE INDEX idx_user_activity_user ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_date ON user_activity_logs(created_at);

-- =====================================================
-- 14. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour générer un numéro de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
  ticket TEXT;
BEGIN
  prefix := 'TK' || TO_CHAR(NOW(), 'YYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 9) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM sales
  WHERE ticket_number LIKE prefix || '%';
  
  ticket := prefix || LPAD(seq_num::TEXT, 5, '0');
  RETURN ticket;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le stock actuel d'un produit
CREATE OR REPLACE FUNCTION get_product_stock(p_product_id UUID, p_pos_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  total_stock INTEGER;
BEGIN
  SELECT COALESCE(SUM(current_quantity), 0)
  INTO total_stock
  FROM product_lots
  WHERE product_id = p_product_id
    AND status = 'available'
    AND (p_pos_id IS NULL OR storage_location_id IN (
      SELECT id FROM storage_locations WHERE point_of_sale_id = p_pos_id
    ));
  
  RETURN total_stock;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le stock après une vente
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Décrémenter le stock du lot
  UPDATE product_lots
  SET current_quantity = current_quantity - NEW.quantity,
      status = CASE 
        WHEN current_quantity - NEW.quantity <= 0 THEN 'depleted'
        ELSE status
      END,
      updated_at = NOW()
  WHERE id = NEW.lot_id;
  
  -- Enregistrer le mouvement de stock
  INSERT INTO stock_movements (
    product_id, lot_id, point_of_sale_id, movement_type,
    quantity, reference_type, reference_id
  )
  SELECT 
    NEW.product_id,
    NEW.lot_id,
    s.point_of_sale_id,
    'exit',
    NEW.quantity,
    'sale',
    NEW.sale_id
  FROM sales s
  WHERE s.id = NEW.sale_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_after_sale
AFTER INSERT ON sale_lines
FOR EACH ROW
EXECUTE FUNCTION update_stock_after_sale();

-- Fonction pour calculer les totaux d'une vente
CREATE OR REPLACE FUNCTION calculate_sale_totals(p_sale_id UUID)
RETURNS VOID AS $$
DECLARE
  v_subtotal DECIMAL(15, 2);
  v_tax_amount DECIMAL(15, 2);
  v_discount DECIMAL(15, 2);
BEGIN
  SELECT 
    COALESCE(SUM(line_total), 0),
    COALESCE(SUM(tax_amount), 0)
  INTO v_subtotal, v_tax_amount
  FROM sale_lines
  WHERE sale_id = p_sale_id;
  
  SELECT COALESCE(discount_amount, 0)
  INTO v_discount
  FROM sales
  WHERE id = p_sale_id;
  
  UPDATE sales
  SET subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      total_ht = v_subtotal - v_discount,
      total_ttc = v_subtotal - v_discount + v_tax_amount,
      updated_at = NOW()
  WHERE id = p_sale_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 15. DONNÉES INITIALES
-- =====================================================

-- Devises par défaut
INSERT INTO currencies (code, name, symbol, exchange_rate, is_default) VALUES
  ('XOF', 'Franc CFA', 'FCFA', 1, true),
  ('EUR', 'Euro', '€', 655.957, false),
  ('USD', 'Dollar US', '$', 600, false);

-- Modes de paiement par défaut
INSERT INTO payment_methods (code, name, type) VALUES
  ('CASH', 'Espèces', 'cash'),
  ('CARD', 'Carte Bancaire', 'card'),
  ('MOBILE', 'Mobile Money', 'mobile_money'),
  ('TPE', 'Terminal de Paiement', 'tpe');

-- Rôles par défaut
INSERT INTO roles (code, name, description, permissions) VALUES
  ('admin', 'Administrateur', 'Accès complet au système', '{"all": true}'::jsonb),
  ('supervisor', 'Superviseur', 'Supervision des opérations', '{"sales": true, "stock": true, "reports": true, "users": false}'::jsonb),
  ('cashier', 'Caissier', 'Opérations de caisse', '{"sales": true, "stock": false, "reports": false}'::jsonb),
  ('stock_manager', 'Gestionnaire Stock', 'Gestion des stocks et approvisionnements', '{"stock": true, "suppliers": true, "reports": true}'::jsonb);

-- Point de vente par défaut
INSERT INTO point_of_sales (code, name, location) VALUES
  ('POS-MAIN', 'Boutique Principale', 'Terminal Principal - Aéroport International de Ouagadougou');

-- Paramètres système par défaut
INSERT INTO system_settings (key, value, value_type, description) VALUES
  ('default_currency', 'XOF', 'string', 'Devise par défaut'),
  ('tax_rate', '18', 'number', 'Taux de TVA par défaut (%)'),
  ('loyalty_points_per_xof', '100', 'number', 'Points de fidélité par XOF dépensé'),
  ('loyalty_points_value', '1', 'number', 'Valeur en XOF d''un point de fidélité'),
  ('stock_alert_threshold', '5', 'number', 'Seuil d''alerte stock bas'),
  ('receipt_footer_message', 'Merci de votre visite et bon voyage!', 'string', 'Message pied de ticket par défaut');

-- Informations entreprise par défaut
INSERT INTO company_info (name, legal_name, address, phone) VALUES
  ('Duty Free Ouagadougou', 'DUTY FREE OUAGA SARL', 'Aéroport International de Ouagadougou, Burkina Faso', '+226 XX XX XX XX');
