-- Mettre à jour le tax_rate de tous les produits à 18% (TVA Burkina Faso)
UPDATE products 
SET tax_rate = 18.0 
WHERE tax_rate IS NULL OR tax_rate = 0;

-- Vérifier les produits mis à jour
SELECT id, code, name_fr, tax_rate 
FROM products 
ORDER BY name_fr 
LIMIT 10;
