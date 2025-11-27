# 👤 Guide : Créer le Premier Administrateur

## 🎯 Objectif

Ce guide explique comment créer le **premier compte administrateur** dans Supabase pour pouvoir accéder à l'application et gérer les autres utilisateurs.

---

## ⚠️ Important

- L'inscription publique (`/api/auth/signup`) **NE PERMET PAS** de créer des administrateurs
- Les utilisateurs qui s'inscrivent reçoivent automatiquement un rôle **non-admin** (cashier, etc.)
- Seul un **administrateur existant** peut créer d'autres administrateurs via `/api/auth/register`
- Vous devez créer le **premier admin manuellement** dans Supabase

---

## 📋 Prérequis

Avant de commencer, assurez-vous que :

1. ✅ La base de données Supabase est configurée
2. ✅ Les tables sont créées (via les scripts SQL)
3. ✅ La table `roles` contient un rôle avec `code = 'admin'`

### Vérifier que le Rôle Admin Existe

Allez sur Supabase Dashboard → Table Editor → Table `roles`

**Doit contenir au minimum :**
```sql
id                                    | code    | name            | permissions
--------------------------------------|---------|-----------------|-------------
<uuid>                                | admin   | Administrateur  | {...}
```

Si le rôle n'existe pas, créez-le :
```sql
INSERT INTO roles (code, name, permissions) VALUES (
  'admin',
  'Administrateur',
  '{
    "users": ["create", "read", "update", "delete"],
    "products": ["create", "read", "update", "delete"],
    "sales": ["create", "read", "update", "delete", "cancel"],
    "reports": ["read", "export"],
    "settings": ["read", "update"],
    "roles": ["create", "read", "update", "delete"]
  }'::jsonb
);
```

---

## 🚀 Méthode 1 : Via Supabase Dashboard (Recommandée)

### Étape 1 : Créer l'Utilisateur dans Supabase Auth

1. **Ouvrir Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **Sélectionner votre projet**
   - Projet : `ntqsbgbashglzulkwypf`

3. **Aller dans Authentication**
   - Menu latéral → **Authentication** → **Users**

4. **Créer un nouvel utilisateur**
   - Cliquer sur **"Add User"** (en haut à droite)

5. **Remplir le formulaire**
   ```
   Email: admin@dutyfree.com
   Password: <choisir un mot de passe fort>
   Auto Confirm User: ✅ Coché
   ```

6. **Cliquer sur "Create User"**

7. **Noter l'UUID de l'utilisateur créé**
   - Copier l'UUID affiché (format : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Étape 2 : Créer le Profil dans la Table `users`

1. **Aller dans Table Editor**
   - Menu latéral → **Table Editor**

2. **Sélectionner la table `users`**

3. **Insérer une nouvelle ligne**
   - Cliquer sur **"Insert row"** ou **"+ Insert"**

4. **Remplir les champs**
   ```
   id: <UUID copié de l'étape 1-7> 982f2cda-f195-45a8-bef2-16d9c3d411bc
   email: admin@dutyfree.com
   first_name: Admin
   last_name: System
   role_id: <UUID du rôle admin (voir table roles)> 6705bfb0-6e68-4856-8a3b-cb0b0ae7c948
   active: true
   employee_id: ADMIN001 (optionnel)
   phone: +226 XX XX XX XX (optionnel)
   point_of_sale_id: null (optionnel)
   ```

5. **Sauvegarder**
   - Cliquer sur **"Save"**

### Étape 3 : Vérifier

1. **Aller sur l'application**
   ```
   http://localhost:3002/login
   ```

2. **Se connecter**
   ```
   Email: admin@dutyfree.com
   Password: <mot de passe choisi>
   ```

3. **Vérifier les permissions**
   - Vous devez avoir accès à toutes les sections
   - Menu "Utilisateurs" visible
   - Possibilité de créer d'autres utilisateurs

---

## 🚀 Méthode 2 : Via SQL (Alternative)

Si vous préférez utiliser SQL directement :

### Étape 1 : Créer l'Utilisateur Auth + Profil

**⚠️ Attention :** Cette méthode nécessite d'avoir accès au SQL Editor de Supabase.

1. **Aller dans SQL Editor**
   - Supabase Dashboard → SQL Editor

2. **Exécuter ce script**

