-- Changer l'ID d'une fiche technique
-- ATTENTION: Remplace les valeurs ci-dessous par les vrais IDs

-- Étape 1: Voir les IDs existants
SELECT id, sheet_code, product_id FROM technical_sheets;

-- Étape 2: Mettre à jour l'ID (décommente et modifie)
/*
UPDATE technical_sheets 
SET id = 'NOUVEL-ID-ICI'
WHERE id = 'ANCIEN-ID-ICI';
*/

-- Exemple:
-- UPDATE technical_sheets 
-- SET id = '61d6b166-975d-4595-a286-4212367c8354'
-- WHERE sheet_code = 'FT-0001';
