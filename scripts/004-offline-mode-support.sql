-- Support du mode hors ligne
-- Conformément au cahier des charges: synchronisation des données en mode déconnecté

-- 1. Ajouter colonnes de synchronisation aux tables principales
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
ADD COLUMN IF NOT EXISTS offline_created_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);

ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced',
ADD COLUMN IF NOT EXISTS offline_created_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);

ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced',
ADD COLUMN IF NOT EXISTS offline_created_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);

-- 2. Créer table de log de synchronisation
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) NOT NULL,
  sync_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  conflicts_count INTEGER DEFAULT 0,
  sync_started_at TIMESTAMP NOT NULL,
  sync_completed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  error_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Créer table pour gérer les conflits
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  local_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  conflict_type VARCHAR(50) NOT NULL,
  resolution_status VARCHAR(20) DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'ignored')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales(sync_status, is_synced);
CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON payments(sync_status, is_synced);
CREATE INDEX IF NOT EXISTS idx_stock_movements_sync_status ON stock_movements(sync_status, is_synced);
CREATE INDEX IF NOT EXISTS idx_sync_logs_device ON sync_logs(device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(resolution_status, created_at);

COMMENT ON COLUMN sales.is_synced IS 'Indique si la vente a été synchronisée avec le serveur';
COMMENT ON COLUMN sales.sync_status IS 'Statut de synchronisation: pending, synced, conflict';
COMMENT ON COLUMN sales.offline_created_at IS 'Date de création en mode hors ligne';
COMMENT ON COLUMN sales.device_id IS 'Identifiant de l''appareil ayant créé la vente';