```sql
-- 1. Créer l'utilisateur dans auth.users (via une fonction admin)
-- Note: Remplacez 'VotreMotDePasseSecurisé' par un vrai mot de passe fort
DO $$
DECLARE
  new_user_id uuid;
  admin_role_id uuid;
BEGIN
  -- Récupérer l'ID du rôle admin
  SELECT id INTO admin_role_id
  FROM roles
  WHERE code = 'admin'
  LIMIT 1;

  -- Vérifier que le rôle admin existe
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Le rôle admin n''existe pas. Créez-le d''abord.';
  END IF;

  -- Créer un UUID pour le nouvel utilisateur
  new_user_id := gen_random_uuid();

  -- Insérer dans auth.users (nécessite permissions service_role)
  -- Cette partie doit être faite via le Dashboard ou l'API admin
  RAISE NOTICE 'Veuillez créer l''utilisateur via le Dashboard Supabase avec l''email: admin@dutyfree.com';
  RAISE NOTICE 'Puis utilisez cet UUID dans la table users: %', new_user_id;

  -- Après avoir créé l'utilisateur dans le Dashboard, exécutez la partie suivante
  -- en remplaçant <UUID_FROM_DASHBOARD> par l'UUID réel
END $$;
```

3. **Créer l'utilisateur via Dashboard** (voir Méthode 1, Étape 1)

4. **Puis insérer le profil avec ce SQL**

```sql
-- 2. Créer le profil dans la table users
-- Remplacez <UUID_FROM_DASHBOARD> par l'UUID de l'utilisateur créé
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  role_id,
  active,
  employee_id
) VALUES (
  '<UUID_FROM_DASHBOARD>', -- UUID de l'utilisateur auth
  'admin@dutyfree.com',
  'Admin',
  'System',
  (SELECT id FROM roles WHERE code = 'admin' LIMIT 1),
  true,
  'ADMIN001'
);
```

---

## 🚀 Méthode 3 : Via Script Node.js

Si vous voulez automatiser la création :

### Étape 1 : Créer un script

Créez un fichier `create-admin.js` dans le backend :

```javascript
// create-admin.js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ntqsbgbashglzulkwypf.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Depuis .env.local

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createFirstAdmin() {
  try {
    console.log('🔧 Création du premier administrateur...')

    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@dutyfree.com',
      password: 'Admin123456!', // ⚠️ CHANGEZ CE MOT DE PASSE
      email_confirm: true
    })

    if (authError) {
      console.error('❌ Erreur création auth:', authError.message)
      return
    }

    console.log('✅ Utilisateur auth créé:', authData.user.id)

    // 2. Récupérer le rôle admin
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('code', 'admin')
      .single()

    if (roleError || !adminRole) {
      console.error('❌ Rôle admin introuvable. Créez-le d\'abord.')
      // Rollback
      await supabase.auth.admin.deleteUser(authData.user.id)
      return
    }

    console.log('✅ Rôle admin trouvé:', adminRole.id)

    // 3. Créer le profil utilisateur
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'admin@dutyfree.com',
        first_name: 'Admin',
        last_name: 'System',
        role_id: adminRole.id,
        active: true,
        employee_id: 'ADMIN001'
      })
      .select()
      .single()

    if (profileError) {
      console.error('❌ Erreur création profil:', profileError.message)
      // Rollback
      await supabase.auth.admin.deleteUser(authData.user.id)
      return
    }

    console.log('✅ Profil admin créé:', userProfile)
    console.log('')
    console.log('🎉 ADMINISTRATEUR CRÉÉ AVEC SUCCÈS!')
    console.log('📧 Email: admin@dutyfree.com')
    console.log('🔑 Password: Admin123456! (⚠️ CHANGEZ-LE après connexion)')
    console.log('')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

createFirstAdmin()
```

### Étape 2 : Exécuter le script

```bash
cd C:\Users\ADMIN\Desktop\DEEP-TECHNOLOGIES\DJBC\dutyfree-backend-pro

# Installer @supabase/supabase-js si pas déjà fait
npm install @supabase/supabase-js

# Exécuter le script
node create-admin.js
```

### Étape 3 : Se connecter

```
Email: admin@dutyfree.com
Password: Admin123456! (ou celui que vous avez défini)
```

**⚠️ IMPORTANT :** Changez immédiatement le mot de passe après la première connexion !

