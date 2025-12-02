-- Supprimer une fiche technique par ID
DELETE FROM technical_sheets 
WHERE id = '61d6b166-975d-4595-a286-4212367c8354';

-- Vérifier que c'est supprimé
SELECT COUNT(*) as "Nombre de fiches restantes" FROM technical_sheets;

-- Ou supprimer TOUTES les fiches (attention!)
-- DELETE FROM technical_sheets;
