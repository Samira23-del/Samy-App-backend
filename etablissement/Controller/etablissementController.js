// etablissement/Controller/etablissementController.js
// ═══════════════════════════════════════════════
// RÔLE : Route pour rechercher un établissement
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const EtablissementModel = require('../Models/etablissementModel');

// ═══════════════════════════════════════════════
// ROUTE — Rechercher un établissement
// GET /etablissements?recherche=texte
//
// Sans le paramètre "recherche", retourne tous
// les établissements existants
// ═══════════════════════════════════════════════

router.get('/', async (req, res) => {
  try {
    const { recherche } = req.query;
    // req.query = les paramètres après le "?" dans l'URL

    const etablissements = await EtablissementModel.rechercher(recherche);
    res.status(200).json(etablissements);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});

module.exports = router;
