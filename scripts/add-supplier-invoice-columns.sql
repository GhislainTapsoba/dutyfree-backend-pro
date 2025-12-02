-- Ajouter les colonnes discount_amount et other_charges à la table supplier_invoices
-- Ces colonnes permettent une meilleure gestion comptable des factures fournisseurs

ALTER TABLE supplier_invoices
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_charges DECIMAL(15, 2) DEFAULT 0;

-- Mettre à jour les factures existantes pour recalculer le total
-- total = subtotal + tax_amount + other_charges - discount_amount
UPDATE supplier_invoices
SET total = subtotal + tax_amount + COALESCE(other_charges, 0) - COALESCE(discount_amount, 0)
WHERE discount_amount IS NOT NULL OR other_charges IS NOT NULL;

-- Afficher un message de confirmation
SELECT 'Colonnes discount_amount et other_charges ajoutées avec succès à la table supplier_invoices' AS message;
