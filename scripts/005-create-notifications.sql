-- Script pour créer les tables de notifications

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Table des préférences de notifications
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  stock_alerts BOOLEAN DEFAULT true,
  expiry_alerts BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true,
  promotion_alerts BOOLEAN DEFAULT true,
  system_alerts BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 10,
  expiry_warning_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies pour notifications (permissives pour l'API)
CREATE POLICY "Authenticated users can manage notifications" 
ON notifications FOR ALL 
TO authenticated 
USING (true);

-- Policies pour notification_preferences (permissives pour l'API)
CREATE POLICY "Authenticated users can manage preferences" 
ON notification_preferences FOR ALL 
TO authenticated 
USING (true);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Message de confirmation
DO $$ 
BEGIN
    RAISE NOTICE 'Tables de notifications créées avec succès!';
END $$;