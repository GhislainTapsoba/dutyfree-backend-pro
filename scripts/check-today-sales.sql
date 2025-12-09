-- Vérifier les ventes d'aujourd'hui (8 décembre 2025)

-- Voir toutes les ventes de décembre 2025
SELECT 
  id, 
  ticket_number, 
  sale_date,
  DATE(sale_date) as date_only,
  total_ttc,
  created_at
FROM sales 
WHERE sale_date >= '2025-12-01' AND sale_date <= '2025-12-31'
ORDER BY sale_date DESC;

-- Compter les ventes par jour en décembre 2025
SELECT 
  DATE(sale_date) as date,
  COUNT(*) as nombre_ventes,
  SUM(total_ttc) as total_ca
FROM sales 
WHERE sale_date >= '2025-12-01' AND sale_date <= '2025-12-31'
GROUP BY DATE(sale_date)
ORDER BY date DESC;
