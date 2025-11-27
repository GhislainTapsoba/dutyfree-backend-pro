# Duty Free Management System - Backend

Système de gestion complet pour boutique Duty Free à l'aéroport international de Ouagadougou.

## Prérequis

- Node.js 18+
- VS Code
- Extension REST Client (ou Postman/Insomnia)
- Compte Supabase configuré

## Installation

### 1. Cloner et installer les dépendances

\`\`\`bash
# Télécharger le projet via v0 (bouton "Download ZIP" ou CLI shadcn)
# Puis dans le terminal VS Code:

cd dutyfree-backend
npm install
\`\`\`

### 2. Configuration des variables d'environnement

Créez un fichier `.env.local` à la racine:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
\`\`\`

### 3. Initialiser la base de données

Exécutez les scripts SQL dans Supabase Dashboard > SQL Editor:

1. `scripts/001-create-schema.sql` - Schéma principal
2. `scripts/002-add-missing-tables.sql` - Tables additionnelles

### 4. Lancer le serveur de développement

\`\`\`bash
npm run dev
\`\`\`

Le serveur démarre sur `http://localhost:3000`

## Structure des APIs

### Authentification & Utilisateurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Créer un compte utilisateur |
| GET | `/api/users` | Liste des utilisateurs |
| GET | `/api/users/me` | Utilisateur connecté |
| PUT | `/api/users/[id]` | Modifier un utilisateur |
| GET | `/api/users/[id]/activity` | Historique d'activité |
| GET | `/api/roles` | Liste des rôles |

### Produits & Catégories

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/products` | Liste des produits |
| POST | `/api/products` | Créer un produit |
| GET | `/api/products/[id]` | Détail d'un produit |
| PUT | `/api/products/[id]` | Modifier un produit |
| DELETE | `/api/products/[id]` | Supprimer un produit |
| GET | `/api/products/categories` | Liste des catégories |
| POST | `/api/products/categories` | Créer une catégorie |

### Stock & Inventaire

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/stock` | État du stock |
| GET | `/api/stock/movements` | Mouvements de stock |
| POST | `/api/stock/movements` | Enregistrer un mouvement |
| GET | `/api/stock/lots` | Liste des lots/sommiers |
| POST | `/api/stock/lots` | Créer un lot |
| GET | `/api/stock/inventory` | Sessions d'inventaire |
| POST | `/api/stock/inventory` | Créer un inventaire |
| PUT | `/api/stock/inventory/[id]` | Valider l'inventaire |

### Fournisseurs & Commandes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/suppliers` | Liste des fournisseurs |
| POST | `/api/suppliers` | Créer un fournisseur |
| GET | `/api/purchase-orders` | Commandes fournisseurs |
| POST | `/api/purchase-orders` | Créer une commande |
| PUT | `/api/purchase-orders/[id]` | Modifier/Réceptionner |

### Caisses & Sessions

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/cash-registers` | Liste des caisses |
| POST | `/api/cash-registers` | Créer une caisse |
| GET | `/api/cash-sessions` | Sessions de caisse |
| POST | `/api/cash-sessions` | Ouvrir une session |
| PUT | `/api/cash-sessions/[id]` | Fermer une session |
| GET | `/api/cash-sessions/current` | Session active |
| GET | `/api/point-of-sales` | Points de vente |

### Ventes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sales` | Liste des ventes |
| POST | `/api/sales` | Enregistrer une vente |
| GET | `/api/sales/[id]` | Détail d'une vente |
| GET | `/api/sales/[id]/receipt` | Ticket de caisse |
| GET | `/api/sales/by-ticket/[num]` | Recherche par ticket |

### Paiements & Devises

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payments` | Liste des paiements |
| POST | `/api/payments` | Enregistrer un paiement |
| GET | `/api/payments/methods` | Méthodes de paiement |
| GET | `/api/currencies` | Liste des devises |
| PUT | `/api/currencies/[code]` | Modifier taux de change |
| POST | `/api/currencies/convert` | Convertir un montant |

### Promotions & Fidélité

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/promotions` | Liste des promotions |
| POST | `/api/promotions` | Créer une promotion |
| GET | `/api/loyalty/cards` | Cartes de fidélité |
| POST | `/api/loyalty/cards` | Créer une carte |
| POST | `/api/loyalty/cards/[id]/points` | Ajouter/Retirer points |
| GET | `/api/hotel-guests` | Clients hébergés |

