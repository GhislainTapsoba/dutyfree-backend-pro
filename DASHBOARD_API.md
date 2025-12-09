# API Dashboard - Documentation

Ce document décrit les nouvelles routes API créées pour alimenter le dashboard.

## Routes disponibles

### 1. GET `/api/dashboard/stats`

Retourne les statistiques principales du dashboard pour une date donnée (par défaut: aujourd'hui).

#### Paramètres de requête (query params)

- `date` (optionnel): Date au format `YYYY-MM-DD`. Par défaut: date du jour.

#### Exemple de requête

```http
GET /api/dashboard/stats?date=2025-12-05
```

#### Réponse

```json
{
  "date": "2025-12-05",
  "revenue": {
    "today_ttc": 125000.50,
    "today_ht": 104166.67,
    "today_tax": 20833.83,
    "yesterday_ttc": 118000.00,
    "growth_percent": 5.93
  },
  "tickets": {
    "today": 45,
    "yesterday": 42,
    "growth_percent": 7.14,
    "average_amount": 2777.79
  },
  "discount": {
    "today": 1500.00
  },
  "active_sessions": 3,
  "top_products": {
    "by_quantity": [
      {
        "product_id": "uuid",
        "name": "Produit A",
        "code": "PROD-001",
        "quantity": 25,
        "revenue": 5000.00
      }
    ],
    "by_revenue": [
      {
        "product_id": "uuid",
        "name": "Produit B",
        "code": "PROD-002",
        "quantity": 5,
        "revenue": 15000.00
      }
    ]
  },
  "payment_methods": [
    {
      "method": "Espèces",
      "amount": 50000.00,
      "count": 20
    },
    {
      "method": "Carte bancaire",
      "amount": 75000.50,
      "count": 25
    }
  ]
}
```

#### Données fournies

- **CA du jour (revenue)**:
  - `today_ttc`: Chiffre d'affaires TTC du jour
  - `today_ht`: Chiffre d'affaires HT du jour
  - `today_tax`: Montant de la TVA du jour
  - `yesterday_ttc`: CA d'hier pour comparaison
  - `growth_percent`: Pourcentage d'évolution par rapport à hier

- **Tickets remis (tickets)**:
  - `today`: Nombre de tickets du jour
  - `yesterday`: Nombre de tickets d'hier
  - `growth_percent`: Pourcentage d'évolution
  - `average_amount`: Montant moyen par ticket

- **Remises (discount)**:
  - `today`: Total des remises accordées

- **Sessions actives**: Nombre de caisses ouvertes

- **Top produits**: Les 5 produits les plus vendus (par quantité et par CA)

- **Méthodes de paiement**: Répartition par moyen de paiement

---

### 2. GET `/api/dashboard/sales-evolution`

Retourne l'évolution des ventes sur une période donnée avec groupement par jour, semaine ou mois.

#### Paramètres de requête (query params)

- `period` (optionnel): Période d'analyse. Valeurs possibles:
  - `7days` (défaut): 7 derniers jours
  - `30days`: 30 derniers jours
  - `90days`: 90 derniers jours
  - `year`: 1 an

- `group_by` (optionnel): Groupement des données. Valeurs possibles:
  - `day` (défaut): Par jour
  - `week`: Par semaine
  - `month`: Par mois

#### Exemple de requête

```http
GET /api/dashboard/sales-evolution?period=30days&group_by=day
```

#### Réponse

```json
{
  "period": {
    "start": "2025-11-05",
    "end": "2025-12-05",
    "type": "30days",
    "group_by": "day"
  },
  "summary": {
    "total_revenue": 3500000.00,
    "total_tickets": 1250,
    "average_ticket": 2800.00,
    "trend_percent": 12.5
  },
  "highlights": {
    "best_day": {
      "date": "2025-11-28",
      "revenue": 150000.00,
      "tickets": 55
    },
    "worst_day": {
      "date": "2025-11-10",
      "revenue": 85000.00,
      "tickets": 28
    }
  },
  "evolution": [
    {
      "date": "2025-11-05",
      "revenue": 95000.00,
      "tickets": 35
    },
    {
      "date": "2025-11-06",
      "revenue": 102000.00,
      "tickets": 38
    }
  ]
}
```

#### Données fournies

- **Période (period)**: Informations sur la période analysée

- **Résumé (summary)**:
  - `total_revenue`: CA total sur la période
  - `total_tickets`: Nombre total de tickets
  - `average_ticket`: Ticket moyen
  - `trend_percent`: Tendance d'évolution (%)

- **Points remarquables (highlights)**:
  - `best_day`: Meilleur jour (le plus de CA)
  - `worst_day`: Jour le plus faible

- **Evolution**: Tableau des ventes groupées par période

---

## Utilisation dans le frontend

### Exemple avec fetch (JavaScript)

```javascript
// Récupérer les stats du dashboard
async function getDashboardStats(date = null) {
  const url = date
    ? `/api/dashboard/stats?date=${date}`
    : '/api/dashboard/stats'

  const response = await fetch(url)
  const data = await response.json()
  return data
}

// Récupérer l'évolution des ventes
async function getSalesEvolution(period = '7days', groupBy = 'day') {
  const response = await fetch(
    `/api/dashboard/sales-evolution?period=${period}&group_by=${groupBy}`
  )
  const data = await response.json()
  return data
}

// Utilisation
getDashboardStats().then(stats => {
  console.log('CA du jour:', stats.revenue.today_ttc)
  console.log('Tickets remis:', stats.tickets.today)
})

getSalesEvolution('30days', 'day').then(evolution => {
  console.log('Evolution:', evolution.evolution)
})
```

### Exemple avec Axios (TypeScript)

```typescript
import axios from 'axios'

interface DashboardStats {
  date: string
  revenue: {
    today_ttc: number
    today_ht: number
    today_tax: number
    yesterday_ttc: number
    growth_percent: number
  }
  tickets: {
    today: number
    yesterday: number
    growth_percent: number
    average_amount: number
  }
  // ... autres propriétés
}

async function fetchDashboardStats(date?: string): Promise<DashboardStats> {
  const params = date ? { date } : {}
  const { data } = await axios.get<DashboardStats>('/api/dashboard/stats', { params })
  return data
}

// Utilisation
const stats = await fetchDashboardStats()
console.log(`CA du jour: ${stats.revenue.today_ttc.toFixed(2)} €`)
```

---

## Notes importantes

1. **Authentification**: Ces routes nécessitent une authentification. Assurez-vous que l'utilisateur est connecté.

2. **Dates**: Toutes les dates sont au format ISO 8601 (`YYYY-MM-DD`).

3. **Montants**: Tous les montants sont en nombre décimal.

4. **Tickets remis**: Le compteur se réinitialise chaque jour (il montre les tickets du jour sélectionné).

5. **Performance**: Les données sont calculées en temps réel. Pour de meilleures performances, envisagez de mettre en cache les résultats côté frontend.

6. **Gestion des erreurs**: En cas d'erreur, l'API retourne un code HTTP approprié et un message d'erreur:
   ```json
   {
     "error": "Internal server error"
   }
   ```

---

## Exemples de cartes dashboard

### 1. Carte "CA du jour"

```jsx
<Card>
  <CardHeader>
    <CardTitle>CA du jour</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">
      {stats.revenue.today_ttc.toFixed(2)} €
    </div>
    <div className={`text-sm ${stats.revenue.growth_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
      {stats.revenue.growth_percent > 0 ? '+' : ''}{stats.revenue.growth_percent.toFixed(1)}% vs hier
    </div>
  </CardContent>
</Card>
```

### 2. Carte "Tickets remis"

```jsx
<Card>
  <CardHeader>
    <CardTitle>Tickets remis</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">
      {stats.tickets.today}
    </div>
    <div className="text-sm text-gray-600">
      Ticket moyen: {stats.tickets.average_amount.toFixed(2)} €
    </div>
  </CardContent>
</Card>
```

### 3. Carte "Evolution des ventes"

```jsx
<Card>
  <CardHeader>
    <CardTitle>Evolution des ventes (7 jours)</CardTitle>
  </CardHeader>
  <CardContent>
    <LineChart data={evolution.evolution} />
    <div className="text-sm text-gray-600">
      Tendance: {evolution.summary.trend_percent.toFixed(1)}%
    </div>
  </CardContent>
</Card>
```
