-- Chercher dans toutes les tables possibles

-- Table 1: technical_sheets
SELECT 'technical_sheets' as table_name, id, sheet_code 
FROM technical_sheets 
WHERE id = '61d6b166-975d-4595-a286-4212367c8354';

-- Table 2: product_technical_sheets (si elle existe)
SELECT 'product_technical_sheets' as table_name, id 
FROM product_technical_sheets 
WHERE id = '61d6b166-975d-4595-a286-4212367c8354';

-- Lister toutes les tables qui contiennent "technical"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%technical%';

-- Supprimer de product_technical_sheets
DELETE FROM product_technical_sheets WHERE id = '61d6b166-975d-4595-a286-4212367c8354';

-- Vérifier
SELECT COUNT(*) FROM product_technical_sheets;