### Reporting & Analytics

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/reports/sales` | Rapport des ventes |
| GET | `/api/reports/stock` | Rapport du stock |
| GET | `/api/reports/payments` | Rapport des paiements |
| GET | `/api/reports/cashiers` | Performance caissiers |
| GET | `/api/reports/kpi` | KPIs (ticket moyen, taux capture) |
| GET | `/api/reports/export` | Export CSV |

### Données Externes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/passengers` | Infos passagers |
| POST | `/api/passengers` | Scanner carte embarquement |
| GET | `/api/external-data` | Données externes (nb passagers) |
| POST | `/api/external-data` | Saisir données manuelles |
| GET | `/api/technical-sheets` | Fiches techniques |

### Paramètres

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/settings` | Tous les paramètres |
| GET | `/api/settings/company` | Infos société |
| PUT | `/api/settings/company` | Modifier infos société |
| GET | `/api/settings/receipt-messages` | Messages tickets |
| PUT | `/api/settings/receipt-messages` | Modifier messages |

## Tester les APIs dans VS Code

### Option 1: Extension REST Client

Installez l'extension "REST Client" et créez un fichier `api.http`:

\`\`\`http
### Variables
@baseUrl = http://localhost:3000/api
@token = votre_token_jwt

### Créer un produit
POST {{baseUrl}}/products
Content-Type: application/json

{
  "code": "PROD001",
  "barcode": "3760001234567",
  "name_fr": "Parfum Chanel N°5",
  "name_en": "Chanel N°5 Perfume",
  "category_id": "uuid-categorie",
  "price_xof": 85000,
  "price_eur": 130,
  "price_usd": 142,
  "tax_rate": 0,
  "stock_quantity": 50,
  "min_stock_level": 10
}

### Liste des produits
GET {{baseUrl}}/products?category=parfums&in_stock=true

### Enregistrer une vente
POST {{baseUrl}}/sales
Content-Type: application/json

{
  "cash_session_id": "uuid-session",
  "cashier_id": "uuid-caissier",
  "passenger_id": "uuid-passager",
  "items": [
    {
      "product_id": "uuid-produit",
      "quantity": 2,
      "unit_price": 85000,
      "discount_amount": 0
    }
  ],
  "payments": [
    {
      "method": "card",
      "currency": "EUR",
      "amount": 260,
      "amount_xof": 170000
    }
  ]
}

### Rapport des ventes
GET {{baseUrl}}/reports/sales?period=daily&date=2025-01-15

### Export CSV
GET {{baseUrl}}/reports/export?type=sales&start_date=2025-01-01&end_date=2025-01-31
\`\`\`

### Option 2: Terminal avec cURL

\`\`\`bash
# Créer un produit
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"code":"PROD001","name_fr":"Test","price_xof":10000}'

# Liste des produits
curl http://localhost:3000/api/products

# Rapport des ventes
curl "http://localhost:3000/api/reports/sales?period=monthly"
\`\`\`

## Mode Hors Ligne

Le système supporte le mode hors ligne via `/api/offline/sync`:

\`\`\`http
### Synchroniser les données hors ligne
POST {{baseUrl}}/offline/sync
Content-Type: application/json

{
  "sales": [...],
  "stock_movements": [...],
  "sync_timestamp": "2025-01-15T10:30:00Z"
}
\`\`\`

## Support Multi-Caisses

Chaque point de vente peut avoir plusieurs caisses:

1. Créer un point de vente
2. Créer les caisses associées
3. Ouvrir une session de caisse au début de vacation
4. Enregistrer les ventes
5. Fermer la session en fin de vacation

## Conformité Douanière

- Les lots/sommiers sont suivis via `/api/stock/lots`
- Alertes d'apurement automatiques
- Traçabilité complète des mouvements

## Structure des Fichiers

\`\`\`
├── app/
│   └── api/
│       ├── auth/           # Authentification
│       ├── products/       # Gestion produits
│       ├── stock/          # Stock & inventaire
│       ├── suppliers/      # Fournisseurs
│       ├── purchase-orders/# Commandes
│       ├── cash-registers/ # Caisses
│       ├── cash-sessions/  # Sessions de caisse
│       ├── sales/          # Ventes
│       ├── payments/       # Paiements
│       ├── currencies/     # Devises
│       ├── promotions/     # Promotions
│       ├── loyalty/        # Fidélité
│       ├── reports/        # Reporting
│       ├── users/          # Utilisateurs
│       ├── roles/          # Rôles
│       └── settings/       # Paramètres
├── lib/
│   ├── supabase/          # Config Supabase
│   ├── types/             # Types TypeScript
│   └── utils/             # Utilitaires
├── scripts/               # Scripts SQL
└── middleware.ts          # Auth middleware
# dutyfree-backend-pro
