// auth/Controlleur/auth.controller.js
// ═══════════════════════════════════════════════
// RÔLE : Définit les routes HTTP
//        Reçoit les requêtes des clients
//        Appelle le service approprié
//        Renvoie la réponse
//
//        NE CONTIENT AUCUNE LOGIQUE
//        C'est juste un "chef d'orchestre"
//
// ÉQUIVALENT PHP :
// AuthController.php dans Laravel/Symfony
// ═══════════════════════════════════════════════


const express = require('express');

const router = express.Router();
// ↑ express.Router() crée un mini-routeur
//   C'est comme un sous-ensemble de routes
//   qu'on branchera sur app dans app.js
//
//   POURQUOI Router et pas app directement ?
//   Parce que ce fichier ne connaît pas "app"
//   app est dans app.js
//   Router permet de définir des routes
//   sans avoir accès à app
//   app.js branchera ce router sur /auth
//
// ÉQUIVALENT PHP :
// Comme un groupe de routes dans Laravel :
// Route::prefix('auth')->group(...)


const authService = require('../services/authService');
// ↑ On importe toutes les fonctions du service
//   .. = remonter d'un niveau
//   services/auth.service = notre fichier service


// ═══════════════════════════════════════════════
// ROUTE 1 — S'inscrire
// POST /auth/register
//
// POST = méthode HTTP pour ENVOYER des données
// On utilise POST quand on crée quelque chose
//
// ÉQUIVALENT PHP :
// Route::post('/register', [AuthController::class, 'register']);
// ═══════════════════════════════════════════════

router.post('/register', async (req, res) => {
// router.post() = écoute les requêtes POST
// '/register' = sur cette URL
//               (sera /auth/register grâce à app.js)
//
// async (req, res) => { }
// ↑ fonction fléchée asynchrone
//
// req = tout ce que le CLIENT a envoyé
//   req.body   = le JSON du corps de la requête
//   req.headers = les en-têtes
//   req.params = les paramètres d'URL (:id)
//
// res = l'objet pour répondre au client
//   res.status(200) = définit le code HTTP
//   res.json({...}) = envoie du JSON

  try {

    const { nom, email, motDePasse } = req.body;
    // Destructuration de req.body
    // req.body contient ce que le client a envoyé :
    // { "nom": "Samy", "email": "...", "motDePasse": "..." }
    //
    // const { nom, email, motDePasse } = req.body
    // équivaut à :
    // const nom = req.body.nom
    // const email = req.body.email
    // const motDePasse = req.body.motDePasse
    //
    // ÉQUIVALENT PHP :
    // $nom = $_POST['nom'];
    // $email = $_POST['email'];
    // ou avec Laravel : $request->nom

    const resultat = await authService.register(nom, email, motDePasse);
    // On appelle la fonction register du service
    // await = attend que la fonction finisse
    // resultat = ce que register() a retourné

    res.status(201).json(resultat);
    // res.status(201) = code HTTP 201 = "Created"
    // .json(resultat) = envoie en JSON
    //
    // Codes HTTP importants :
    // 200 = OK
    // 201 = Créé
    // 400 = Mauvaise requête
    // 401 = Non autorisé (pas connecté)
    // 403 = Interdit (connecté mais pas le droit)
    // 404 = Non trouvé
    // 500 = Erreur serveur
    //
    // ÉQUIVALENT PHP :
    // http_response_code(201);
    // echo json_encode($resultat);

  } catch (erreur) {
  // Si le service lance une erreur
  // throw new Error('...') → on arrive ici

    res.status(400).json({ message: erreur.message });
    // erreur.message = le texte de l'erreur
    // "Cet email est déjà utilisé" par exemple
  }
});


// ═══════════════════════════════════════════════
// ROUTE 2 — Se connecter
// POST /auth/login
// ═══════════════════════════════════════════════

router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const resultat = await authService.login(email, motDePasse);
    res.status(200).json(resultat);
  } catch (erreur) {
    res.status(401).json({ message: erreur.message });
  }
});


// ═══════════════════════════════════════════════
// ROUTE 3 — Changer mot de passe
// PUT /auth/password
//
// PUT = méthode HTTP pour MODIFIER quelque chose
// ═══════════════════════════════════════════════

router.put('/password', async (req, res) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;

    const resultat = await authService.changerMotDePasse(
      req,
      // ↑ On passe req ENTIER au service
      //   Pour que verifyToken puisse lire
      //   req.headers.authorization
      ancienMotDePasse,
      nouveauMotDePasse
    );
    res.status(200).json(resultat);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});


// Les routes de gestion des utilisateurs (lister,
// désactiver) sont réservées aux admins et vivent
// désormais uniquement dans adminController.js,
// sous le préfixe /admin.

module.exports = router;
// ↑ On exporte le router
//   app.js fera require() de ce fichier
//   et branchera ces routes sur /auth
//
// ÉQUIVALENT PHP :
// En Laravel les routes sont automatiquement
// découvertes — pas besoin d'exporter
// En PHP simple tu ferais require() du fichier