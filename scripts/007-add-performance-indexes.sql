-- Optimisation des performances avec index

-- Index pour les ventes (requêtes les plus fréquentes)
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_cash_session_id ON sales(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_point_of_sale_id ON sales(point_of_sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_ticket_number ON sales(ticket_number);
CREATE INDEX IF NOT EXISTS idx_sales_date_status ON sales(sale_date DESC, status);

-- Index pour les paiements
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_cash_session_id ON payments(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method_id ON payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Index pour les lignes de vente
CREATE INDEX IF NOT EXISTS idx_sale_lines_sale_id ON sale_lines(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_lines_product_id ON sale_lines(product_id);

-- Index pour les produits
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- Index pour les sessions de caisse
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user_id ON cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opening_time ON cash_sessions(opening_time DESC);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user_status ON cash_sessions(user_id, status);

-- Index pour les caisses
CREATE INDEX IF NOT EXISTS idx_cash_registers_pos_id ON cash_registers(point_of_sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_is_active ON cash_registers(is_active);

-- Index pour les utilisateurs
CREATE INDEX IF NOT EXISTS idx_users_point_of_sale_id ON users(point_of_sale_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index pour le stock
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- Index pour les lots
CREATE INDEX IF NOT EXISTS idx_product_lots_product_id ON product_lots(product_id);
CREATE INDEX IF NOT EXISTS idx_product_lots_status ON product_lots(status);

-- Statistiques pour l'optimiseur de requêtes
ANALYZE sales;
ANALYZE payments;
ANALYZE sale_lines;
ANALYZE products;
ANALYZE cash_sessions;
ANALYZE users;
