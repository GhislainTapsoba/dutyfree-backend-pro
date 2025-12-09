# Guide d'Optimisation des Performances

## 1. Index Base de Données ✅

**Action:** Exécuter le script `scripts/007-add-performance-indexes.sql` dans Supabase

Ce script ajoute des index sur:
- Dates de vente (requêtes par période)
- Statuts (filtres fréquents)
- Relations (jointures)
- Recherches (barcode, email, etc.)

**Impact:** Réduction de 50-80% du temps de requête

## 2. Optimisations API Déjà Appliquées ✅

### API Products
- Sélection uniquement des champs nécessaires
- Suppression de la jointure supplier (non utilisée dans le POS)
- Réduction de ~40% de la taille des données

## 3. Optimisations Frontend Recommandées

### A. Cache React Query (Recommandé)

Installer React Query:
```bash
npm install @tanstack/react-query
```

Wrapper dans `app/layout.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### B. Lazy Loading des Composants

```typescript
// Au lieu de:
import { ReportsDashboard } from '@/components/reports/reports-dashboard'

// Utiliser:
const ReportsDashboard = dynamic(() => import('@/components/reports/reports-dashboard'), {
  loading: () => <Loader2 className="animate-spin" />
})
```

### C. Pagination Côté Serveur

Les APIs supportent déjà `?page=1&limit=20`. Utiliser partout au lieu de charger toutes les données.

## 4. Optimisations Supabase

### A. Connection Pooling

Dans `.env.local`:
```env
# Utiliser le pooler Supabase pour les connexions
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_POOLER_URL=https://xxx.pooler.supabase.com
```

### B. Row Level Security (RLS)

Actuellement désactivé car on utilise `createAdminClient()`. Pour production:
- Activer RLS sur toutes les tables
- Créer des policies par rôle
- Utiliser `createClient()` au lieu de `createAdminClient()`

## 5. Optimisations Réseau

### A. Compression Gzip

Dans `next.config.js`:
```javascript
module.exports = {
  compress: true,
  // ...
}
```

### B. CDN pour Images

Utiliser Supabase Storage avec CDN:
```typescript
const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${filename}`
```

## 6. Monitoring

### A. Logs de Performance

Ajouter dans les APIs lentes:
```typescript
const start = Date.now()
// ... requête
console.log(`[PERF] ${endpoint} took ${Date.now() - start}ms`)
```

### B. Supabase Dashboard

Vérifier dans Supabase Dashboard > Database > Query Performance:
- Requêtes lentes (> 1s)
- Index manquants
- Scans de table complets

## 7. Résultats Attendus

Après application de toutes les optimisations:

| Page | Avant | Après | Amélioration |
|------|-------|-------|--------------|
| Dashboard | 2-3s | 0.5-1s | 60-75% |
| POS | 2-3s | 0.3-0.5s | 80-85% |
| Reports | 3-5s | 1-2s | 60-70% |
| Products | 2s | 0.5s | 75% |

## 8. Actions Prioritaires

1. ✅ **Exécuter script d'index** (Impact: Élevé, Effort: Faible)
2. **Installer React Query** (Impact: Élevé, Effort: Moyen)
3. **Activer compression** (Impact: Moyen, Effort: Faible)
4. **Lazy loading** (Impact: Moyen, Effort: Moyen)
5. **Connection pooling** (Impact: Moyen, Effort: Faible)

## 9. Tests de Performance

Après chaque optimisation, tester avec:
```bash
# Chrome DevTools > Network
# Vérifier:
# - Temps de chargement total
# - Taille des réponses
# - Nombre de requêtes
```
