// auth/Controller/adminController.js
// ════════════════════════════════════════════
// RÔLE : Routes réservées aux administrateurs
//        Préfixe /admin
// ════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// ════════════════════════════════════════════
// MIDDLEWARE ADMIN
// Vérifie token + role admin
// pour TOUTES les routes de ce fichier
// ════════════════════════════════════════════

const verifierAdmin = (req, res, next) => {
// next = fonction qui dit "passe à la route suivante"
// C'est un vrai middleware cette fois
// Il s'applique à toutes les routes en dessous

  try {
    const jwt = require('jsonwebtoken');
    const SECRET = 'monsecret123';

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé — admin seulement' });
    }

    req.user = decoded;
    // On attache les infos de l'admin à la requête
    // Disponible dans toutes les routes suivantes
    // via req.user

    next();
    // next() = "ok la vérification est passée
    // continue vers la route demandée"

  } catch {
    return res.status(401).json({ message: 'Token invalide' });
  }
};

// On applique verifierAdmin à TOUTES les routes
// de ce fichier automatiquement
router.use(verifierAdmin);
// ↑ Toutes les routes définies APRÈS cette ligne
//   passeront par verifierAdmin avant de s'exécuter


// ════════════════════════════════════════════
// ROUTE 1 — Lister tous les utilisateurs
// GET /admin/users
// ════════════════════════════════════════════

router.get('/users', async (req, res) => {
  try {
    const users = await authService.listerUtilisateurs(req);
    res.status(200).json(users);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});


// ════════════════════════════════════════════
// ROUTE 2 — Désactiver un utilisateur
// PUT /admin/users/:id/disable
// ════════════════════════════════════════════

router.put('/users/:id/disable', async (req, res) => {
  try {
    const resultat = await authService.desactiverUtilisateur(
      req,
      req.params.id
    );
    res.status(200).json(resultat);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});

module.exports = router;
