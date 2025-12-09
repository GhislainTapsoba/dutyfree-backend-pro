-- Ajouter la colonne last_login_at si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Mettre à jour last_login_at pour tous les utilisateurs existants
-- Utilise created_at comme valeur par défaut
UPDATE users
SET last_login_at = COALESCE(last_login_at, created_at, NOW())
WHERE last_login_at IS NULL;
