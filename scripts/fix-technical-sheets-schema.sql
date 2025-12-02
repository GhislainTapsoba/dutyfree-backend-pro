-- Ajouter les colonnes manquantes à technical_sheets
ALTER TABLE technical_sheets 
ADD COLUMN IF NOT EXISTS sheet_code VARCHAR(50) UNIQUE;

-- Générer des codes pour les fiches existantes
WITH numbered AS (
  SELECT id, 'FT-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') as new_code
  FROM technical_sheets
  WHERE sheet_code IS NULL
)
UPDATE technical_sheets
SET sheet_code = numbered.new_code
FROM numbered
WHERE technical_sheets.id = numbered.id;

-- Vérifier les fiches techniques
SELECT 
  ts.sheet_code as "Code fiche",
  p.name_fr as "Produit",
  p.code as "Code produit",
  ts.origin_country as "Origine",
  ts.customs_code as "Code douanier",
  ts.net_weight as "Poids net"
FROM technical_sheets ts
LEFT JOIN products p ON ts.product_id = p.id
ORDER BY ts.created_at DESC;
