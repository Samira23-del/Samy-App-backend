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
