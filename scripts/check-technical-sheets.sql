-- Étape 1: Lister les colonnes de la table technical_sheets
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'technical_sheets'
ORDER BY ordinal_position;

-- Étape 2: Vérifier les fiches techniques existantes (décommentez après avoir vu les colonnes)
/*
SELECT 
  ts.*,
  p.name_fr as "Produit",
  p.code as "Code produit"
FROM technical_sheets ts
LEFT JOIN products p ON ts.product_id = p.id
ORDER BY ts.created_at DESC;
*/

-- Si aucune fiche n'existe, créer des exemples
-- Décommentez les lignes ci-dessous pour créer des fiches d'exemple:

/*
INSERT INTO technical_sheets (product_id, sheet_code, origin_country, weight, specifications)
SELECT 
  id,
  'FT-' || code,
  'France',
  500,
  jsonb_build_object(
    'hs_code', '3303.00.10',
    'allergens', 'Peut contenir des traces',
    'storage_conditions', 'À conserver au sec',
    'shelf_life_days', 730
  )
FROM products
WHERE code = 'CHANEL5-50ML';
*/
