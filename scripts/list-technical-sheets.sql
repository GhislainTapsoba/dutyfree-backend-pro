-- Lister toutes les fiches techniques
SELECT 
  id,
  sheet_code,
  product_id,
  origin_country,
  customs_code,
  net_weight,
  created_at
FROM technical_sheets
ORDER BY created_at DESC;

-- Compter les fiches
SELECT COUNT(*) as "Nombre de fiches" FROM technical_sheets;
