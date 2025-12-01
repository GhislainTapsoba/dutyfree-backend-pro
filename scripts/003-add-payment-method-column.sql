-- Ajouter la colonne payment_method à la table payments
-- Cette colonne stockera le nom/type de la méthode de paiement (cash, card, mobile, etc.)

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Mettre à jour les valeurs existantes en fonction de payment_method_id
-- Si vous avez une table payment_methods, vous pouvez faire une jointure
UPDATE payments p
SET payment_method = pm.code
FROM payment_methods pm
WHERE p.payment_method_id = pm.id
AND p.payment_method IS NULL;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);

-- Commentaire sur la colonne
COMMENT ON COLUMN payments.payment_method IS 'Type de méthode de paiement (cash, card, mobile_money, etc.)';
