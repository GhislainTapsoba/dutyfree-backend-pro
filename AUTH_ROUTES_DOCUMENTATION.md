# 🔐 Documentation des Routes d'Authentification

## Vue d'Ensemble

Le système d'authentification utilise **Supabase Auth** avec deux approches :
1. **Login** : Direct via Supabase côté client (pas de route backend)
2. **Register** : Via le backend pour gérer les profils et rôles

---

## 📋 Routes Disponibles

### 1. **Inscription Publique** ✅

**Endpoint :** `POST /api/auth/signup`

**Description :** Permet à n'importe qui de créer un nouveau compte utilisateur.

**Accès :** Public (pas d'authentification requise)

**Corps de la requête :**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Réponse (Succès 201) :**
```json
{
  "success": true,
  "message": "Compte créé avec succès",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": {
      "id": "uuid",
      "code": "cashier",
      "name": "Caissier",
      "permissions": {...}
    },
    "active": true,
    "created_at": "2025-11-25T..."
  }
}
```

**Réponses d'Erreur :**
```json
// 400 - Champs manquants
{
  "error": "Champs obligatoires: email, password, firstName, lastName"
}

// 400 - Mot de passe trop court
{
  "error": "Le mot de passe doit contenir au moins 6 caractères"
}

// 400 - Email déjà utilisé
{
  "error": "Un compte avec cet email existe déjà"
}

// 500 - Erreur serveur
{
  "error": "Erreur interne du serveur"
}
```

**Fonctionnement :**
1. Valide les champs obligatoires
2. Vérifie l'unicité de l'email
3. Crée l'utilisateur dans Supabase Auth
4. Crée le profil dans la table `users`
5. Attribue le rôle par défaut (cashier)
6. Enregistre l'activité (log)
7. Retourne le profil complet

**Rôle par Défaut :**
- Premier choix : `cashier`
- Fallback : Premier rôle **NON-ADMIN** disponible dans la table `roles`
- ⚠️ **IMPORTANT :** Le rôle `admin` est EXCLU de l'inscription publique

**Sécurité :**
- ❌ Impossible de créer un administrateur via `/api/auth/signup`
- ✅ Les administrateurs doivent être créés manuellement ou via `/api/auth/register` (admin uniquement)

---

### 2. **Création d'Utilisateur (Admin)** ✅

**Endpoint :** `POST /api/auth/register`

**Description :** Permet à un administrateur de créer un nouvel utilisateur avec des options avancées.

**Accès :** Authentifié + Rôle Admin uniquement

**Headers :**
```
Authorization: Bearer <supabase_access_token>
```

**Corps de la requête :**
```json
{
  "email": "employee@dutyfree.com",
  "password": "Password123",
  "first_name": "Marie",
  "last_name": "Dupont",
  "employee_id": "EMP001",
  "phone": "+226 XX XX XX XX",
  "role_id": "uuid-du-role",
  "point_of_sale_id": "uuid-du-pos"
}
```

**Réponse (Succès 201) :**
```json
{
  "data": {
    "id": "uuid",
    "email": "employee@dutyfree.com",
    "first_name": "Marie",
    "last_name": "Dupont",
    "employee_id": "EMP001",
    "phone": "+226 XX XX XX XX",
    "role": {...},
    "point_of_sale": {...},
    "active": true,
    "created_at": "2025-11-25T..."
  }
}
```

**Réponses d'Erreur :**
```json
// 401 - Non authentifié
{
  "error": "Non autorisé"
}

// 403 - Pas admin
{
  "error": "Seuls les administrateurs peuvent créer des utilisateurs"
}

// 400 - Champs manquants
{
  "error": "Champs obligatoires: email, password, first_name, last_name"
}
```

**Fonctionnement :**
1. Vérifie l'authentification de l'utilisateur actuel
2. Vérifie que l'utilisateur actuel est admin
3. Crée l'utilisateur dans Supabase Auth
4. Crée le profil dans la table `users` avec tous les champs
5. Enregistre l'activité (log)
6. Retourne le profil complet

---

### 3. **Login** ✅

**Endpoint :** Aucun (Direct Supabase)

**Description :** Le login se fait **directement via Supabase Auth** côté client.

**Méthode Utilisée :**
```typescript
// Côté Frontend
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "Password123"
})

// Session automatiquement créée et stockée dans cookies
```

**Ensuite, récupération du profil :**
```typescript
// Appel au backend pour obtenir le profil complet
const profile = await apiClient.auth.getCurrentUser()
// GET /api/users/me
```

**Avantages :**
- Pas de route backend nécessaire pour le login
- Gestion automatique des sessions par Supabase
- Tokens JWT dans cookies HTTP-only (sécurisé)
- Refresh automatique des tokens

---

### 4. **Récupération du Profil Utilisateur** ✅

**Endpoint :** `GET /api/users/me`

**Description :** Récupère le profil complet de l'utilisateur authentifié.

**Accès :** Authentifié

**Headers :**
```
Authorization: Bearer <supabase_access_token>
Cookie: sb-<project>-auth-token=...
```

**Réponse (Succès 200) :**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": {
      "id": "uuid",
      "code": "cashier",
      "name": "Caissier",
      "permissions": {...}
    },
    "point_of_sale": {...},
    "active": true,
    "created_at": "2025-11-25T..."
  }
}
```

**Réponse d'Erreur :**
```json
// 401 - Non authentifié
{
  "error": "Non autorisé"
}
```

---

### 5. **Logout** ✅

**Endpoint :** Aucun (Direct Supabase)

**Description :** Le logout se fait **directement via Supabase Auth** côté client.

**Méthode Utilisée :**
```typescript
// Côté Frontend
await supabase.auth.signOut()

