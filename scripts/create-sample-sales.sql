-- Script pour créer des ventes de test et corriger les paiements orphelins
-- Ce script résout le problème des paiements sans ventes correspondantes

-- 1. Vérifier les paiements orphelins
SELECT
  p.id as payment_id,
  p.sale_id,
  p.amount,
  p.currency_code,
  p.created_at
FROM payments p
LEFT JOIN sales s ON p.sale_id = s.id
WHERE s.id IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- 2. Compter les paiements orphelins
SELECT COUNT(*) as orphan_payments_count
FROM payments p
LEFT JOIN sales s ON p.sale_id = s.id
WHERE s.id IS NULL;

-- 3. Créer des ventes pour les paiements orphelins
-- D'abord, récupérer un utilisateur actif pour être le vendeur
DO $$
DECLARE
  v_seller_id UUID;
  v_cash_session_id UUID;
  v_cash_register_id UUID;
  v_point_of_sale_id UUID;
  v_payment RECORD;
  v_new_sale_id UUID;
  v_ticket_number VARCHAR(30);
  v_counter INTEGER := 1;
BEGIN
  -- Récupérer un vendeur actif
  SELECT id INTO v_seller_id FROM users WHERE is_active = true LIMIT 1;

  -- Récupérer une session de caisse active ou la dernière
  SELECT id INTO v_cash_session_id FROM cash_sessions ORDER BY created_at DESC LIMIT 1;

  -- Récupérer une caisse enregistreuse
  SELECT id INTO v_cash_register_id FROM cash_registers WHERE is_active = true LIMIT 1;

  -- Récupérer un point de vente
  SELECT id INTO v_point_of_sale_id FROM point_of_sales WHERE is_active = true LIMIT 1;

  -- Si aucun utilisateur/session/caisse n'est trouvé, on ne peut pas continuer
  IF v_seller_id IS NULL THEN
    RAISE NOTICE 'Aucun utilisateur actif trouvé. Impossible de créer des ventes.';
    RETURN;
  END IF;

  -- Pour chaque paiement orphelin
  FOR v_payment IN
    SELECT p.id, p.sale_id, p.amount, p.currency_code, p.amount_in_base_currency, p.created_at, p.cash_session_id
    FROM payments p
    LEFT JOIN sales s ON p.sale_id = s.id
    WHERE s.id IS NULL
    ORDER BY p.created_at DESC
  LOOP
    -- Générer un numéro de ticket unique
    v_ticket_number := 'RECOVERY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_counter::TEXT, 4, '0');

    -- Créer une vente de récupération
    INSERT INTO sales (
      id,
      ticket_number,
      cash_session_id,
      cash_register_id,
      point_of_sale_id,
      seller_id,
      customer_name,
      subtotal,
      discount_amount,
      tax_amount,
      total_ht,
      total_ttc,
      total_discount,
      total_tax,
      currency_code,
      status,
      sale_date,
      created_at,
      updated_at
    ) VALUES (
      v_payment.sale_id, -- Utiliser le sale_id du paiement comme ID de vente
      v_ticket_number,
      COALESCE(v_payment.cash_session_id, v_cash_session_id),
      v_cash_register_id,
      v_point_of_sale_id,
      v_seller_id,
      'Client - Vente récupérée',
      v_payment.amount_in_base_currency, -- subtotal
      0, -- discount_amount
      0, -- tax_amount
      v_payment.amount_in_base_currency, -- total_ht
      v_payment.amount_in_base_currency, -- total_ttc
      0, -- total_discount
      0, -- total_tax
      'XOF',
      'completed',
      v_payment.created_at,
      v_payment.created_at,
      v_payment.created_at
    ) ON CONFLICT (id) DO NOTHING;

    -- Créer une ligne de vente générique
    INSERT INTO sale_lines (
      sale_id,
      product_id,
      quantity,
      unit_price,
      unit_price_ht,
      unit_price_ttc,
      discount_percentage,
      discount_amount,
      tax_rate,
      tax_amount,
      total_ht,
      total_ttc,
      line_total,
      created_at
    )
    SELECT
      v_payment.sale_id,
      p.id, -- Prendre le premier produit actif
      1, -- quantity
      v_payment.amount_in_base_currency, -- unit_price
      v_payment.amount_in_base_currency, -- unit_price_ht
      v_payment.amount_in_base_currency, -- unit_price_ttc
      0, -- discount_percentage
      0, -- discount_amount
      0, -- tax_rate
      0, -- tax_amount
      v_payment.amount_in_base_currency, -- total_ht
      v_payment.amount_in_base_currency, -- total_ttc
      v_payment.amount_in_base_currency, -- line_total
      v_payment.created_at
    FROM products p
    WHERE p.is_active = true
    LIMIT 1
    ON CONFLICT DO NOTHING;

    v_counter := v_counter + 1;

    -- Limiter à 100 ventes de récupération pour éviter de surcharger
    EXIT WHEN v_counter > 100;
  END LOOP;

  RAISE NOTICE 'Créé % ventes de récupération', v_counter - 1;
END $$;

-- 4. Vérifier les résultats
SELECT
  COUNT(*) as total_sales,
  SUM(total_ttc) as total_ca
FROM sales;

-- 5. Vérifier qu'il n'y a plus de paiements orphelins
SELECT COUNT(*) as remaining_orphan_payments
FROM payments p
LEFT JOIN sales s ON p.sale_id = s.id
WHERE s.id IS NULL;

-- 6. Afficher quelques ventes récupérées
SELECT
  s.id,
  s.ticket_number,
  s.total_ttc,
  s.created_at,
  COUNT(sl.id) as line_count,
  COUNT(p.id) as payment_count
FROM sales s
LEFT JOIN sale_lines sl ON s.id = sl.sale_id
LEFT JOIN payments p ON s.id = p.sale_id
WHERE s.ticket_number LIKE 'RECOVERY-%'
GROUP BY s.id, s.ticket_number, s.total_ttc, s.created_at
ORDER BY s.created_at DESC
LIMIT 10;
