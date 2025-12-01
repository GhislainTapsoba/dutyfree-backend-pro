-- Script pour créer la table des catégories de produits

-- Table des catégories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_product_categories_name_fr ON product_categories(name_fr);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);

-- RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Policies (permissives pour l'API)
CREATE POLICY "Authenticated users can manage categories" 
ON product_categories FOR ALL 
TO authenticated 
USING (true);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_product_categories_updated_at ON product_categories;
CREATE TRIGGER trigger_update_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_product_categories_updated_at();

-- Ajouter la colonne description si elle n'existe pas
ALTER TABLE product_categories 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Données par défaut
INSERT INTO product_categories (code, name_fr, name_en, description) VALUES
('PARFUMS', 'Parfums', 'Perfumes', 'Parfums et eaux de toilette'),
('ALCOOLS', 'Alcools', 'Alcohol', 'Vins, spiritueux et champagnes'),
('TABAC', 'Tabac', 'Tobacco', 'Cigarettes et produits du tabac'),
('CONFISERIE', 'Confiserie', 'Confectionery', 'Chocolats et bonbons'),
('SOUVENIRS', 'Souvenirs', 'Souvenirs', 'Articles souvenirs et cadeaux')
ON CONFLICT (code) DO NOTHING;

-- Message de confirmation
DO $$ 
BEGIN
    RAISE NOTICE 'Table des catégories créée avec succès!';
END $$;