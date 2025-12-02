-- ============================================
-- Script: Mettre à jour le stock des produits
-- Description: Définit les niveaux de stock et crée des lots avec quantité 100
-- ============================================

-- Étape 1: Mettre à jour les niveaux de stock min/max
UPDATE products 
SET 
  min_stock_level = 10,
  max_stock_level = 100
WHERE min_stock_level IS NULL OR max_stock_level IS NULL;

-- Étape 2: Créer des lots de stock pour chaque produit (quantité 100)
INSERT INTO product_lots (
  product_id,
  lot_number,
  initial_quantity,
  current_quantity,
  received_date,
  status
)
SELECT 
  id,
  'LOT-' || code || '-' || TO_CHAR(NOW(), 'YYYYMMDD'),
  100,
  100,
  NOW(),
  'available'
FROM products
WHERE NOT EXISTS (
  SELECT 1 FROM product_lots WHERE product_lots.product_id = products.id
);

-- Étape 3: Vérifier les produits et leurs stocks
SELECT 
  p.code,
  p.name_fr as "Nom",
  p.min_stock_level as "Stock Min",
  p.max_stock_level as "Stock Max",
  COALESCE(SUM(pl.current_quantity), 0) as "Stock Actuel"
FROM products p
LEFT JOIN product_lots pl ON p.id = pl.product_id AND pl.status = 'available'
GROUP BY p.id, p.code, p.name_fr, p.min_stock_level, p.max_stock_level
ORDER BY p.name_fr 
LIMIT 20;
