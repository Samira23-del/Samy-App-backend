# Documentation backend pour le frontend

Cette documentation decrit le contrat HTTP expose par le backend Express.

## Base API

- URL locale: `http://localhost:3000`
- Prefixe des routes d'authentification: `/auth`
- prefixe des routes admin: `/admin`
- Format des requetes: JSON
- Header requis pour les requetes avec body:

```http
Content-Type: application/json
```

## Authentification

Le backend utilise un token JWT retourne apres connexion.

Pour appeler une route protegee, envoyer le token dans le header:

```http
Authorization: Bearer <token>
```

Le token expire apres `30d`.

Payload JWT interne:

```json
{
  "userId": 1,
  "role": "user"
}
```

Roles possibles:

- `user`
- `admin`

## Modele utilisateur

Objet utilisateur retourne au frontend selon les routes:

```json
{
  "id": 1,
  "nom": "Samy",
  "email": "samy@example.com",
  "role": "user",
  "actif": true,
  "createdAt": "2026-07-01T10:00:00.000Z",
  "updatedAt": "2026-07-01T10:00:00.000Z"
}
```

Notes:

- `motDePasse` n'est jamais retourne dans la liste des utilisateurs.
- A l'inscription, le role est automatiquement `user`.
- A l'inscription, `actif` vaut automatiquement `true`.
- Un compte desactive ne peut plus se connecter.

## Endpoints
# Documentation API — Samy App

## URL de base
```
http://localhost:3000
```

---

## Routes publiques (pas de token requis)

### 1. S'inscrire
```
POST /auth/register
```
**Body :**
```json
{
  "nom": "string",
  "email": "string",
  "motDePasse": "string (min 6 caractères)"
}
```
**Réponse succès (201) :**
```json
{
  "message": "Compte créé avec succès",
  "user": {
    "id": "uuid",
    "nom": "string",
    "email": "string"
  }
}
```
**Erreurs possibles :**
```json
{ "message": "Tous les champs sont obligatoires" }
{ "message": "Cet email est déjà utilisé" }
```

---

