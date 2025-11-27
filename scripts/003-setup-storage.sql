-- Configuration du bucket de stockage pour les images produits
-- À exécuter dans le SQL Editor de Supabase

-- Note: La création de bucket se fait via le Dashboard Supabase ou l'API
-- Allez dans Storage > New Bucket > Nom: "products" > Public: true

-- Politique pour permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Politique pour permettre la lecture publique
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Politique pour permettre la suppression aux admins
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');
