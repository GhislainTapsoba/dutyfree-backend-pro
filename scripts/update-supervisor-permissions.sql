-- Mettre à jour les permissions pour tous les rôles

-- Admin : accès complet
UPDATE roles
SET permissions = '{
  "all": true
}'::jsonb
WHERE code = 'admin';

-- Superviseur : accès à tout sauf gestion utilisateurs et paramètres
UPDATE roles
SET permissions = '{
  "dashboard.view": true,
  "pos.view": true,
  "notifications.view": true,
  "products.view": true,
  "categories.view": true,
  "technical_sheets.view": true,
  "stock.view": true,
  "inventory.view": true,
  "suppliers.view": true,
  "purchase_orders.view": true,
  "supplier_invoices.view": true,
  "promotions.view": true,
  "loyalty.view": true,
  "menus.view": true,
  "hotel_guests.view": true,
  "payments.view": true,
  "reports.view": true
}'::jsonb
WHERE code = 'supervisor';

-- Caissier : accès POS et ventes uniquement
UPDATE roles
SET permissions = '{
  "dashboard.view": true,
  "pos.view": true,
  "notifications.view": true,
  "products.view": true,
  "loyalty.view": true
}'::jsonb
WHERE code = 'cashier';

-- Gestionnaire de stock : accès stock, inventaire, fournisseurs
UPDATE roles
SET permissions = '{
  "dashboard.view": true,
  "notifications.view": true,
  "products.view": true,
  "categories.view": true,
  "technical_sheets.view": true,
  "stock.view": true,
  "inventory.view": true,
  "suppliers.view": true,
  "purchase_orders.view": true,
  "supplier_invoices.view": true,
  "reports.view": true
}'::jsonb
WHERE code = 'stock_manager';