### 2. Se connecter
```
POST /auth/login
```
**Body :**
```json
{
  "email": "string",
  "motDePasse": "string"
}
```
**Réponse succès (200) :**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "nom": "string",
    "email": "string",
    "role": "user | admin"
  }
}
```

---

## Routes privées (token requis)

> Ajouter dans les Headers :
> `Authorization: Bearer TON_TOKEN`

### 3. Changer mot de passe
```
PUT /auth/password
```
**Body :**
```json
{
  "ancienMotDePasse": "string",
  "nouveauMotDePasse": "string"
}
```
**Réponse succès (200) :**
```json
{ "message": "Mot de passe modifié avec succès" }
```

---

## Connexion admin

### Se connecter en tant qu'admin
```
POST /admin/login
```
Même vérification que `/auth/login` (email + mot de passe), avec un contrôle supplémentaire : refuse la connexion (403) si le compte n'a pas le rôle `admin`.

**Body :**
```json
{ "email": "string", "motDePasse": "string" }
```
**Réponse succès (200) :** identique à `/auth/login`.
**Erreur si compte non-admin (403) :**
```json
{ "message": "Accès refusé — réservé aux administrateurs" }
```

## Routes admin (token admin requis)

> Ajouter dans les Headers :
> `Authorization: Bearer TOKEN_ADMIN`

### 4. Lister les utilisateurs
```
GET /admin/users
```
**Réponse succès (200) :**
```json
[
  {
    "id": "uuid",
    "nom": "string",
    "email": "string",
    "role": "user | admin",
    "actif": true
  }
]
```

### 5. Désactiver un utilisateur
```
PUT /admin/users/:id/disable
```
**Paramètre URL :**
```
:id = l'UUID de l'utilisateur à désactiver
```
**Réponse succès (200) :**
```json
{ "message": "Nom a été désactivé" }
```

---

## Établissements et salles de classe

### 6. Rechercher un établissement
```
GET /etablissements?recherche=texte
```
Public, pas de token requis. La recherche compare le texte au nom, au pays, à la ville ET au quartier. Sans le paramètre `recherche`, retourne tous les établissements.

Chaque établissement renvoyé inclut directement ses classes **déjà validées** (`classes: []` si aucune) — pas besoin d'un second appel pour les afficher. Pour rechercher des classes indépendamment d'un établissement (par nom), voir la route 12.

**Réponse succès (200) :**
```json
[
  {
    "id": "uuid",
    "nom": "Lycée Victor Hugo",
    "pays": "Sénégal",
    "ville": "Dakar",
    "quartier": "Plateau",
    "classes": [
      { "id": "uuid", "classe": "Terminale", "serie": "D" },
      { "id": "uuid", "classe": "6ème", "serie": null }
    ]
  }
]
```

### 7. Demander la création d'une salle de classe
```
POST /classes/demander
```
Token requis (n'importe quel utilisateur connecté, pas besoin d'être admin).
**Body en `multipart/form-data`** (pas du JSON, car il y a un fichier) :
```
ecole: string
pays: string
ville: string
quartier: string
classe: string
serie: string (optionnel)
typePieceJustificative: "bulletin" | "carte_scolaire"
pieceJustificative: fichier (JPEG, PNG ou PDF, 5 Mo max)
```
`ecole` + `pays` + `ville` + `quartier` sont tous obligatoires : si l'établissement (identifié par nom + pays + ville) existe déjà, il est réutilisé ; sinon il est créé avec cette localisation.

**Réponse succès (201) :**
```json
{
  "message": "Demande envoyée, en attente de validation par un administrateur",
  "demande": {
    "id": "uuid",
    "classe": "Terminale",
    "serie": "D",
    "typePieceJustificative": "bulletin",
    "statut": "en_attente",
    "etablissement": { "nom": "Lycée Victor Hugo", "pays": "Sénégal", "ville": "Dakar", "quartier": "Plateau" }
  }
}
```
**Erreurs possibles (400) :**
```json
{ "message": "Le nom de l'école et la classe sont obligatoires" }
{ "message": "La localisation de l'établissement (pays, ville, quartier) est obligatoire" }
{ "message": "Le type de pièce justificative doit être \"bulletin\" ou \"carte_scolaire\"" }
```

### 8. Lister les demandes de classe en attente (admin)
```
GET /admin/classes/demandes
```
Token admin requis.

### 9. Valider une demande de classe (admin)
```
PUT /admin/classes/:id/valider
```

### 10. Refuser une demande de classe (admin)
```
PUT /admin/classes/:id/refuser
```
Les routes 9 et 10 renvoient `{ "message": "Cette demande a déjà été traitée" }` (400) si la demande n'est plus `en_attente`.

### 11. Télécharger la pièce justificative d'une demande (admin)
```
GET /admin/classes/:id/piece-justificative
```
Token admin requis. Déclenche le téléchargement du fichier (bulletin ou carte scolaire) fourni par l'utilisateur. Utile pour vérifier le document avant de valider/refuser (routes 9 et 10).

**Réponse succès (200) :** le fichier lui-même (`Content-Disposition: attachment`).
**Erreur si fichier introuvable (404) :**
```json
{ "message": "Fichier introuvable" }
```

### 12. Lister/rechercher les classes validées
```
GET /classes?etablissementId=uuid&recherche=texte
```
Public. Étape 2 du flux "rejoindre une classe" (étape 1 = route 6). Les deux paramètres sont optionnels et combinables :
- `etablissementId` seul → toutes les classes validées de cet établissement
- `recherche` seule → toutes les classes dont le nom contient ce texte, tous établissements confondus (utile si on ne se souvient plus de l'établissement exact)
- aucun des deux → toutes les classes validées

**Réponse succès (200) :**
```json
[{
  "id": "uuid",
  "classe": "Terminale",
  "serie": "D",
  "etablissementId": "uuid",
  "Etablissement": { "id": "uuid", "nom": "Lycée Victor Hugo", "ville": "Dakar", "pays": "Sénégal" }
}]
```

### 13. Rejoindre une classe déjà validée
```
POST /classes/:id/rejoindre
```
Token requis. Body en **JSON** (pas de fichier) :
```json
{
  "nom": "string",
  "prenom": "string",
  "telephone": "string (optionnel)",
  "dateNaissance": "YYYY-MM-DD (optionnel)",
  "email": "string (optionnel)",
  "bio": "string (optionnel, texte libre)",
  "nationalite": "string (optionnel)",
  "whatsapp": "string (optionnel)",
  "instagram": "string (optionnel)",
  "snapchat": "string (optionnel)"
}
```
Seuls `nom` et `prenom` sont obligatoires — tout le reste sert à être retrouvé par d'anciens camarades.

**Réponse succès (201) :**
```json
{
  "message": "Vous avez rejoint la classe \"Terminale\"",
  "membre": { "id": "uuid", "nom": "Diallo", "prenom": "Awa", "bio": "..." }
}
```
**Erreurs possibles :** classe non trouvée, classe pas encore validée, déjà membre.

### 14. Lister les membres d'une classe
```
GET /classes/:id/membres
```
Token requis (n'importe quel utilisateur connecté). Sert à retrouver d'anciens camarades.

**Réponse succès (200) :**
```json
[{
  "id": "uuid", "nom": "Diallo", "prenom": "Awa",
  "telephone": "...", "email": null, "bio": "...",
  "nationalite": "...", "whatsapp": "...", "instagram": "...", "snapchat": "...",
  "createdAt": "..."
}]
```

---

## Codes HTTP utilisés

| Code | Signification |
|------|--------------|
| 200  | OK |
| 201  | Créé |
| 400  | Mauvaise requête |
| 401  | Non autorisé (pas de token) |
| 403  | Interdit (pas admin) |
| 500  | Erreur serveur |
```

## Gestion generique des erreurs cote frontend

Toutes les erreurs sont retournees au format:

```json
{
  "message": "Description de l'erreur"
}
```

Exemple helper:

```js
async function apiFetch(path, options = {}) {
  const response = await fetch(`http://localhost:3000${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erreur API');
  }

  return data;
}
```

Exemple avec token automatique:

```js
async function apiFetchAuth(path, options = {}) {
  const token = localStorage.getItem('token');

  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
}
```

## Variables d'environnement backend

Le backend attend ces variables:

```env
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=
```

## Points d'attention pour le frontend

- Le backend n'a pas encore de middleware CORS. Si le frontend tourne sur un autre port, par exemple `http://localhost:5173`, le navigateur peut bloquer les requetes. Il faudra ajouter `cors` cote backend.
- Le backend n'expose pas encore de route `/me` pour recuperer l'utilisateur connecte depuis le token.
- Le backend ne permet pas encore de creer directement un admin via l'API d'inscription.
- Les messages dans le code source peuvent contenir des caracteres mal encodes, mais le contrat fonctionnel reste celui documente ici.
- Pour les routes admin, verifier `user.role === 'admin'` cote frontend uniquement pour l'affichage. La vraie securite est faite cote backend avec le token.
- Les noms de fichiers uploades (piece justificative) sont assainis cote serveur (caracteres non alphanumeriques remplaces par `_`) : le nom affiche au telechargement peut differer legerement du nom original envoye par l'utilisateur.
- L'unicite d'un etablissement se fait sur `nom + pays + ville` : deux ecoles homonymes dans des villes differentes sont considerees comme deux etablissements distincts.
