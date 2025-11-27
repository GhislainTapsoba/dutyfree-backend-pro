# Configuration du système de notifications

Ce document explique comment configurer et utiliser le système de notifications automatiques.

## Vue d'ensemble

Le système de notifications comprend :

1. **API de notifications** - Gestion CRUD des notifications
2. **Préférences utilisateur** - Configuration personnalisée par utilisateur
3. **Déclencheurs automatiques** - Vérifications périodiques pour alertes stock et péremption
4. **Centre de notifications** - Interface utilisateur dans le header
5. **Page de notifications** - Vue complète de toutes les notifications

## Structure de la base de données

### Table `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'stock_alert', 'expiry_warning', 'order_update', 'promotion', 'system', 'info'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  related_entity_type VARCHAR(50), -- 'product', 'lot', 'order', etc.
  related_entity_id UUID,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### Table `notification_preferences`

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  stock_alerts BOOLEAN DEFAULT true,
  expiry_alerts BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true,
  promotion_alerts BOOLEAN DEFAULT true,
  system_alerts BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 10,
  expiry_warning_days INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
```

## Endpoints API

### Notifications CRUD

- `GET /api/notifications` - Liste des notifications
  - Paramètres: `user_id`, `unread_only`, `type`, `limit`

- `POST /api/notifications` - Créer une notification
  - Body: `{ user_id, type, title, message, priority, related_entity_type, related_entity_id, action_url, metadata }`

- `PUT /api/notifications` - Marquer comme lu (bulk)
  - Body: `{ ids: string[], mark_as_read: boolean }`

- `DELETE /api/notifications` - Supprimer des notifications
  - Paramètres: `ids` ou `user_id + older_than_days`

- `GET /api/notifications/[id]` - Détails d'une notification
- `PUT /api/notifications/[id]` - Mettre à jour une notification
- `DELETE /api/notifications/[id]` - Supprimer une notification

### Préférences

- `GET /api/notifications/preferences` - Récupérer les préférences
  - Paramètres: `user_id`

- `POST /api/notifications/preferences` - Créer/Mettre à jour les préférences
  - Body: `{ user_id, email_notifications, push_notifications, stock_alerts, ... }`

### Statistiques

- `GET /api/notifications/stats` - Statistiques des notifications
  - Paramètres: `user_id`
  - Retourne: total, unread, read, by_type, by_priority

### Déclencheurs automatiques

- `POST /api/notifications/triggers/stock-check` - Vérification automatique du stock
  - Crée des notifications pour les produits en rupture ou stock faible

- `POST /api/notifications/triggers/expiry-check` - Vérification des dates de péremption
  - Crée des notifications pour les produits périmés ou bientôt périmés

## Configuration des tâches automatiques (Cron Jobs)

### Option 1: Cron Unix/Linux

Ajoutez ces lignes à votre crontab (`crontab -e`):

```bash
# Vérification du stock toutes les 6 heures
0 */6 * * * curl -X POST http://localhost:3001/api/notifications/triggers/stock-check

# Vérification des péremptions tous les jours à 6h du matin
0 6 * * * curl -X POST http://localhost:3001/api/notifications/triggers/expiry-check
```

### Option 2: Node-cron (recommandé pour développement)

Installez node-cron:
```bash
npm install node-cron
```

Créez un fichier `app/api/cron/route.ts`:

```typescript
import cron from 'node-cron';

// Vérification du stock toutes les 6 heures
cron.schedule('0 */6 * * *', async () => {
  await fetch('http://localhost:3001/api/notifications/triggers/stock-check', {
    method: 'POST',
  });
});

// Vérification des péremptions tous les jours à 6h
cron.schedule('0 6 * * *', async () => {
  await fetch('http://localhost:3001/api/notifications/triggers/expiry-check', {
    method: 'POST',
  });
});
```

### Option 3: Vercel Cron Jobs (production)

Ajoutez à votre `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/notifications/triggers/stock-check",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/notifications/triggers/expiry-check",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### Option 4: GitHub Actions (CI/CD)

Créez `.github/workflows/notifications.yml`:

```yaml
name: Notification Triggers

on:
  schedule:
    # Stock check every 6 hours
    - cron: '0 */6 * * *'
    # Expiry check daily at 6 AM
    - cron: '0 6 * * *'

jobs:
  stock-check:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger stock check
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/notifications/triggers/stock-check

  expiry-check:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger expiry check
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/notifications/triggers/expiry-check
```

