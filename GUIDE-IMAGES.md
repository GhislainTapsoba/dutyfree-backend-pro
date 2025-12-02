# Guide: Ajouter les vraies images des produits

## Étape 1: Télécharger les images

Pour chaque produit, recherche et télécharge l'image sur Google Images:

### Parfums
- **Chanel N°5**: Recherche "Chanel N°5 50ml" → Télécharge → Renomme en `CHANEL5-50ML.jpg`
- **Dior Sauvage**: Recherche "Dior Sauvage 100ml" → Télécharge → Renomme en `DIOR-SAUVAGE.jpg`
- **Hugo Boss**: Recherche "Hugo Boss Bottled 100ml" → Télécharge → Renomme en `HUGO-BOSS.jpg`
- **Versace Eros**: Recherche "Versace Eros 100ml" → Télécharge → Renomme en `VERSACE-EROS.jpg`

### Alcools
- **Grey Goose**: Recherche "Grey Goose Vodka 70cl" → Télécharge → Renomme en `GREY-GOOSE.jpg`
- **Hennessy**: Recherche "Hennessy VS 70cl" → Télécharge → Renomme en `HENNESSY-VS.jpg`
- **Johnnie Walker**: Recherche "Johnnie Walker Black Label" → Télécharge → Renomme en `JOHNNIE-BLACK.jpg`
- **Moët & Chandon**: Recherche "Moet Chandon Brut Imperial" → Télécharge → Renomme en `MOET-CHANDON.jpg`

### Chocolats
- **Ferrero Rocher**: Recherche "Ferrero Rocher T30" → Télécharge → Renomme en `FERRERO-ROCHER.jpg`
- **Godiva**: Recherche "Godiva Ballotin Or 250g" → Télécharge → Renomme en `GODIVA-GOLD.jpg`
- **Lindt**: Recherche "Lindt Lindor Assortiment" → Télécharge → Renomme en `LINDT-GOLD.jpg`
- **Toblerone**: Recherche "Toblerone 360g" → Télécharge → Renomme en `TOBLERONE-360G.jpg`

### Cigarettes
- **Marlboro**: Recherche "Marlboro Rouge Cartouche" → Télécharge → Renomme en `MARLBORO-RED.jpg`
- **Camel**: Recherche "Camel Blue Cartouche" → Télécharge → Renomme en `CAMEL-BLUE.jpg`
- **Winston**: Recherche "Winston Rouge Cartouche" → Télécharge → Renomme en `WINSTON-RED.jpg`

### Artisanat
- **Bracelet Bronze**: Recherche "Bracelet bronze artisanal africain" → Télécharge → Renomme en `BRACELET-BRONZE.jpg`
- **Masque Mossi**: Recherche "Masque traditionnel Mossi Burkina" → Télécharge → Renomme en `MASQUE-MOSSI.jpg`
- **Sac Bogolan**: Recherche "Sac Bogolan authentique" → Télécharge → Renomme en `SAC-BOGOLAN.jpg`
- **T-shirt**: Recherche "T-shirt Burkina Faso" → Télécharge → Renomme en `TSHIRT-BF.jpg`

## Étape 2: Placer les images

Copie toutes les images téléchargées dans le dossier:
```
dutyfree-backend-pro/public/uploads/
```

## Étape 3: Mettre à jour la base de données

Exécute ce script SQL dans Supabase:

```sql
UPDATE products SET image_url = 'CHANEL5-50ML.jpg' WHERE code = 'CHANEL5-50ML';
UPDATE products SET image_url = 'DIOR-SAUVAGE.jpg' WHERE code = 'DIOR-SAUVAGE';
UPDATE products SET image_url = 'HUGO-BOSS.jpg' WHERE code = 'HUGO-BOSS';
UPDATE products SET image_url = 'VERSACE-EROS.jpg' WHERE code = 'VERSACE-EROS';

UPDATE products SET image_url = 'GREY-GOOSE.jpg' WHERE code = 'GREY-GOOSE';
UPDATE products SET image_url = 'HENNESSY-VS.jpg' WHERE code = 'HENNESSY-VS';
UPDATE products SET image_url = 'JOHNNIE-BLACK.jpg' WHERE code = 'JOHNNIE-BLACK';
UPDATE products SET image_url = 'MOET-CHANDON.jpg' WHERE code = 'MOET-CHANDON';

UPDATE products SET image_url = 'FERRERO-ROCHER.jpg' WHERE code = 'FERRERO-ROCHER';
UPDATE products SET image_url = 'GODIVA-GOLD.jpg' WHERE code = 'GODIVA-GOLD';
UPDATE products SET image_url = 'LINDT-GOLD.jpg' WHERE code = 'LINDT-GOLD';
UPDATE products SET image_url = 'TOBLERONE-360G.jpg' WHERE code = 'TOBLERONE-360G';

UPDATE products SET image_url = 'MARLBORO-RED.jpg' WHERE code = 'MARLBORO-RED';
UPDATE products SET image_url = 'CAMEL-BLUE.jpg' WHERE code = 'CAMEL-BLUE';
UPDATE products SET image_url = 'WINSTON-RED.jpg' WHERE code = 'WINSTON-RED';

UPDATE products SET image_url = 'BRACELET-BRONZE.jpg' WHERE code = 'BRACELET-BRONZE';
UPDATE products SET image_url = 'MASQUE-MOSSI.jpg' WHERE code = 'MASQUE-MOSSI';
UPDATE products SET image_url = 'SAC-BOGOLAN.jpg' WHERE code = 'SAC-BOGOLAN';
UPDATE products SET image_url = 'TSHIRT-BF.jpg' WHERE code = 'TSHIRT-BF';
```

## Étape 4: Vérifier

Rafraîchis la page POS et la page produits - les vraies images devraient s'afficher!

## Astuce rapide

Tu peux aussi utiliser des sites comme:
- **Unsplash.com** - Images gratuites haute qualité
- **Pexels.com** - Images gratuites
- Sites officiels des marques pour les images produits
