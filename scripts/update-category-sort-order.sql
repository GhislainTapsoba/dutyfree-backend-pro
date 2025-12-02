-- ============================================
-- Script: Attribuer des numéros d'ordre uniques aux catégories
-- Description: Attribue automatiquement des numéros d'ordre (10, 20, 30...)
--              basés sur l'ordre alphabétique du nom français
-- ============================================

-- Étape 0: Ajouter la colonne updated_at si elle n'existe pas
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Étape 1: Attribuer les numéros d'ordre
WITH numbered_categories AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY name_fr ASC) * 10 as new_sort_order
  FROM product_categories
)
UPDATE product_categories
SET sort_order = numbered_categories.new_sort_order
FROM numbered_categories
WHERE product_categories.id = numbered_categories.id;

-- Étape 2: Vérifier les catégories mises à jour
SELECT 
  code,
  name_fr as "Nom (FR)",
  name_en as "Nom (EN)",
  sort_order as "Ordre",
  is_active as "Actif"
FROM product_categories 
ORDER BY sort_order ASC;

-- Étape 3: Vérifier qu'il n'y a pas de doublons
SELECT 
  sort_order,
  COUNT(*) as nombre
FROM product_categories
GROUP BY sort_order
HAVING COUNT(*) > 1;
