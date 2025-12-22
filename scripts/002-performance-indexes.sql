-- =====================================================
-- OPTIMISATIONS DE PERFORMANCE - INDEX COMPOSITES
-- =====================================================
-- Ce script ajoute des index manquants pour améliorer
-- significativement les performances des requêtes

-- =====================================================
-- 1. SALES - Requêtes fréquentes
-- =====================================================

-- Index composite pour requêtes par date + status + point de vente
CREATE INDEX IF NOT EXISTS idx_sales_date_status_pos
ON sales(sale_date DESC, status, point_of_sale_id)
WHERE status IN ('completed', 'pending');

-- Index pour requêtes par session de caisse
CREATE INDEX IF NOT EXISTS idx_sales_session_date
ON sales(cash_session_id, sale_date DESC)
WHERE status = 'completed';

-- Index pour requêtes par vendeur
CREATE INDEX IF NOT EXISTS idx_sales_seller_date
ON sales(seller_id, sale_date DESC)
WHERE status = 'completed';

-- =====================================================
-- 2. PRODUCT_LOTS - Gestion stock FIFO
-- =====================================================

-- Index PARTIAL pour lots disponibles uniquement (FIFO)
CREATE INDEX IF NOT EXISTS idx_product_lots_available_fifo
ON product_lots(product_id, received_date ASC, current_quantity DESC)
WHERE status = 'available' AND current_quantity > 0;

-- Index pour lots par fournisseur
CREATE INDEX IF NOT EXISTS idx_product_lots_supplier_status
ON product_lots(supplier_id, status, received_date DESC);

-- =====================================================
-- 3. PAYMENTS - Requêtes par session et date
-- =====================================================

-- Index pour paiements par session de caisse
CREATE INDEX IF NOT EXISTS idx_payments_session_date
ON payments(cash_session_id, created_at DESC)
WHERE status = 'completed';

-- Index pour paiements par méthode
CREATE INDEX IF NOT EXISTS idx_payments_method_date
ON payments(payment_method_id, created_at DESC);

-- Index pour paiements par vente
CREATE INDEX IF NOT EXISTS idx_payments_sale_status
ON payments(sale_id, status);

-- =====================================================
-- 4. PRODUCTS - Recherches et filtres
-- =====================================================

-- Index PARTIAL pour produits actifs par catégorie
CREATE INDEX IF NOT EXISTS idx_products_active_category
ON products(category_id, is_active, name_fr)
WHERE is_active = true;

-- Index pour recherche par code-barres (utilisé au POS)
CREATE INDEX IF NOT EXISTS idx_products_barcode
ON products(barcode)
WHERE barcode IS NOT NULL AND is_active = true;

-- Index pour recherche par SKU
CREATE INDEX IF NOT EXISTS idx_products_sku
ON products(sku)
WHERE sku IS NOT NULL AND is_active = true;

-- Index pour recherche textuelle (nom)
CREATE INDEX IF NOT EXISTS idx_products_name_search
ON products USING gin(to_tsvector('french', name_fr));

-- =====================================================
-- 5. CASH_SESSIONS - Sessions actives
-- =====================================================

-- Index PARTIAL pour sessions ouvertes par utilisateur
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user_open
ON cash_sessions(user_id, opening_time DESC)
WHERE status = 'open';

-- Index pour sessions par caisse
CREATE INDEX IF NOT EXISTS idx_cash_sessions_register_status
ON cash_sessions(cash_register_id, status, opening_time DESC);

-- =====================================================
-- 6. SALE_LINES - Lignes de vente
-- =====================================================

-- Index pour agrégations par produit
CREATE INDEX IF NOT EXISTS idx_sale_lines_product_sale
ON sale_lines(product_id, sale_id);

-- Index pour lot tracking
CREATE INDEX IF NOT EXISTS idx_sale_lines_lot
ON sale_lines(lot_id)
WHERE lot_id IS NOT NULL;

-- =====================================================
-- 7. STOCK_MOVEMENTS - Mouvements de stock
-- =====================================================

-- Index composite pour historique stock par produit
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date
ON stock_movements(product_id, created_at DESC, movement_type);

-- Index pour mouvements par lot
CREATE INDEX IF NOT EXISTS idx_stock_movements_lot_date
ON stock_movements(lot_id, created_at DESC)
WHERE lot_id IS NOT NULL;

-- =====================================================
-- 8. INVENTORY - Inventaires
-- =====================================================

-- Index pour inventaires actifs
CREATE INDEX IF NOT EXISTS idx_inventory_status_date
ON inventory(status, scheduled_date DESC);

-- Index pour inventaires par point de vente
CREATE INDEX IF NOT EXISTS idx_inventory_pos_status
ON inventory(point_of_sale_id, status);

-- =====================================================
-- 9. INVENTORY_LINES - Lignes d'inventaire
-- =====================================================

-- Index foreign keys manquants
CREATE INDEX IF NOT EXISTS idx_inventory_lines_inventory
ON inventory_lines(inventory_id);

CREATE INDEX IF NOT EXISTS idx_inventory_lines_product
ON inventory_lines(product_id);

-- =====================================================
-- 10. NOTIFICATIONS - Requêtes par utilisateur
-- =====================================================

-- Index pour notifications non lues par utilisateur
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, created_at DESC)
WHERE is_read = false;

-- Index pour notifications par type
CREATE INDEX IF NOT EXISTS idx_notifications_type_date
ON notifications(type, created_at DESC);

-- =====================================================
-- 11. USER_ACTIVITY_LOGS - Logs d'activité
-- =====================================================

-- Index pour logs par utilisateur et date
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date
ON user_activity_logs(user_id, created_at DESC);

-- Index pour logs par action
CREATE INDEX IF NOT EXISTS idx_user_activity_action_date
ON user_activity_logs(action, created_at DESC);

-- =====================================================
-- STATISTIQUES & ANALYSE
-- =====================================================

-- Mettre à jour les statistiques pour le planificateur
ANALYZE sales;
ANALYZE sale_lines;
ANALYZE payments;
ANALYZE product_lots;
ANALYZE products;
ANALYZE cash_sessions;
ANALYZE stock_movements;
ANALYZE inventory;
ANALYZE inventory_lines;

-- =====================================================
-- VERIFICATION DES INDEX CREES
-- =====================================================

-- Requête pour vérifier tous les nouveaux index
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
LEFT JOIN pg_class ON pg_indexes.indexname = pg_class.relname
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- NOTES D'UTILISATION
-- =====================================================

/*
Pour exécuter ce script :
1. Se connecter à la base de données PostgreSQL
2. Exécuter : psql -U postgres -d dutyfree_db -f 002-performance-indexes.sql

Pour vérifier l'utilisation des index :
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

Pour surveiller les requêtes lentes :
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

Impact attendu :
- Requêtes sales : -60% temps d'exécution
- Recherche produits POS : -80% temps
- Chargement dashboard : -50% temps
- Rapports : -70% temps
*/
