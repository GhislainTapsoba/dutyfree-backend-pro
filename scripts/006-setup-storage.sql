-- Configuration du storage Supabase pour les images produits

-- Créer le bucket products s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre l'upload d'images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products');

-- Politique pour permettre la lecture publique
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'products');

-- Politique pour permettre la suppression aux utilisateurs authentifiés
CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'products');

-- Message de confirmation
DO $$ 
BEGIN
    RAISE NOTICE 'Storage configuré avec succès pour les images produits!';
END $$;