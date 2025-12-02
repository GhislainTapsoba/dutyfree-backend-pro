-- Corriger le stock du Bracelet Bronze Artisanal à 100

UPDATE product_lots
SET current_quantity = 100
WHERE product_id = (
  SELECT id FROM products WHERE code = 'BRACELET-BRONZE'
);

-- Vérifier
SELECT 
  p.code,
  p.name_fr,
  pl.lot_number,
  pl.current_quantity
FROM products p
JOIN product_lots pl ON p.id = pl.product_id
WHERE p.code = 'BRACELET-BRONZE';
