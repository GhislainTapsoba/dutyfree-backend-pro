# Guide de Test du Mode Hors Ligne

## Préparation

1. **Ouvrir une session de caisse** (obligatoire)
2. **Aller sur le POS** : `/dashboard/pos`

## Test 1 : Simulation Hors Ligne avec DevTools

### Étapes :
1. `F12` → Onglet **Network**
2. Menu déroulant → **Offline**
3. Observer l'indicateur rouge "Hors ligne" en haut à droite
4. Scanner un produit (ex: `3760001234567`)
5. Ajouter au panier
6. Cliquer sur "Paiement"
7. Remplir les infos passager
8. Valider le paiement
9. **Résultat attendu** : Message "Vente enregistrée en mode hors ligne"

### Vérification :
```javascript
// Dans la console DevTools
localStorage.getItem('offline_queue')
// Doit afficher un tableau JSON avec la vente
```

## Test 2 : Synchronisation Automatique

### Étapes :
1. Avec des ventes en queue (Test 1)
2. Remettre **No throttling** dans DevTools
3. Attendre 5 secondes
4. **Résultat attendu** : 
   - Indicateur passe au vert "En ligne"
   - Message "X ventes synchronisées"
   - Queue vidée

### Vérification :
```bash
# Vérifier que les ventes sont dans la base
curl http://localhost:3000/api/sales
```

## Test 3 : Arrêt du Backend

### Étapes :
```bash
# Terminal backend
Ctrl+C  # Arrêter le serveur
```

1. Sur le frontend, l'indicateur devient rouge
2. Faire 2-3 ventes
3. Vérifier la queue :
```javascript
JSON.parse(localStorage.getItem('offline_queue')).length
// Doit afficher 2 ou 3
```

4. Redémarrer le backend :
```bash
npm run dev
```

5. Attendre 5-10 secondes
6. Les ventes se synchronisent automatiquement

## Test 4 : Persistance après Rechargement

### Étapes :
1. Mode hors ligne activé
2. Faire une vente → en queue
3. **Recharger la page** (`F5`)
4. Vérifier que la queue existe toujours :
```javascript
localStorage.getItem('offline_queue')
```
5. Revenir en ligne
6. La vente se synchronise quand même

## Test 5 : Gestion des Erreurs

### Étapes :
1. Mode hors ligne
2. Faire 5 ventes rapidement
3. Revenir en ligne
4. **Résultat attendu** : Toutes les ventes se synchronisent
5. Si une échoue, elle reste en queue

### Vérification des erreurs :
```javascript
// Console DevTools
// Observer les logs de synchronisation
```

## Indicateurs Visuels

### En ligne :
- Badge vert : "En ligne"
- Icône : ✓

### Hors ligne :
- Badge rouge : "Hors ligne"
- Icône : ⚠
- Position : Header, en haut à droite

## Commandes Utiles

### Vider la queue manuellement :
```javascript
localStorage.removeItem('offline_queue')
```

### Voir le device ID :
```javascript
localStorage.getItem('device_id')
```

### Forcer une synchronisation :
```javascript
// Dans la console
window.location.reload()
```

## Points de Contrôle

✅ **Vente enregistrée en queue** quand hors ligne  
✅ **Synchronisation automatique** au retour en ligne  
✅ **Persistance** après rechargement de page  
✅ **Indicateur visuel** change de couleur  
✅ **Device ID** unique généré  
✅ **Horodatage** correct des ventes  

## Dépannage

### La synchronisation ne se fait pas :
1. Vérifier que le backend est démarré
2. Vérifier la console pour les erreurs
3. Vérifier que `cash_session_id` existe dans localStorage

### L'indicateur ne change pas :
1. Recharger la page
2. Vérifier que le composant `OfflineIndicator` est dans le header

### Les ventes sont perdues :
- Impossible ! Elles sont dans localStorage
- Vérifier : `localStorage.getItem('offline_queue')`
