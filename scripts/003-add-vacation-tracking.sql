-- Ajouter le suivi des vacations (shifts) aux sessions de caisse
-- Conformément au cahier des charges: vacation matin/après-midi/nuit

-- 1. Ajouter la colonne vacation_type
ALTER TABLE cash_sessions 
ADD COLUMN IF NOT EXISTS vacation_type VARCHAR(20) CHECK (vacation_type IN ('morning', 'afternoon', 'night'));

-- 2. Ajouter des colonnes pour le comptage détaillé
ALTER TABLE cash_sessions 
ADD COLUMN IF NOT EXISTS closing_counted_cash DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS closing_counted_card DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS closing_counted_mobile DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS card_variance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS mobile_variance DECIMAL(15,2);

-- 3. Mettre à jour les sessions existantes avec la vacation
UPDATE cash_sessions 
SET vacation_type = CASE 
  WHEN EXTRACT(HOUR FROM opening_time) >= 6 AND EXTRACT(HOUR FROM opening_time) < 14 THEN 'morning'
  WHEN EXTRACT(HOUR FROM opening_time) >= 14 AND EXTRACT(HOUR FROM opening_time) < 22 THEN 'afternoon'
  ELSE 'night'
END
WHERE vacation_type IS NULL;

-- 4. Créer un index pour les requêtes par vacation
CREATE INDEX IF NOT EXISTS idx_cash_sessions_vacation ON cash_sessions(vacation_type, opening_time);

-- 5. Ajouter une contrainte pour rendre vacation_type obligatoire (seulement si des données existent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cash_sessions LIMIT 1) THEN
    ALTER TABLE cash_sessions ALTER COLUMN vacation_type SET NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN cash_sessions.vacation_type IS 'Type de vacation: morning (6h-14h), afternoon (14h-22h), night (22h-6h)';
COMMENT ON COLUMN cash_sessions.closing_counted_cash IS 'Montant espèces compté à la fermeture';
COMMENT ON COLUMN cash_sessions.closing_counted_card IS 'Montant carte compté à la fermeture';
COMMENT ON COLUMN cash_sessions.closing_counted_mobile IS 'Montant mobile money compté à la fermeture';



