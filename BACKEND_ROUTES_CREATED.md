# Routes d'Authentification Créées

Ce document liste les routes d'authentification créées pour permettre au frontend de fonctionner avec le backend.

## Routes Créées

### 1. POST /api/auth/login

**Fichier**: `app/api/auth/login/route.ts`

**Description**: Authentifie un utilisateur avec username/email et password

**Requête**:
```json
{
  "username": "admin",  // ou "email": "admin@example.com"
  "password": "password123"
}
```

**Réponse réussie** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Fonctionnalités**:
- Support du login par username (employee_id) ou email
- Si username est fourni (pas d'@), cherche l'email correspondant dans la base
- Authentification via Supabase Auth
- Récupère le profil utilisateur avec son rôle
- Vérifie que l'utilisateur est actif
- Log de l'activité de connexion

### 2. POST /api/auth/logout

**Fichier**: `app/api/auth/logout/route.ts`

**Description**: Déconnecte l'utilisateur actuel

**Requête**: Aucun body requis

**Réponse réussie** (200):
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

**Fonctionnalités**:
- Déconnexion Supabase
- Log de l'activité de déconnexion

### 3. GET /api/users/me

**Fichier**: `app/api/users/me/route.ts` (Modifié)

**Description**: Récupère le profil de l'utilisateur connecté

**Headers requis**:
```
Authorization: Bearer <token>
```

**Réponse réussie** (200):
```json
{
  "id": "uuid",
  "username": "admin",
  "email": "admin@example.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

**Modifications apportées**:
- Changé le format de réponse de `{ data: {...} }` vers le format direct attendu par le frontend

## Configuration CORS

**Fichier**: `middleware.ts`

**Changements**:
- CORS origin changé de `http://localhost:3001` vers `http://localhost:3000`
- Autorise les requêtes depuis le frontend Next.js

## Fonctionnement avec Supabase

Le backend utilise toujours Supabase Auth en arrière-plan:

1. **Login**: Supabase Auth génère un access_token qui est retourné au frontend
2. **Token Storage**: Le frontend stocke le token dans localStorage
3. **Requêtes API**: Le token est envoyé dans le header `Authorization: Bearer <token>`
4. **Validation**: Le middleware Supabase valide automatiquement le token pour chaque requête

## Utilisation dans le Frontend

```typescript
import { authService } from '@/lib/services'

// Login
const response = await authService.login({
  username: 'admin',
  password: 'password123'
})
// Stocke automatiquement le token et l'utilisateur

// Get current user
const user = await authService.getCurrentUser()

// Logout
await authService.logout()
```

## Notes Importantes

1. **Token JWT**: Le token retourné est le access_token de Supabase Auth
2. **Expiration**: Le token expire selon la configuration Supabase (par défaut 1h)
3. **Refresh**: Pour l'instant pas de refresh automatique, l'utilisateur sera déconnecté à l'expiration
4. **Cookies**: Supabase utilise aussi des cookies HttpOnly pour la session

## Prochaines Étapes

1. ✅ Routes d'authentification créées
2. ✅ CORS configuré
3. ⏳ Ajouter le refresh token automatique
4. ⏳ Migrer toutes les autres routes pour correspondre au format frontend
5. ⏳ Supprimer les anciennes routes Supabase une fois la migration complète

## Tests

Pour tester l'authentification:

1. Créer un utilisateur (via Supabase ou route /api/auth/signup)
2. Tester le login:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"password123"}'
   ```
3. Utiliser le token retourné pour les requêtes suivantes
