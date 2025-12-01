-- Script pour insérer des produits d'exemple

-- Récupérer les IDs des catégories
DO $$
DECLARE
    cat_parfums UUID;
    cat_alcools UUID;
    cat_tabac UUID;
    cat_confiserie UUID;
    cat_souvenirs UUID;
BEGIN
    -- Récupérer les IDs des catégories
    SELECT id INTO cat_parfums FROM product_categories WHERE code = 'PARFUMS';
    SELECT id INTO cat_alcools FROM product_categories WHERE code = 'ALCOOLS';
    SELECT id INTO cat_tabac FROM product_categories WHERE code = 'TABAC';
    SELECT id INTO cat_confiserie FROM product_categories WHERE code = 'CONFISERIE';
    SELECT id INTO cat_souvenirs FROM product_categories WHERE code = 'SOUVENIRS';

    -- Insérer des produits parfums
    INSERT INTO products (code, barcode, name_fr, name_en, category_id, selling_price_xof, selling_price_eur, selling_price_usd, tax_rate, min_stock_level) VALUES
    ('CHANEL5-50ML', '3145891355505', 'Chanel N°5 Eau de Parfum 50ml', 'Chanel N°5 Eau de Parfum 50ml', cat_parfums, 85000, 130, 142, 0, 5),
    ('DIOR-SAUVAGE', '3348901419376', 'Dior Sauvage Eau de Toilette 100ml', 'Dior Sauvage Eau de Toilette 100ml', cat_parfums, 75000, 115, 125, 0, 8),
    ('VERSACE-EROS', '8011003845446', 'Versace Eros Eau de Toilette 100ml', 'Versace Eros Eau de Toilette 100ml', cat_parfums, 65000, 99, 108, 0, 6),
    ('HUGO-BOSS', '3616301216438', 'Hugo Boss Bottled 100ml', 'Hugo Boss Bottled 100ml', cat_parfums, 55000, 84, 92, 0, 10);

    -- Insérer des produits alcools
    INSERT INTO products (code, barcode, name_fr, name_en, category_id, selling_price_xof, selling_price_eur, selling_price_usd, tax_rate, min_stock_level) VALUES
    ('HENNESSY-VS', '3245990000017', 'Hennessy V.S Cognac 70cl', 'Hennessy V.S Cognac 70cl', cat_alcools, 45000, 69, 75, 0, 12),
    ('JOHNNIE-BLACK', '5000267013701', 'Johnnie Walker Black Label 70cl', 'Johnnie Walker Black Label 70cl', cat_alcools, 35000, 53, 58, 0, 15),
    ('GREY-GOOSE', '3035540003003', 'Grey Goose Vodka 70cl', 'Grey Goose Vodka 70cl', cat_alcools, 42000, 64, 70, 0, 8),
    ('MOET-CHANDON', '3185370001004', 'Moët & Chandon Brut Impérial 75cl', 'Moët & Chandon Brut Impérial 75cl', cat_alcools, 55000, 84, 92, 0, 6);

    -- Insérer des produits tabac
    INSERT INTO products (code, barcode, name_fr, name_en, category_id, selling_price_xof, selling_price_eur, selling_price_usd, tax_rate, min_stock_level) VALUES
    ('MARLBORO-RED', '7622210992307', 'Marlboro Rouge Cartouche', 'Marlboro Red Carton', cat_tabac, 25000, 38, 42, 0, 20),
    ('CAMEL-BLUE', '4260042750013', 'Camel Blue Cartouche', 'Camel Blue Carton', cat_tabac, 23000, 35, 38, 0, 25),
    ('WINSTON-RED', '4260042750020', 'Winston Rouge Cartouche', 'Winston Red Carton', cat_tabac, 22000, 34, 37, 0, 30);

    -- Insérer des produits confiserie
    INSERT INTO products (code, barcode, name_fr, name_en, category_id, selling_price_xof, selling_price_eur, selling_price_usd, tax_rate, min_stock_level) VALUES
    ('LINDT-GOLD', '7610400017008', 'Lindt Lindor Assortiment Or 337g', 'Lindt Lindor Gold Assortment 337g', cat_confiserie, 8500, 13, 14, 18, 15),
    ('FERRERO-ROCHER', '8000500037560', 'Ferrero Rocher T30 375g', 'Ferrero Rocher T30 375g', cat_confiserie, 7500, 11, 12, 18, 20),
    ('TOBLERONE-360G', '7622210717047', 'Toblerone Lait 360g', 'Toblerone Milk 360g', cat_confiserie, 4500, 7, 8, 18, 25),
    ('GODIVA-GOLD', '5450000431005', 'Godiva Ballotin Or 250g', 'Godiva Gold Ballotin 250g', cat_confiserie, 12000, 18, 20, 18, 10);

    -- Insérer des produits souvenirs
    INSERT INTO products (code, barcode, name_fr, name_en, category_id, selling_price_xof, selling_price_eur, selling_price_usd, tax_rate, min_stock_level) VALUES
    ('TSHIRT-BF', '1234567890001', 'T-shirt Burkina Faso', 'Burkina Faso T-shirt', cat_souvenirs, 8000, 12, 13, 18, 30),
    ('MASQUE-MOSSI', '1234567890002', 'Masque Traditionnel Mossi', 'Traditional Mossi Mask', cat_souvenirs, 15000, 23, 25, 18, 5),
    ('BRACELET-BRONZE', '1234567890003', 'Bracelet Bronze Artisanal', 'Handcrafted Bronze Bracelet', cat_souvenirs, 5000, 8, 9, 18, 20),
    ('SAC-BOGOLAN', '1234567890004', 'Sac Bogolan Authentique', 'Authentic Bogolan Bag', cat_souvenirs, 12000, 18, 20, 18, 8);

    RAISE NOTICE 'Produits d''exemple insérés avec succès!';
END $$;