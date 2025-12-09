-- Corriger les dates des ventes de 2025 vers 2024

-- Afficher les ventes avec des dates en 2025
SELECT id, ticket_number, sale_date, created_at 
FROM sales 
WHERE EXTRACT(YEAR FROM sale_date) = 2025
ORDER BY sale_date;

-- Corriger les dates: remplacer 2025 par 2024
UPDATE sales
SET sale_date = sale_date - INTERVAL '1 year'
WHERE EXTRACT(YEAR FROM sale_date) = 2025;

-- Corriger aussi created_at si nécessaire
UPDATE sales
SET created_at = created_at - INTERVAL '1 year'
WHERE EXTRACT(YEAR FROM created_at) = 2025;

-- Vérifier les corrections
SELECT id, ticket_number, sale_date, created_at 
FROM sales 
WHERE sale_date >= '2024-12-01' AND sale_date <= '2024-12-31'
ORDER BY sale_date DESC;
