-- Script d'initialisation des rôles pour le système Duty Free
-- À exécuter dans Supabase SQL Editor

-- Créer la table des rôles si elle n'existe pas
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Créer un index sur le code
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);

-- Insérer les rôles par défaut (si ils n'existent pas déjà)
INSERT INTO roles (code, name, description, permissions) VALUES
  (
    'admin',
    'Administrateur',
    'Accès complet au système, gestion des utilisateurs et configuration',
    '{
      "dashboard": ["view"],
      "pos": ["view", "create_sale", "cancel_sale", "apply_discount", "apply_promotion"],
      "products": ["view", "create", "edit", "delete", "manage_prices"],
      "technical_sheets": ["view", "edit"],
      "stock": ["view", "manage", "adjust"],
      "inventory": ["view", "create", "validate"],
      "suppliers": ["view", "create", "edit", "delete"],
      "purchase_orders": ["view", "create", "edit", "delete", "validate"],
      "supplier_invoices": ["view", "create", "validate", "delete"],
      "promotions": ["view", "create", "edit", "delete"],
      "loyalty": ["view", "manage"],
      "menus": ["view", "create", "edit", "delete"],
      "hotel_guests": ["view", "create", "edit", "delete"],
      "payments": ["view", "manage", "refund"],
      "reports": ["view", "export", "financial"],
      "point_of_sales": ["view", "create", "edit", "delete"],
      "currencies": ["view", "manage"],
      "users": ["view", "create", "edit", "delete", "manage_roles"],
      "settings": ["view", "edit"],
      "notifications": ["view", "manage"]
    }'
  ),
  (
    'manager',
    'Gestionnaire',
    'Gestion opérationnelle complète sans suppression de données critiques',
    '{
      "dashboard": ["view"],
      "pos": ["view", "create_sale", "cancel_sale", "apply_discount", "apply_promotion"],
      "products": ["view", "create", "edit", "manage_prices"],
      "technical_sheets": ["view", "edit"],
      "stock": ["view", "manage", "adjust"],
      "inventory": ["view", "create", "validate"],
      "suppliers": ["view", "create", "edit"],
      "purchase_orders": ["view", "create", "edit", "validate"],
      "supplier_invoices": ["view", "create", "validate"],
      "promotions": ["view", "create", "edit"],
      "loyalty": ["view", "manage"],
      "menus": ["view", "create", "edit"],
      "hotel_guests": ["view", "create", "edit"],
      "payments": ["view", "manage"],
      "reports": ["view", "export", "financial"],
      "point_of_sales": ["view"],
      "currencies": ["view"],
      "users": ["view"],
      "settings": ["view"],
      "notifications": ["view"]
    }'
  ),
  (
    'cashier',
    'Caissier',
    'Point de vente et consultation des produits et clients',
    '{
      "dashboard": ["view"],
      "pos": ["view", "create_sale", "apply_promotion"],
      "products": ["view"],
      "stock": ["view"],
      "loyalty": ["view"],
      "hotel_guests": ["view"],
      "payments": ["view"],
      "notifications": ["view"]
    }'
  ),
  (
    'warehouseman',
    'Magasinier',
    'Gestion du stock, inventaires et réception des commandes',
    '{
      "dashboard": ["view"],
      "products": ["view"],
      "technical_sheets": ["view"],
      "stock": ["view", "manage", "adjust"],
      "inventory": ["view", "create"],
      "suppliers": ["view"],
      "purchase_orders": ["view", "create"],
      "supplier_invoices": ["view"],
      "reports": ["view"],
      "notifications": ["view"]
    }'
  ),
  (
    'accountant',
    'Comptable',
    'Gestion financière, rapports et factures',
    '{
      "dashboard": ["view"],
      "products": ["view"],
      "purchase_orders": ["view"],
      "supplier_invoices": ["view", "create", "validate"],
      "payments": ["view", "manage"],
      "reports": ["view", "export", "financial"],
      "currencies": ["view"],
      "notifications": ["view"]
    }'
  )
ON CONFLICT (code) DO NOTHING;

-- Fonction pour mettre à jour le timestamp updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vérifier que la table users a bien une colonne role_id
-- Si ce n'est pas le cas, la créer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);
    CREATE INDEX idx_users_role_id ON users(role_id);
  END IF;
END $$;

-- Afficher les rôles créés
SELECT id, code, name, description, created_at FROM roles ORDER BY name;

-- Statistiques
SELECT
  'Rôles créés' AS info,
  COUNT(*) AS count
FROM roles;
