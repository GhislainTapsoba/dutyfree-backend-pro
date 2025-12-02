-- Mettre à jour l'origine de la fiche technique
UPDATE technical_sheets 
SET origin_country = 'Burkina Faso'
WHERE sheet_code = 'FT-001';

-- Vérifier
SELECT id, sheet_code, origin_country, customs_code, net_weight 
FROM technical_sheets;
