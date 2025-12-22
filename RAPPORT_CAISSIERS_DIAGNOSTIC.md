# Diagnostic - Rapport Caissiers

## État actuel de la route `/api/reports/cashiers`

### Réponse API (test du 21/12/2025)

```json
{
  "summary": {
    "total_cashiers": 4,
    "total_sales": 47,
    "total_revenue": 23189746.66
  },
  "cashiers": [
    {
      "id": "a69b0305-ed2d-40b1-b463-0ca31cf8ea7e",
      "name": "LeBig A",
      "employee_id": "",
      "sales_count": 2,
      "total_revenue": 10142100,
      "average_ticket": 5071050,
      "payment_methods": {
        "Mobile Money": 5097600,
        "Carte Bancaire": 5044500
      }
    },
    {
      "id": "982f2cda-f195-45a8-bef2-16d9c3d411bc",
      "name": "Arsene Tapsoba",
      "employee_id": "ADMIN001",
      "sales_count": 23,
      "total_revenue": 5410326.76,
      "average_ticket": 235231.59826086956,
      "payment_methods": {
        "Espèces": 5245200,
        "Carte Bancaire": 115640,
        "Mobile Money": 88500
      }
    },
    {
      "id": "34fc62bf-bec5-417f-ba44-0902ea6f02b2",
      "name": "LeBig Dicko",
      "employee_id": "",
      "sales_count": 16,
      "total_revenue": 3822969.9,
      "average_ticket": 238935.61875,
      "payment_methods": {
        "Espèces": 2626860,
        "Carte Bancaire": 770014.9,
        "Mobile Money": 204140
      }
    },
    {
      "id": "40c5bd3b-8f5f-4bdb-a4a5-5e4116522209",
      "name": "Roronoa Zoro",
      "employee_id": "",
      "sales_count": 6,
      "total_revenue": 3814350,
      "average_ticket": 635725,
      "payment_methods": {
        "Espèces": 1315000
      }
    }
  ]
}
```

## Vérification des calculs

### LeBig A
- Tickets : 2
- Revenu : 10,142,100 XOF
- Ticket moyen : 10,142,100 / 2 = **5,071,050 XOF** ✅ CORRECT

### Arsene Tapsoba
- Tickets : 23
- Revenu : 5,410,326.76 XOF
- Ticket moyen : 5,410,326.76 / 23 = **235,231.60 XOF** ✅ CORRECT

### LeBig Dicko
- Tickets : 16
- Revenu : 3,822,969.90 XOF
- Ticket moyen : 3,822,969.90 / 16 = **238,935.62 XOF** ✅ CORRECT

### Roronoa Zoro
- Tickets : 6
- Revenu : 3,814,350 XOF
- Ticket moyen : 3,814,350 / 6 = **635,725 XOF** ✅ CORRECT

## Problèmes potentiels identifiés

### 1. Ventes sans seller_id
Il est possible que certaines ventes n'aient pas de `seller_id` assigné, ce qui signifie qu'elles ne seraient pas comptabilisées dans aucun rapport de caissier.

**Solution** : Vérifier dans la base de données :
```sql
SELECT COUNT(*) as ventes_sans_caissier
FROM sales
WHERE seller_id IS NULL
  AND status = 'completed'
  AND sale_date >= '2025-12-01'
  AND sale_date <= '2025-12-31';
```

### 2. Problèmes de somme des paiements vs total_ttc
Le rapport calcule le revenu basé sur `total_ttc` des ventes. Cependant, si une vente a des paiements partiels ou en devises différentes, cela pourrait causer des écarts.

**Vérification** : S'assurer que la somme des paiements correspond au total_ttc :
```sql
SELECT
  s.id,
  s.ticket_number,
  s.total_ttc,
  COALESCE(SUM(p.amount_in_base_currency), 0) as total_paid
FROM sales s
LEFT JOIN payments p ON p.sale_id = s.id
WHERE s.status = 'completed'
  AND s.sale_date >= '2025-12-01'
GROUP BY s.id, s.ticket_number, s.total_ttc
HAVING s.total_ttc != COALESCE(SUM(p.amount_in_base_currency), 0);
```

### 3. Période de rapport
Le frontend utilise automatiquement le mois en cours. Vérifier que c'est bien la période attendue.

## Code source analysé

### Backend : `/app/api/reports/cashiers/route.ts`
- ✅ Requête SQL correcte
- ✅ Jointure avec users via foreign key
- ✅ Filtrage sur status = 'completed'
- ✅ Calcul du ticket moyen correct
- ✅ Agrégation par caissier correcte

### Frontend : `/app/(dashboard)/dashboard/reports/page.tsx`
- ✅ Appel API correct
- ✅ Extraction des données correcte
- ✅ Affichage dans le composant ReportsDashboard

### Composant : `/components/reports/reports-dashboard.tsx`
- ✅ Affichage du nom du caissier
- ✅ Affichage du nombre de tickets
- ✅ Affichage du revenu total
- ✅ Affichage du ticket moyen

## Recommandations

1. **Vérifier les ventes orphelines** : S'assurer que toutes les ventes ont un seller_id
2. **Comparer avec d'autres sources** : Vérifier manuellement quelques tickets
3. **Ajouter des logs** : Logger les données reçues pour debugging
4. **Améliorer le rapport** :
   - Afficher le nombre de ventes sans caissier
   - Ajouter une option pour filtrer par période personnalisée
   - Afficher les ventes annulées séparément
