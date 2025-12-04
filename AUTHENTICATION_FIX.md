# Corrections d'Authentification - Backend

## Problème Identifié

Les endpoints API retournaient des erreurs **401 Unauthorized** même lorsque l'utilisateur était connecté. Le problème était que le backend essayait de récupérer l'utilisateur via `supabase.auth.getUser()` sans passer le token, ce qui ne fonctionnait que si les cookies de session étaient automatiquement envoyés.

## Solution Appliquée

### Côté Backend (✅ Corrigé)

Tous les endpoints POST protégés ont été mis à jour pour accepter le token d'authentification de deux manières:

1. **Cookie `auth_token`** - Pour les requêtes same-origin
2. **Header `Authorization: Bearer <token>`** - Pour les requêtes cross-origin ou explicites

#### Endpoints Corrigés:

- ✅ `/api/loyalty/cards` (POST) - `app/api/loyalty/cards/route.ts`
- ✅ `/api/loyalty/cards/[id]/points` (POST) - `app/api/loyalty/cards/[id]/points/route.ts`
- ✅ `/api/hotel-guests` (POST) - `app/api/hotel-guests/route.ts`
- ✅ `/api/point-of-sales` (POST) - `app/api/point-of-sales/route.ts`
- ✅ `/api/currencies` (POST) - `app/api/currencies/route.ts`
- ✅ `/api/menus` (GET/POST) - `app/api/menus/route.ts`

#### Code Pattern Utilisé:

```typescript
// Get auth token from cookie or Authorization header
const authToken = request.cookies.get('auth_token')?.value ||
                 request.headers.get('authorization')?.replace('Bearer ', '')

if (!authToken) {
  return NextResponse.json({
    error: "Non autorisé",
    details: "Token d'authentification manquant"
  }, { status: 401 })
}

const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser(authToken)

if (!user || authError) {
  return NextResponse.json({
    error: "Non autorisé",
    details: authError?.message || "Token invalide"
  }, { status: 401 })
}
```

## Action Requise Côté Frontend

### Option 1: Envoyer le token via l'Authorization Header (Recommandé)

Mettre à jour toutes les requêtes fetch pour inclure le token dans les headers:

```typescript
const token = localStorage.getItem('auth_token') ||
              document.cookie.split('auth_token=')[1]?.split(';')[0]

const response = await fetch('http://localhost:3001/api/loyalty/cards', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(data)
})
```

### Option 2: Configurer les cookies pour le cross-origin

Si le frontend et le backend sont sur des ports différents (ex: frontend:3000, backend:3001), configurer fetch pour inclure les credentials:

```typescript
const response = await fetch('http://localhost:3001/api/loyalty/cards', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Envoie les cookies
  body: JSON.stringify(data)
})
```

**IMPORTANT**: Cela nécessite également que le backend configure CORS correctement.

## Erreurs 404 Observées

Certaines requêtes frontend appellent `localhost:3000` au lieu de `localhost:3001`:

- `POST http://localhost:3000/api/auth/register` - Doit être `localhost:3001`
- `PUT http://localhost:3000/api/settings/company` - Doit être `localhost:3001`

**Action**: Vérifier la configuration de l'API base URL dans le frontend (probablement dans un fichier de config ou `.env`).

## Configuration Recommandée

### Frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Utilisation dans le code:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const response = await fetch(`${API_URL}/api/loyalty/cards`, {
  // ...
})
```

## Tests

Pour tester les corrections:

1. S'assurer que le token est disponible dans le frontend:
   ```javascript
   console.log('Auth token:', localStorage.getItem('auth_token'))
   ```

2. Tester une requête POST avec le token:
   ```javascript
   const token = localStorage.getItem('auth_token')

   fetch('http://localhost:3001/api/loyalty/cards', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`,
     },
     body: JSON.stringify({
       customer_name: 'Test Client',
       customer_email: 'test@example.com'
     })
   })
   .then(res => res.json())
   .then(data => console.log('Success:', data))
   .catch(err => console.error('Error:', err))
   ```

## Logs Utiles

Le backend affiche maintenant des logs détaillés:
- `[Loyalty Cards POST] All cookies:` - Liste des cookies reçus
- `[Loyalty Cards POST] Auth token found:` - Indique si le token a été trouvé
- `[Loyalty Cards POST] Auth user:` - Affiche l'ID de l'utilisateur authentifié

Vérifier les logs du serveur backend pour diagnostiquer les problèmes d'authentification.

## Date de Correction

2025-12-03
