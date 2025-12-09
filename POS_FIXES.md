# Corrections apportées à la page POS

## Problèmes identifiés et corrigés

### 1. Bug NaN dans les prix

**Problème**: Lorsqu'un produit était ajouté au panier, le prix pouvait devenir `NaN` si les propriétés de prix (`selling_price_xof`, `selling_price_eur`, `selling_price_usd`) étaient `undefined` ou `null`.

**Solution**:
- Amélioration de la fonction `getProductPrice()` pour s'assurer qu'elle retourne toujours un nombre valide
- Ajout d'une vérification `isNaN()` avant de retourner le prix
- Protection contre les valeurs `undefined` ou `null` avec l'opérateur `|| 0`

```typescript
const getProductPrice = (product: Product) => {
  if (!product) return 0

  let price = 0
  switch (selectedCurrency) {
    case 'EUR':
      price = product.selling_price_eur || 0
      break
    case 'USD':
      price = product.selling_price_usd || 0
      break
    default:
      price = product.selling_price_xof || 0
      break
  }

  // S'assurer que le prix est un nombre valide
  return isNaN(price) ? 0 : Number(price)
}
```

### 2. Boutons +/- ne fonctionnaient pas correctement

**Problème**: Les boutons +/- pour modifier la quantité ne recalculaient pas correctement le total, surtout lors du changement de devise.

**Solution**:
- Amélioration de la fonction `updateCartQuantity()` pour inclure une vérification `isNaN()` sur le total
- Ajout de `e.stopPropagation()` pour éviter les conflits d'événements
- Calcul explicite du prix et du total avec protection contre NaN

```typescript
const updateCartQuantity = (productId: string, newQuantity: number) => {
  if (newQuantity <= 0) {
    removeFromCart(productId)
    return
  }

  setCart(prevCart =>
    prevCart.map(item => {
      if (item.id === productId) {
        const price = getProductPrice(item)
        const total = newQuantity * price
        return {
          ...item,
          quantity: newQuantity,
          total: isNaN(total) ? 0 : total
        }
      }
      return item
    })
  )
}
```

### 3. Boutons monter/descendre manquants

**Problème**: Il n'y avait aucun moyen de réorganiser les articles dans le panier (changer leur ordre).

**Solution**:
- Ajout de deux nouvelles fonctions `moveItemUp()` et `moveItemDown()`
- Ajout des icônes `ChevronUp` et `ChevronDown` de lucide-react
- Intégration des boutons dans l'interface du panier avec désactivation automatique aux extrémités

```typescript
// Déplacer un article vers le haut dans le panier
const moveItemUp = (index: number) => {
  if (index === 0) return // Déjà en haut

  setCart(prevCart => {
    const newCart = [...prevCart]
    const temp = newCart[index]
    newCart[index] = newCart[index - 1]
    newCart[index - 1] = temp
    return newCart
  })
}

// Déplacer un article vers le bas dans le panier
const moveItemDown = (index: number) => {
  if (index === cart.length - 1) return // Déjà en bas

  setCart(prevCart => {
    const newCart = [...prevCart]
    const temp = newCart[index]
    newCart[index] = newCart[index + 1]
    newCart[index + 1] = temp
    return newCart
  })
}
```

### 4. Recalcul automatique lors du changement de devise

**Problème**: Lorsque l'utilisateur changeait de devise, les totaux du panier n'étaient pas recalculés automatiquement.

**Solution**:
- Ajout d'un `useEffect` qui écoute les changements de `selectedCurrency`
- Recalcul de tous les totaux du panier lorsque la devise change
- Protection contre les boucles infinies en vérifiant `cart.length`

```typescript
useEffect(() => {
  if (cart.length === 0) return

  setCart(prevCart =>
    prevCart.map(item => {
      // Recalculer le prix selon la nouvelle devise
      let price = 0
      switch (selectedCurrency) {
        case 'EUR':
          price = item.selling_price_eur || 0
          break
        case 'USD':
          price = item.selling_price_usd || 0
          break
        default:
          price = item.selling_price_xof || 0
          break
      }

      const total = item.quantity * price
      return {
        ...item,
        total: isNaN(total) ? 0 : total
      }
    })
  )
}, [selectedCurrency, cart.length])
```

## Améliorations de l'interface

### Affichage du panier

L'affichage de chaque article dans le panier a été amélioré pour inclure:

1. **Boutons de réorganisation** (à gauche):
   - Bouton "haut" (ChevronUp) - désactivé pour le premier élément
   - Bouton "bas" (ChevronDown) - désactivé pour le dernier élément

2. **Informations du produit** (au centre):
   - Nom du produit
   - Prix unitaire × quantité
   - Total de la ligne (en gras avec couleur primaire)

3. **Contrôles de quantité** (à droite):
   - Bouton "-" pour diminuer
   - Affichage de la quantité
   - Bouton "+" pour augmenter

4. **Bouton de suppression** (à l'extrême droite):
   - Icône de corbeille pour retirer l'article du panier

### Structure visuelle

```
┌─────────────────────────────────────────────────────────┐
│ [↑] Nom du produit                  [-] 2 [+]     [🗑] │
│ [↓] Prix × quantité                                     │
│     Total: XXX XXX                                      │
└─────────────────────────────────────────────────────────┘
```

## Tests recommandés

Pour vérifier que toutes les corrections fonctionnent correctement:

1. **Test des prix**:
   - Ajouter un produit au panier
   - Vérifier que le prix s'affiche correctement (pas de NaN)
   - Changer de devise et vérifier que le prix est recalculé

2. **Test des boutons +/-**:
   - Ajouter un produit au panier
   - Cliquer sur "+" plusieurs fois et vérifier que la quantité augmente
   - Cliquer sur "-" et vérifier que la quantité diminue
   - Vérifier que le total est correctement calculé
   - Réduire la quantité à 0 et vérifier que l'article est retiré du panier

3. **Test des boutons monter/descendre**:
   - Ajouter plusieurs produits au panier
   - Utiliser les boutons ↑ et ↓ pour réorganiser les articles
   - Vérifier que le premier article ne peut pas monter
   - Vérifier que le dernier article ne peut pas descendre

4. **Test du changement de devise**:
   - Ajouter des produits au panier
   - Changer de devise (XOF → EUR → USD)
   - Vérifier que tous les prix sont recalculés automatiquement
   - Vérifier que les totaux sont corrects

5. **Test des cas limites**:
   - Ajouter un produit sans prix défini (vérifier que le prix est 0 et non NaN)
   - Vider le panier et en refaire un nouveau
   - Tester avec de grandes quantités

## Fichiers modifiés

- `components/pos/pos-interface.tsx` - Fichier principal du composant POS

## Notes techniques

- Tous les calculs de prix incluent maintenant une protection contre NaN
- Les événements de clic incluent `stopPropagation()` pour éviter les conflits
- L'ordre du panier peut maintenant être modifié par l'utilisateur
- Le changement de devise met automatiquement à jour tous les prix du panier
- Les boutons de réorganisation sont désactivés intelligemment selon la position
