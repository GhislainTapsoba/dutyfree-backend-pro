# Workflow des Paiements - Duty Free

## Principe Simple

Les paiements se font **physiquement** (espèces, TPE externe, téléphone client).  
L'application sert uniquement à **enregistrer** la transaction.

---

## 1. Paiement en Espèces 💵

**Étapes:**
1. Client donne l'argent liquide
2. Caissier saisit le montant reçu dans l'application
3. Application calcule automatiquement la monnaie à rendre
4. Caissier clique "Confirmer le paiement"
5. ✅ Vente enregistrée avec méthode "Espèces"
6. 🖨️ Ticket imprimé

---

## 2. Paiement par Carte Bancaire 💳

**Matériel nécessaire:** TPE (Terminal de Paiement Électronique) physique

**Étapes:**
1. Client présente sa carte sur le **TPE physique** (appareil externe)
2. Client compose son code PIN sur le TPE
3. Caissier attend la confirmation sur l'écran du TPE
4. ✅ Une fois "APPROUVÉ" affiché sur le TPE
5. Caissier clique "Paiement reçu - Valider" dans l'application
6. Vente enregistrée avec méthode "Carte Bancaire"
7. 🖨️ Ticket imprimé

**Important:** Ne cliquer sur "Valider" qu'après avoir vu "APPROUVÉ" sur le TPE

---

## 3. Paiement Mobile Money 📱

**Fournisseurs:** Orange Money, Moov Money

**Étapes:**
1. Client compose le code sur **son téléphone**:
   - Orange Money: `#144#` puis suivre les instructions
   - Moov Money: `#155#` puis suivre les instructions
2. Client entre le montant et valide
3. Caissier attend le **SMS de confirmation** sur le téléphone du client
4. ✅ Une fois le SMS reçu confirmant le paiement
5. Caissier clique "Paiement reçu - Valider" dans l'application
6. Vente enregistrée avec méthode "Mobile Money"
7. 🖨️ Ticket imprimé

**Important:** Ne cliquer sur "Valider" qu'après avoir vu le SMS de confirmation

---

## Résumé

| Méthode | Appareil | Validation | Enregistrement |
|---------|----------|------------|----------------|
| Espèces | Aucun | Montant reçu | Automatique |
| Carte | TPE externe | "APPROUVÉ" sur TPE | Manuel après confirmation |
| Mobile | Téléphone client | SMS de confirmation | Manuel après confirmation |

---

## Rapports

Tous les paiements sont enregistrés avec leur méthode:
- Rapport des ventes par méthode de paiement
- Suivi des encaissements par caisse
- Réconciliation en fin de journée

---

## Sécurité

⚠️ **Règle d'or:** Ne jamais valider un paiement dans l'application avant d'avoir reçu la confirmation physique (TPE ou SMS).

Si erreur:
- Espèces: Annuler et refaire la transaction
- Carte/Mobile: Contacter le support technique du fournisseur
