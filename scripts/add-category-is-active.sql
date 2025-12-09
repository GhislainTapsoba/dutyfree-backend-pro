-- Ajouter le champ is_active aux catégories de produits
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Mettre à jour toutes les catégories existantes comme actives
UPDATE product_categories 
SET is_active = true 
WHERE is_active IS NULL;
