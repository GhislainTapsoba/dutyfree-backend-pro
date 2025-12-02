-- ============================================
-- Script: Ajouter des images placeholder aux produits
-- Description: Ajoute des URLs d'images placeholder pour chaque produit
-- ============================================

-- Option 1: Utiliser des images placeholder
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=1' WHERE code = 'CHANEL5-50ML';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=2' WHERE code = 'DIOR-SAUVAGE';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=3' WHERE code = 'HUGO-BOSS';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=4' WHERE code = 'VERSACE-EROS';

UPDATE products SET image_url = 'https://picsum.photos/400/400?random=5' WHERE code = 'GREY-GOOSE';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=6' WHERE code = 'HENNESSY-VS';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=7' WHERE code = 'JOHNNIE-BLACK';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=8' WHERE code = 'MOET-CHANDON';

UPDATE products SET image_url = 'https://picsum.photos/400/400?random=9' WHERE code = 'FERRERO-ROCHER';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=10' WHERE code = 'GODIVA-GOLD';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=11' WHERE code = 'LINDT-GOLD';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=12' WHERE code = 'TOBLERONE-360G';

UPDATE products SET image_url = 'https://picsum.photos/400/400?random=13' WHERE code = 'MARLBORO-RED';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=14' WHERE code = 'CAMEL-BLUE';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=15' WHERE code = 'WINSTON-RED';

UPDATE products SET image_url = 'https://picsum.photos/400/400?random=16' WHERE code = 'BRACELET-BRONZE';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=17' WHERE code = 'MASQUE-MOSSI';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=18' WHERE code = 'SAC-BOGOLAN';
UPDATE products SET image_url = 'https://picsum.photos/400/400?random=19' WHERE code = 'TSHIRT-BF';

-- Vérifier les produits avec images
SELECT 
  code,
  name_fr,
  CASE 
    WHEN image_url IS NOT NULL THEN '✓ Image ajoutée'
    ELSE '✗ Pas d''image'
  END as statut_image
FROM products
ORDER BY name_fr;

-- ============================================
-- INSTRUCTIONS POUR AJOUTER VOS PROPRES IMAGES:
-- ============================================
-- 
-- 1. Téléchargez vos images et placez-les dans: 
--    dutyfree-backend-pro/public/uploads/
--
-- 2. Nommez vos images avec le code produit, exemple:
--    CHANEL5-50ML.jpg
--    DIOR-SAUVAGE.png
--
-- 3. Exécutez ce script pour mettre à jour les chemins:
--
-- UPDATE products SET image_url = 'CHANEL5-50ML.jpg' WHERE code = 'CHANEL5-50ML';
-- UPDATE products SET image_url = 'DIOR-SAUVAGE.png' WHERE code = 'DIOR-SAUVAGE';
-- etc...
--
-- ============================================
