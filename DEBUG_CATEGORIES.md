# Guide de débogage - Bouton "Voir" des catégories

## Problème signalé
Le bouton "Voir" ne fonctionne pas sur la page des catégories.

## Corrections appliquées

### 1. Ajout de stopPropagation
Le clic sur le bouton pourrait être capturé par un élément parent. Ajout de `e.stopPropagation()` sur tous les boutons.

### 2. Ajout de logs de débogage
Des `console.log()` ont été ajoutés pour tracer l'exécution:
- Dans le bouton "Voir" : "Voir button clicked"
- Dans `handleView()` : Log de la catégorie reçue et de l'état du dialog

### 3. Amélioration du Dialog
- Ajout d'une classe `max-w-2xl` pour plus de largeur
- Meilleur formatage de la date
- Affichage d'un message si `viewingCategory` est null
- Ajout d'une bordure de séparation

## Comment déboguer

### Étape 1: Ouvrir la console du navigateur
1. Appuyez sur F12 ou Ctrl+Shift+I (Windows) / Cmd+Option+I (Mac)
2. Allez dans l'onglet "Console"

### Étape 2: Cliquer sur le bouton "Voir"
1. Cliquez sur le bouton "Voir" d'une catégorie
2. Vérifiez les messages dans la console:
   - Devrait afficher: "Voir button clicked"
   - Devrait afficher: "handleView called with: {objet catégorie}"
   - Devrait afficher: "Dialog should open now, isViewDialogOpen will be true"

### Étape 3: Vérifier l'état React
Si vous avez React DevTools installé:
1. Ouvrez l'onglet "Components" ou "⚛️ Components"
2. Trouvez le composant `CategoriesPage`
3. Regardez les états:
   - `isViewDialogOpen` devrait être `true` après le clic
   - `viewingCategory` devrait contenir l'objet de la catégorie

## Scénarios possibles et solutions

### Scénario 1: Aucun log dans la console
**Symptôme**: Rien ne s'affiche dans la console quand vous cliquez sur "Voir"

**Cause possible**:
- Le bouton n'est pas cliquable (bloqué par un élément au-dessus)
- Un autre gestionnaire d'événement empêche la propagation

**Solution**:
1. Vérifiez avec l'inspecteur si le bouton est bien celui cliqué
2. Vérifiez qu'il n'y a pas d'élément avec `z-index` élevé par-dessus
3. Essayez de cliquer sur le texte "Voir" plutôt que sur le bouton entier

### Scénario 2: Les logs s'affichent mais le dialog ne s'ouvre pas
**Symptôme**: Vous voyez les logs mais le dialog reste invisible

**Causes possibles**:
1. Le Dialog est caché derrière un autre élément
2. Le Dialog ne monte pas correctement dans le DOM
3. Le composant Dialog de shadcn/ui a un problème

**Solutions**:
1. Vérifiez dans l'inspecteur si un élément avec `role="dialog"` apparaît dans le DOM
2. Vérifiez les styles CSS avec l'inspecteur
3. Vérifiez qu'il n'y a pas d'erreur React dans la console

### Scénario 3: Le dialog s'ouvre mais est vide
**Symptôme**: Le dialog s'ouvre mais affiche "Aucune catégorie sélectionnée"

**Cause**: `viewingCategory` est `null` ou `undefined`

**Solution**:
1. Vérifiez dans les logs la valeur de la catégorie passée à `handleView()`
2. Vérifiez que l'objet catégorie a bien toutes les propriétés requises:
   - `id`
   - `name_fr`
   - `name_en`
   - `created_at`
   - `description` (optionnel)

### Scénario 4: Erreur JavaScript
**Symptôme**: Message d'erreur rouge dans la console

**Solutions selon l'erreur**:
- **"Cannot read property 'xxx' of undefined"**: La catégorie ou une de ses propriétés est undefined
- **"React Hook useEffect has a missing dependency"**: Warning normal, peut être ignoré
- **"Objects are not valid as a React child"**: Problème d'affichage d'un objet au lieu d'une string

## Tests à effectuer

### Test 1: Bouton visible et cliquable
```
✓ Le bouton "Voir" est visible
✓ Le bouton change de couleur au survol
✓ Le curseur devient un pointeur au survol
```

### Test 2: Clic sur le bouton
```
✓ Cliquer sur "Voir" affiche des logs dans la console
✓ Le dialog s'ouvre après le clic
✓ Le dialog affiche les bonnes informations
```

### Test 3: Contenu du dialog
```
✓ Le titre "Détails de la catégorie" est affiché
✓ Le nom français est affiché
✓ Le nom anglais est affiché
✓ La description est affichée (si présente)
✓ La date de création est affichée et formatée
✓ Les boutons "Fermer" et "Modifier" sont présents
```

### Test 4: Fermeture du dialog
```
✓ Cliquer sur "Fermer" ferme le dialog
✓ Cliquer sur "Modifier" ferme le dialog et ouvre le formulaire
✓ Cliquer à l'extérieur du dialog le ferme (comportement par défaut)
✓ Appuyer sur Échap ferme le dialog (comportement par défaut)
```

## Vérification du composant Dialog

Le Dialog utilise le composant de shadcn/ui. Vérifiez que:

1. Le fichier `components/ui/dialog.tsx` existe
2. Il exporte bien les composants suivants:
   - `Dialog`
   - `DialogContent`
   - `DialogHeader`
   - `DialogTitle`

3. Si ces composants n'existent pas, installez-les:
```bash
npx shadcn-ui@latest add dialog
```

## Vérification des dépendances

Assurez-vous que ces packages sont installés:
- `lucide-react` (pour l'icône Eye)
- `@radix-ui/react-dialog` (pour le Dialog)
- `sonner` (pour les toasts)

```bash
npm install lucide-react @radix-ui/react-dialog sonner
```

## Code du bouton "Voir" actuel

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={(e) => {
    e.stopPropagation()
    console.log('Voir button clicked')
    handleView(category)
  }}
>
  <Eye className="w-4 h-4 mr-1" />
  Voir
</Button>
```

## Fonction handleView actuelle

```typescript
const handleView = (category: Category) => {
  console.log('handleView called with:', category)
  setViewingCategory(category)
  setIsViewDialogOpen(true)
  console.log('Dialog should open now, isViewDialogOpen will be true')
}
```

## Interface Category

```typescript
interface Category {
  id: string
  name_fr: string
  name_en: string
  description?: string
  created_at: string
}
```

## Prochaines étapes si le problème persiste

1. **Partager les logs de la console**: Copiez tous les messages de la console
2. **Vérifier l'API**: Testez `/api/products/categories` pour voir si les données sont correctes
3. **Vérifier React DevTools**: Partagez l'état du composant
4. **Capturer une vidéo**: Enregistrez ce qui se passe quand vous cliquez
5. **Tester avec une autre catégorie**: Le problème affecte-t-il toutes les catégories?

## Commande pour tester l'API directement

Ouvrez la console et exécutez:

```javascript
fetch('/api/products/categories')
  .then(r => r.json())
  .then(d => console.log('Categories from API:', d))
```

Cela devrait afficher toutes les catégories avec leur structure complète.
