-- Tables additionnelles pour le système Duty Free complet

-- Informations passagers (depuis carte d'embarquement)
CREATE TABLE IF NOT EXISTS passenger_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id),
  passenger_name VARCHAR(255),
  flight_number VARCHAR(20),
  airline VARCHAR(100),
  destination VARCHAR(100),
  boarding_pass_ref VARCHAR(100),
  seat_number VARCHAR(10),
  travel_class VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Données externes (passagers mensuels aéroport, etc.)
CREATE TABLE IF NOT EXISTS external_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type VARCHAR(50) NOT NULL, -- 'monthly_passengers', 'flight_count', etc.
  data_date DATE NOT NULL,
  value DECIMAL(15, 2) NOT NULL,
  source VARCHAR(255), -- 'aeroport_ouagadougou'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data_type, data_date)
);

-- Fiches techniques produits
CREATE TABLE IF NOT EXISTS technical_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) NOT NULL,
  ingredients TEXT,
  allergens TEXT[],
  nutritional_info JSONB,
  storage_conditions TEXT,
  origin_country VARCHAR(100),
  certifications TEXT[],
  customs_code VARCHAR(50), -- Code douanier HS
  net_weight DECIMAL(10, 3),
  gross_weight DECIMAL(10, 3),
  dimensions JSONB, -- {length, width, height, unit}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menus/Formules (petit déjeuner, dîner, etc.)
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  menu_type VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'snack'
  price_xof DECIMAL(12, 2) NOT NULL,
  price_eur DECIMAL(12, 2),
  price_usd DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT true,
  available_from TIME,
  available_until TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles dans les menus
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES menus(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER DEFAULT 1,
  is_optional BOOLEAN DEFAULT false
);

-- Sessions hors ligne (mode déconnecté)
CREATE TABLE IF NOT EXISTS offline_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID REFERENCES cash_registers(id) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'syncing', 'synced', 'error'
  data_payload JSONB, -- Données collectées hors ligne
  synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal des activités système
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type VARCHAR(50) NOT NULL, -- 'error', 'warning', 'info', 'audit'
  module VARCHAR(100), -- 'sales', 'stock', 'payments', etc.
  action VARCHAR(255),
  details JSONB,
  user_id UUID REFERENCES users(id),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_passenger_info_sale ON passenger_info(sale_id);
CREATE INDEX IF NOT EXISTS idx_external_data_type_date ON external_data(data_type, data_date);
CREATE INDEX IF NOT EXISTS idx_technical_sheets_product ON technical_sheets(product_id);
CREATE INDEX IF NOT EXISTS idx_offline_sessions_register ON offline_sessions(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_offline_sessions_status ON offline_sessions(sync_status);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);

-- RLS pour les nouvelles tables
ALTER TABLE passenger_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Policies basiques (lecture pour utilisateurs authentifiés)
CREATE POLICY "Authenticated users can read passenger_info" ON passenger_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert passenger_info" ON passenger_info FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read external_data" ON external_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage external_data" ON external_data FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read technical_sheets" ON technical_sheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage technical_sheets" ON technical_sheets FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read menus" ON menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage menus" ON menus FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read menu_items" ON menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage menu_items" ON menu_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage offline_sessions" ON offline_sessions FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read system_logs" ON system_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert logs" ON system_logs FOR INSERT TO authenticated WITH CHECK (true);
