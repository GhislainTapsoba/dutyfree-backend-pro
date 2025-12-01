-- Script pour corriger toutes les colonnes manquantes

-- 1. Ajouter la colonne shift à la table sales
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS shift VARCHAR(20);

COMMENT ON COLUMN sales.shift IS 'Vacation (morning, afternoon, night)';

-- 2. Ajouter la colonne full_name à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Mettre à jour full_name avec first_name + last_name
UPDATE users 
SET full_name = TRIM(CONCAT(first_name, ' ', last_name))
WHERE full_name IS NULL;

COMMENT ON COLUMN users.full_name IS 'Nom complet de l''utilisateur';

-- 3. Ajouter la colonne name aux tables products (si elle n'existe pas)
-- Note: products devrait avoir name_fr et name_en, mais certaines requêtes cherchent 'name'
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Copier name_fr dans name si name est vide
UPDATE products 
SET name = name_fr
WHERE name IS NULL AND name_fr IS NOT NULL;

COMMENT ON COLUMN products.name IS 'Nom du produit (copie de name_fr pour compatibilité)';

-- 4. Créer la foreign key manquante sales_cashier_id_fkey si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_cashier_id_fkey'
    ) THEN
        -- Vérifier si la colonne cashier_id existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sales' AND column_name = 'cashier_id'
        ) THEN
            ALTER TABLE sales 
            ADD CONSTRAINT sales_cashier_id_fkey 
            FOREIGN KEY (cashier_id) REFERENCES users(id);
        ELSE
            -- Ajouter la colonne cashier_id si elle n'existe pas
            ALTER TABLE sales ADD COLUMN cashier_id UUID;
            
            -- Copier seller_id vers cashier_id
            UPDATE sales SET cashier_id = seller_id WHERE cashier_id IS NULL;
            
            -- Créer la foreign key
            ALTER TABLE sales 
            ADD CONSTRAINT sales_cashier_id_fkey 
            FOREIGN KEY (cashier_id) REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- 5. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Afficher un message de confirmation
DO $$ 
BEGIN
    RAISE NOTICE 'Toutes les colonnes manquantes ont été ajoutées avec succès!';
END $$;