// Session automatiquement détruite
// Cookies supprimés
```

---

## 🔄 Flux Complets

### Flux d'Inscription (Signup)

```
┌─────────────────────────────────────────────┐
│  FRONTEND                                    │
│  Page /register                              │
│                                              │
│  User remplit formulaire:                   │
│  - email                                     │
│  - password                                  │
│  - firstName                                 │
│  - lastName                                  │
└────────────────┬────────────────────────────┘
                 │
                 │ POST /api/auth/signup
                 │ { email, password, firstName, lastName }
                 ▼
┌─────────────────────────────────────────────┐
│  BACKEND                                     │
│  /api/auth/signup                            │
│                                              │
│  1. Valide champs                            │
│  2. Vérifie email unique                     │
│  3. Crée user Supabase Auth                  │
│  4. Crée profil table users                  │
│  5. Attribue rôle cashier                    │
└────────────────┬────────────────────────────┘
                 │
                 │ Success
                 ▼
┌─────────────────────────────────────────────┐
│  FRONTEND                                    │
│                                              │
│  Toast: "Compte créé avec succès"           │
│  Redirect: /login                            │
└─────────────────────────────────────────────┘
```

### Flux de Connexion (Login)

```
┌─────────────────────────────────────────────┐
│  FRONTEND                                    │
│  Page /login                                 │
│                                              │
│  User entre credentials:                    │
│  - email                                     │
│  - password                                  │
└────────────────┬────────────────────────────┘
                 │
                 │ DIRECT Supabase Auth
                 │ supabase.auth.signInWithPassword()
                 ▼
┌─────────────────────────────────────────────┐
│  SUPABASE AUTH                               │
│                                              │
│  1. Vérifie credentials                      │
│  2. Génère JWT access_token                  │
│  3. Crée session                             │
│  4. Stocke dans cookies HTTP-only            │
└────────────────┬────────────────────────────┘
                 │
                 │ Session créée
                 ▼