---

## ✅ Vérification

Après avoir créé l'administrateur, vérifiez que tout fonctionne :

### 1. Vérifier dans Supabase

**Table `auth.users` :**
- Email: admin@dutyfree.com
- Confirmed: true
- UUID noté

**Table `users` :**
```sql
SELECT u.*, r.code as role_code, r.name as role_name
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'admin@dutyfree.com';
```

**Résultat attendu :**
```
id: <uuid>
email: admin@dutyfree.com
first_name: Admin
last_name: System
role_code: admin
role_name: Administrateur
active: true
```

### 2. Vérifier la Connexion

1. Ouvrir : `http://localhost:3002/login`
2. Se connecter avec admin@dutyfree.com
3. Vérifier que vous êtes redirigé vers `/dashboard`
4. Vérifier que le menu "Utilisateurs" est visible

### 3. Vérifier les Permissions

Essayez de :
- ✅ Créer un nouvel utilisateur (menu Utilisateurs)
- ✅ Voir tous les rapports
- ✅ Accéder aux paramètres
- ✅ Gérer les produits, stocks, ventes

---

## 🔐 Sécurité

### Après Création du Premier Admin

1. **Changer le mot de passe**
   - Se connecter
   - Aller dans Paramètres → Profil
   - Changer le mot de passe

2. **Créer d'autres administrateurs** (si nécessaire)
   - Menu Utilisateurs → Créer
   - Rôle : Administrateur
   - Email & mot de passe sécurisés

3. **Créer les utilisateurs opérationnels**
   - Caissiers
   - Gestionnaires de stock
   - Superviseurs

### Mot de Passe Recommandé

**Critères :**
- Minimum 12 caractères
- Majuscules + minuscules
- Chiffres
- Caractères spéciaux

**Exemple :**
- ❌ `Admin123`
- ✅ `Adm!nD3v2025@BF`

---

## 🔄 Après la Création

### Étape 1 : Créer d'Autres Utilisateurs

En tant qu'admin, vous pouvez maintenant :

1. **Créer des administrateurs supplémentaires**
   - Via `/api/auth/register` (nécessite être connecté en admin)
   - Rôle : admin

2. **Créer des utilisateurs opérationnels**
   - Via `/api/auth/register` (admin)
   - Ou via `/register` (inscription publique avec rôle non-admin)

### Étape 2 : Configurer les Rôles

Assurez-vous que les rôles suivants existent :

```sql
SELECT * FROM roles ORDER BY code;
```

**Rôles recommandés :**
- `admin` - Administrateur (accès complet)
- `supervisor` - Superviseur (gestion + rapports)
- `cashier` - Caissier (POS uniquement)
- `stock_manager` - Gestionnaire stock (stocks + produits)

---

## 📞 Support

### Problèmes Courants

**1. "Le rôle admin n'existe pas"**
- Créez le rôle admin dans la table `roles` (voir section Prérequis)

**2. "Erreur lors de la création du profil"**
- Vérifiez que l'UUID dans `users.id` correspond à `auth.users.id`
- Vérifiez que le `role_id` existe dans la table `roles`

**3. "Impossible de se connecter"**
- Vérifiez que `email_confirm: true` dans auth.users
- Vérifiez que `active: true` dans users
- Vérifiez le mot de passe

---

## 📊 Récapitulatif

| Méthode | Difficulté | Recommandé |
|---------|------------|------------|
| Dashboard Supabase | ⭐ Facile | ✅ Oui |
| SQL Editor | ⭐⭐ Moyen | 🟡 Si à l'aise |
| Script Node.js | ⭐⭐⭐ Avancé | 🟡 Pour automatiser |

**Méthode recommandée :** Dashboard Supabase (Méthode 1)

---

## 🎯 Résumé en 5 Étapes

1. ✅ Vérifier que le rôle `admin` existe dans la table `roles`
2. ✅ Créer l'utilisateur dans **Authentication** → **Users**
3. ✅ Copier l'UUID de l'utilisateur créé
4. ✅ Créer le profil dans la table **users** avec cet UUID
5. ✅ Se connecter avec admin@dutyfree.com

---

**Date de création :** 2025-11-25
**Version :** 1.0.0
**Statut :** ✅ Prêt à utiliser

🎉 **Votre premier administrateur est maintenant créé !**
