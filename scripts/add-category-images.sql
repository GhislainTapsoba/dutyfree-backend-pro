-- ============================================
-- Script: Ajouter des images aux catégories
-- Description: Ajoute la colonne image_url et des images placeholder
-- ============================================

-- Étape 1: Ajouter la colonne image_url si elle n'existe pas
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Étape 2: Ajouter des images placeholder temporaires
UPDATE product_categories SET image_url = 'https://picsum.photos/400/400?random=20' WHERE code LIKE '%PARFUM%';
UPDATE product_categories SET image_url = 'https://picsum.photos/400/400?random=21' WHERE code LIKE '%ALCOOL%' OR code LIKE '%SPIRITUEUX%';
UPDATE product_categories SET image_url = 'https://picsum.photos/400/400?random=22' WHERE code LIKE '%CHOCOLAT%' OR code LIKE '%CONFISERIE%';
UPDATE product_categories SET image_url = 'https://picsum.photos/400/400?random=23' WHERE code LIKE '%TABAC%' OR code LIKE '%CIGARETTE%';
UPDATE product_categories SET image_url = 'https://picsum.photos/400/400?random=24' WHERE code LIKE '%ARTISANAT%' OR code LIKE '%SOUVENIR%';
UPDATE product_categories SET image_url = 'https://picsum.photos/400/400?random=25' WHERE code LIKE '%TEXTILE%' OR code LIKE '%VETEMENT%';

-- Mettre une image par défaut pour les catégories sans image
UPDATE product_categories 
SET image_url = 'https://picsum.photos/400/400?random=26' 
WHERE image_url IS NULL;

-- Vérifier les catégories avec images
SELECT 
  code,
  name_fr,
  CASE 
    WHEN image_url IS NOT NULL THEN '✓ Image ajoutée'
    ELSE '✗ Pas d''image'
  END as statut_image
FROM product_categories
ORDER BY sort_order, name_fr;

-- ============================================
-- INSTRUCTIONS POUR AJOUTER VOS PROPRES IMAGES:
-- ============================================
-- 
-- 1. Téléchargez des images de catégories et placez-les dans: 
--    dutyfree-backend-pro/public/uploads/categories/
--
-- 2. Nommez vos images avec le code catégorie, exemple:
--    PARFUMS.jpg
--    ALCOOLS.jpg
--    CHOCOLATS.jpg
--
-- 3. Exécutez ce script pour mettre à jour les chemins:
--
-- UPDATE product_categories SET image_url = 'categories/PARFUMS.jpg' WHERE code LIKE '%PARFUM%';
-- UPDATE product_categories SET image_url = 'categories/ALCOOLS.jpg' WHERE code LIKE '%ALCOOL%';
-- etc...
--
-- ============================================
