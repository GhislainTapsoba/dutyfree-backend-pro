# Guide des Paiements - Duty Free

## Workflow de Paiement

### Principe
Les paiements TPE et Mobile Money se font via des **appareils externes**. L'application sert uniquement à **enregistrer** la transaction après validation du paiement.

### Processus

1. **Espèces**
   - Client donne l'argent
   - Caissier saisit le montant reçu
   - Système calcule la monnaie
   - Validation → Ticket imprimé

2. **Carte Bancaire (TPE externe)**
   - Client présente sa carte sur le TPE physique
   - Caissier attend la confirmation sur le TPE
   - Une fois validé sur le TPE → Clic "Paiement reçu - Valider"
   - Système enregistre avec méthode "CARD" → Ticket imprimé

3. **Mobile Money (Orange/Moov)**
   - Client compose le code sur son téléphone
   - Caissier attend le SMS de confirmation
   - Une fois confirmé → Clic "Paiement reçu - Valider"
   - Système enregistre avec méthode "MOBILE" → Ticket imprimé

### Important
- Le caissier ne doit cliquer sur "Valider" qu'après avoir reçu la confirmation du paiement
- Chaque vente est enregistrée avec la bonne méthode de paiement
- Les rapports montrent les montants par méthode de paiement

---

## APIs Créées (Pour intégration future si besoin)

### 1. Paiement TPE

#### Initier un paiement
```http
POST /api/payments/tpe/initiate
Content-Type: application/json

{
  "amount": 50000,
  "currency_code": "XOF",
  "sale_id": "uuid-optional"
}
```

**Réponse:**
```json
{
  "data": {
    "transaction_reference": "TPE1234567890",
    "status": "pending",
    "message": "En attente de validation sur le TPE",
    "expires_at": "2025-01-20T10:35:00Z"
  }
}
```

#### Vérifier le statut
```http
GET /api/payments/tpe/verify?transaction_reference=TPE1234567890
```

**Réponse:**
```json
{
  "data": {
    "transaction_reference": "TPE1234567890",
    "status": "completed",
    "authorization_code": "AUTH123456"
  }
}
```

### 2. Paiement Mobile Money

#### Initier un paiement
```http
POST /api/payments/mobile/initiate
Content-Type: application/json

{
  "amount": 50000,
  "currency_code": "XOF",
  "phone_number": "+22670123456",
  "provider": "orange_money",
  "sale_id": "uuid-optional"
}
```

**Réponse:**
```json
{
  "data": {
    "transaction_reference": "MM1234567890",
    "status": "pending",
    "message": "Code de confirmation envoyé au +22670123456",
    "provider": "orange_money",
    "expires_at": "2025-01-20T10:35:00Z"
  }
}
```

#### Vérifier le statut
```http
GET /api/payments/mobile/verify?transaction_reference=MM1234567890
```

**Réponse:**
```json
{
  "data": {
    "transaction_reference": "MM1234567890",
    "status": "completed",
    "transaction_id": "TXN789456"
  }
}
```

## Intégrations Réelles

### Orange Money (Burkina Faso)

**Documentation:** https://developer.orange.com/apis/orange-money-webpay/

**Étapes:**
1. Créer un compte développeur sur https://developer.orange.com
2. Obtenir les credentials (merchant_key, API key)
3. Configurer les variables d'environnement:
```env
ORANGE_MONEY_TOKEN=your_token
ORANGE_MERCHANT_KEY=your_merchant_key
ORANGE_API_URL=https://api.orange.com/orange-money-webpay/dev/v1
```

**Code d'intégration dans `/api/payments/mobile/initiate/route.ts`:**
```typescript
const response = await fetch(`${process.env.ORANGE_API_URL}/webpayment`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.ORANGE_MONEY_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    merchant_key: process.env.ORANGE_MERCHANT_KEY,
    currency: currency_code,
    order_id: transactionRef,
    amount: amount,
    return_url: `${process.env.APP_URL}/api/payments/mobile/callback`,
    cancel_url: `${process.env.APP_URL}/pos`,
    notif_url: `${process.env.APP_URL}/api/payments/mobile/webhook`,
    lang: 'fr',
    reference: transactionRef
  })
})
```

### Moov Money (Burkina Faso)

**Contact:** Contacter Moov Africa Burkina pour obtenir l'accès API
- Email: support@moovafrica.bf
- Téléphone: +226 25 XX XX XX

**Variables d'environnement:**
```env
MOOV_MONEY_API_KEY=your_api_key
MOOV_MONEY_API_URL=https://api.moov-africa.bf
```

### TPE (Terminal de Paiement Électronique)

**Fournisseurs au Burkina Faso:**

1. **Monetbil** - https://www.monetbil.com
   - Support Visa, Mastercard
   - API REST simple
   
2. **CinetPay** - https://cinetpay.com
   - Support multi-pays Afrique de l'Ouest
   - Intégration facile

3. **PayDunya** - https://paydunya.com
   - Support Orange Money, Moov Money, cartes bancaires
   - SDK disponible

**Exemple avec CinetPay:**
```env
CINETPAY_API_KEY=your_api_key
CINETPAY_SITE_ID=your_site_id
CINETPAY_API_URL=https://api-checkout.cinetpay.com/v2
```

```typescript
const response = await fetch(`${process.env.CINETPAY_API_URL}/payment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apikey: process.env.CINETPAY_API_KEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: transactionRef,
    amount: amount,
    currency: currency_code,
    description: "Achat Duty Free",
    return_url: `${process.env.APP_URL}/api/payments/tpe/callback`,
    notify_url: `${process.env.APP_URL}/api/payments/tpe/webhook`,
    channels: "CREDIT_CARD"
  })
})
```

## Intégration Automatique (Optionnel)

Si vous souhaitez intégrer directement les APIs des fournisseurs:

### Pour TPE:
1. Utilisateur clique sur "Carte"
2. Frontend appelle `/api/payments/tpe/initiate`
3. Afficher "En attente du TPE..."
4. Polling toutes les 2 secondes sur `/api/payments/tpe/verify`
5. Quand status = "completed", finaliser la vente

### Pour Mobile Money:
1. Utilisateur saisit son numéro et choisit le provider
2. Frontend appelle `/api/payments/mobile/initiate`
3. Afficher "Code envoyé au XXX, entrez le code"
4. Polling toutes les 3 secondes sur `/api/payments/mobile/verify`
5. Quand status = "completed", finaliser la vente

**Note:** Cette intégration automatique nécessite des contrats avec les fournisseurs et n'est pas obligatoire pour le fonctionnement de base.

## Sécurité

- Toujours valider les montants côté serveur
- Vérifier les signatures des webhooks
- Logger toutes les transactions
- Implémenter un timeout (5 minutes max)
- Gérer les cas d'échec et remboursements

## Tests

Mode simulation activé par défaut. Pour tester:
- TPE: 80% de succès après 3 secondes
- Mobile: 70% de succès aléatoire

Pour activer le mode production, configurer les variables d'environnement des fournisseurs.
