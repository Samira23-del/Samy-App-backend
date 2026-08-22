// auth/Controller/adminController.js
// ════════════════════════════════════════════
// RÔLE : Routes réservées aux administrateurs
//        Préfixe /admin
// ════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const path = require('path');
const authService = require('../services/authService');
const classeService = require('../../classe/services/classeService');

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
    const SECRET = process.env.JWT_SECRET;

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

// ════════════════════════════════════════════
// ROUTE 0 — Se connecter en tant qu'admin
// POST /admin/login
//
// Placée AVANT router.use(verifierAdmin) :
// il faut pouvoir se connecter SANS déjà
// avoir de token — sinon impossible d'en
// obtenir un premier
//
// On réutilise le login() classique (même
// vérification email/mot de passe), et on
// ajoute juste un contrôle du rôle
// ════════════════════════════════════════════

router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const resultat = await authService.login(email, motDePasse);

    if (resultat.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé — réservé aux administrateurs' });
    }

    res.status(200).json(resultat);
  } catch (erreur) {
    res.status(401).json({ message: erreur.message });
  }
});


// On applique verifierAdmin à TOUTES les routes
// définies APRÈS cette ligne
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


// ════════════════════════════════════════════
// ROUTE 3 — Lister les demandes de classe en attente
// GET /admin/classes/demandes
// ════════════════════════════════════════════

router.get('/classes/demandes', async (req, res) => {
  try {
    const demandes = await classeService.listerDemandesEnAttente(req);
    res.status(200).json(demandes);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});


// ════════════════════════════════════════════
// ROUTE 4 — Valider une demande de classe
// PUT /admin/classes/:id/valider
// ════════════════════════════════════════════

router.put('/classes/:id/valider', async (req, res) => {
  try {
    const resultat = await classeService.validerClasse(req, req.params.id);
    res.status(200).json(resultat);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});


// ════════════════════════════════════════════
// ROUTE 5 — Refuser une demande de classe
// PUT /admin/classes/:id/refuser
// ════════════════════════════════════════════

router.put('/classes/:id/refuser', async (req, res) => {
  try {
    const resultat = await classeService.refuserClasse(req, req.params.id);
    res.status(200).json(resultat);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});


// ════════════════════════════════════════════
// ROUTE 6 — Télécharger la pièce justificative
// GET /admin/classes/:id/piece-justificative
//
// Permet à l'admin de consulter le document
// (bulletin/carte scolaire) avant de décider
// ════════════════════════════════════════════

router.get('/classes/:id/piece-justificative', async (req, res) => {
  try {
    const cheminRelatif = await classeService.cheminPieceJustificative(req, req.params.id);

    const racineUploads = path.join(__dirname, '../../uploads');
    const cheminAbsolu = path.join(__dirname, '../../', cheminRelatif);

    if (!cheminAbsolu.startsWith(racineUploads)) {
      // Garde-fou : le chemin reconstruit doit rester
      // dans le dossier uploads, sinon on refuse
      return res.status(400).json({ message: 'Chemin de fichier invalide' });
    }

    res.download(cheminAbsolu, (erreurEnvoi) => {
      if (erreurEnvoi && !res.headersSent) {
        res.status(404).json({ message: 'Fichier introuvable' });
      }
    });
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});

module.exports = router;
