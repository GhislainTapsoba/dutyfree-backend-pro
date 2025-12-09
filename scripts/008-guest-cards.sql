-- Gestion des badges clients hébergés
-- Remises automatiques pour clients avec badge/carte professionnelle

CREATE TABLE IF NOT EXISTS guest_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number VARCHAR(50) UNIQUE NOT NULL,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('badge', 'professional', 'chip')),
  guest_name VARCHAR(200) NOT NULL,
  company VARCHAR(200),
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  valid_from DATE NOT NULL,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  balance DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_cards_card_number ON guest_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_guest_cards_is_active ON guest_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_guest_cards_valid_dates ON guest_cards(valid_from, valid_until);

COMMENT ON TABLE guest_cards IS 'Cartes clients hébergés avec remises et porte-monnaie électronique';
COMMENT ON COLUMN guest_cards.card_type IS 'Type: badge, professional (carte pro), chip (carte à puce)';
COMMENT ON COLUMN guest_cards.balance IS 'Porte-monnaie électronique en FCFA';