┌─────────────────────────────────────────────┐
│  FRONTEND                                    │
│                                              │
│  GET /api/users/me (avec token)             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  BACKEND                                     │
│  /api/users/me                               │
│                                              │
│  1. Vérifie token JWT                        │
│  2. Récupère profil complet                  │
│  3. Retourne user + role + permissions       │
└────────────────┬────────────────────────────┘
                 │
                 │ Profil complet
                 ▼
┌─────────────────────────────────────────────┐
│  FRONTEND                                    │
│                                              │
│  Toast: "Bienvenue"                          │
│  Redirect: /dashboard (ou selon rôle)       │
└─────────────────────────────────────────────┘
```

---

## 🔒 Sécurité

### Validation des Mots de Passe

**Règles Actuelles :**
- Minimum : 6 caractères
- Pas de règles de complexité (peut être ajouté)

**Recommandations :**
```typescript
// Ajouter dans signup/route.ts
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

if (!passwordRegex.test(password)) {
  return NextResponse.json({
    error: "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial"
  }, { status: 400 })
}
```

### Protection Contre les Abus

**Rate Limiting (Recommandé) :**
```typescript
// À ajouter avec un middleware ou une bibliothèque
import rateLimit from "express-rate-limit"

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: "Trop de tentatives d'inscription, réessayez plus tard"
})
```

### Validation Email

**Actuellement :** Format email validé par le navigateur + Supabase

**Amélioration Possible :**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

if (!emailRegex.test(email)) {
  return NextResponse.json({
    error: "Format d'email invalide"
  }, { status: 400 })
}
```

---

## 🧪 Tests

### Test Inscription

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@dutyfree.com",
    "password": "Test123456",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Réponse Attendue :**
```json
{
  "success": true,
  "message": "Compte créé avec succès",
  "data": {
    "id": "...",
    "email": "test@dutyfree.com",
    "first_name": "Test",
    "last_name": "User",
    "role": {...}
  }
}
```

### Test Login (via Frontend)

```javascript
// Dans la console navigateur
const supabase = createClient()
const { data, error } = await supabase.auth.signInWithPassword({
  email: "test@dutyfree.com",
  password: "Test123456"
})

console.log(data) // Session + user
```

### Test Récupération Profil

```bash
# Après login, avec le token
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <access_token>" \
  -H "Cookie: sb-..."
```

---

## 📊 Comparaison des Routes

| Route | Méthode | Authentification | Rôle Requis | Usage |
|-------|---------|------------------|-------------|-------|
| `/api/auth/signup` | POST | Non | Aucun | Inscription publique |
| `/api/auth/register` | POST | Oui | Admin | Création par admin |
| Login | - | Non | Aucun | Direct Supabase |
| `/api/users/me` | GET | Oui | Aucun | Profil utilisateur |
| Logout | - | Oui | Aucun | Direct Supabase |

---

## 🔧 Configuration Requise

### Table `roles`

Au moins un rôle doit exister avec le code `cashier` :

```sql
INSERT INTO roles (code, name, permissions) VALUES
('cashier', 'Caissier', '{"sales": ["create", "read"], "products": ["read"]}');
```

### Table `users`

Structure attendue :
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR UNIQUE NOT NULL,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  employee_id VARCHAR,
  phone VARCHAR,
  role_id UUID REFERENCES roles(id),
  point_of_sale_id UUID REFERENCES point_of_sales(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📝 Notes Importantes

1. **Pas de route `/api/auth/login`**
   - Le login se fait directement via Supabase côté client
   - Plus sécurisé et plus simple

2. **Deux routes d'inscription**
   - `/api/auth/signup` : Pour les utilisateurs (public)
   - `/api/auth/register` : Pour les admins (création avancée)

3. **Rôle par défaut**
   - Signup : Attribue automatiquement `cashier`
   - Register (admin) : Peut choisir n'importe quel rôle

4. **Email de confirmation**
   - Actuellement désactivé (`email_confirm: true`)
   - Peut être activé pour production

---

**Date :** 2025-11-25
**Version :** 1.0.0
**Statut :** ✅ Opérationnel
