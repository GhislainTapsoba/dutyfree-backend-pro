-- Assigner les utilisateurs à des points de vente

DO $$
DECLARE
  pos1_id UUID;
  pos2_id UUID;
BEGIN
  -- Récupérer vos 2 points de vente
  SELECT id INTO pos1_id FROM point_of_sales ORDER BY created_at LIMIT 1;
  SELECT id INTO pos2_id FROM point_of_sales ORDER BY created_at OFFSET 1 LIMIT 1;
  
  -- Assigner TOUS les utilisateurs au premier point de vente (pour test)
  UPDATE users 
  SET point_of_sale_id = pos1_id;
  
  RAISE NOTICE 'Utilisateurs assignés aux points de vente';
END $$;