## Utilisation dans le code

### Envoyer une notification manuelle

```typescript
import { sendNotification } from '@/lib/notifications/send-notification';

// Envoyer à un utilisateur
await sendNotification({
  user_id: 'user-uuid',
  type: 'order_update',
  title: 'Nouvelle commande',
  message: 'Commande #12345 a été reçue',
  priority: 'medium',
  related_entity_type: 'order',
  related_entity_id: 'order-uuid',
  action_url: '/dashboard/orders/12345',
  metadata: {
    order_number: '12345',
    amount: 150000,
  },
});
```

### Envoyer à plusieurs utilisateurs

```typescript
import { sendNotificationToMultipleUsers } from '@/lib/notifications/send-notification';

await sendNotificationToMultipleUsers(
  ['user1-uuid', 'user2-uuid', 'user3-uuid'],
  {
    type: 'system',
    title: 'Maintenance planifiée',
    message: 'Le système sera en maintenance de 2h à 4h',
    priority: 'high',
  }
);
```

### Envoyer selon les préférences

```typescript
import { sendNotificationByPreference } from '@/lib/notifications/send-notification';

// Envoyer uniquement aux utilisateurs qui ont activé les alertes stock
await sendNotificationByPreference('stock_alerts', {
  type: 'stock_alert',
  title: 'Stock critique',
  message: 'Plusieurs produits nécessitent un réapprovisionnement',
  priority: 'urgent',
});
```

## Types de notifications

| Type | Description | Priorité par défaut |
|------|-------------|-------------------|
| `stock_alert` | Alertes de stock faible ou rupture | `high` ou `urgent` |
| `expiry_warning` | Produits périmés ou bientôt périmés | `medium` à `urgent` |
| `order_update` | Mises à jour de commandes | `medium` |
| `promotion` | Nouvelles promotions ou offres | `low` |
| `system` | Alertes système importantes | `medium` à `high` |
| `info` | Informations générales | `low` |

## Priorités

- `urgent` - Badge rouge, nécessite une action immédiate
- `high` - Badge orange, important mais pas critique
- `medium` - Badge bleu, notification standard
- `low` - Badge gris, information

## Fonctionnalités de l'interface

### Centre de notifications (Header)
- Badge avec nombre de notifications non lues
- Liste déroulante des 50 dernières notifications
- Bouton "Marquer tout comme lu"
- Filtrage "Toutes" / "Non lues"
- Actions rapides: marquer comme lu, supprimer

### Page complète (/dashboard/notifications)
- Vue de toutes les notifications avec filtres
- Statistiques en temps réel
- Sélection multiple pour actions en masse
- Filtres par type et statut
- Recherche et tri

### Préférences (/dashboard/notifications/preferences)
- Activation/désactivation par canal (email, push)
- Activation/désactivation par type de notification
- Configuration des seuils (stock faible, délai péremption)
- Actions de nettoyage

## Tests

### Test manuel des déclencheurs

```bash
# Test de vérification du stock
curl -X POST http://localhost:3001/api/notifications/triggers/stock-check

# Test de vérification des péremptions
curl -X POST http://localhost:3001/api/notifications/triggers/expiry-check
```

### Test de création de notification

```bash
curl -X POST http://localhost:3001/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "type": "info",
    "title": "Test",
    "message": "Ceci est un test",
    "priority": "low"
  }'
```

## Optimisations futures

1. **Websockets/SSE** - Notifications en temps réel sans rafraîchissement
2. **Email** - Envoi d'emails pour notifications importantes
3. **SMS** - Alertes critiques par SMS
4. **Push mobile** - Notifications push pour application mobile
5. **Regroupement** - Grouper les notifications similaires
6. **Snooze** - Reporter les notifications
7. **Analytics** - Tableau de bord des notifications envoyées/lues

## Dépannage

### Les notifications ne s'affichent pas
- Vérifier que l'utilisateur a des préférences activées
- Vérifier les requêtes réseau dans la console
- Vérifier que le `user_id` est correct

### Les cron jobs ne s'exécutent pas
- Vérifier les logs du serveur
- Tester manuellement les endpoints de déclenchement
- Vérifier la configuration cron

### Trop de notifications
- Ajuster les seuils dans les préférences
- Vérifier la logique de déduplication (24h)
- Nettoyer les anciennes notifications

## Support

Pour toute question ou problème, consultez la documentation technique ou contactez l'équipe de développement.
