-- Créer des caisses pour vos points de vente existants

DO $$
DECLARE
  pos1_id UUID;
  pos2_id UUID;
BEGIN
  -- Récupérer vos 2 points de vente
  SELECT id INTO pos1_id FROM point_of_sales ORDER BY created_at LIMIT 1;
  SELECT id INTO pos2_id FROM point_of_sales ORDER BY created_at OFFSET 1 LIMIT 1;
  
  -- Créer 3 caisses pour le premier point de vente
  IF pos1_id IS NOT NULL THEN
    INSERT INTO cash_registers (code, name, point_of_sale_id, is_active)
    VALUES 
      ('CAISSE-01', 'Caisse 1', pos1_id, true),
      ('CAISSE-02', 'Caisse 2', pos1_id, true),
      ('CAISSE-03', 'Caisse 3', pos1_id, true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
  
  -- Créer 2 caisses pour le deuxième point de vente
  IF pos2_id IS NOT NULL THEN
    INSERT INTO cash_registers (code, name, point_of_sale_id, is_active)
    VALUES 
      ('CAISSE-04', 'Caisse 4', pos2_id, true),
      ('CAISSE-05', 'Caisse 5', pos2_id, true),
      ('CAISSE-06', 'Caisse 6', pos2_id, true)
    ON CONFLICT (code) DO NOTHING;
  END IF;
  
END $$;
