-- Augmenter la taille des champs VARCHAR trop courts
ALTER TABLE technical_sheets 
ALTER COLUMN storage_conditions TYPE TEXT;

ALTER TABLE technical_sheets 
ALTER COLUMN origin_country TYPE VARCHAR(255);

ALTER TABLE technical_sheets 
ALTER COLUMN customs_code TYPE VARCHAR(50);

-- Vérifier les contraintes
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'technical_sheets'
AND data_type LIKE '%character%'
ORDER BY column_name;
