// classe/Controller/classeController.js
// ═══════════════════════════════════════════════
// RÔLE : Routes HTTP pour les demandes de
//        création de salle de classe
//        (côté utilisateur — pas admin)
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const classeService = require('../services/classeService');

// ═══════════════════════════════════════════════
// CONFIGURATION MULTER
// multer = middleware qui sait lire les requêtes
// "multipart/form-data" (nécessaire pour envoyer
// un fichier, contrairement à du JSON classique)
// ═══════════════════════════════════════════════

const stockage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/pieces-justificatives'));
  },
  filename: (req, file, cb) => {
    // path.basename() retire tout chemin de dossier
    // (ex: "../../evil.pdf" → "evil.pdf") et le
    // remplacement des caractères non alphanumériques
    // empêche toute tentative de traversée de
    // répertoire ou de nom de fichier piégé
    const nomOriginalSecurise = path.basename(file.originalname)
      .replace(/[^a-zA-Z0-9.\-_]/g, '_');
    // On préfixe par un timestamp pour éviter que
    // deux fichiers du même nom s'écrasent
    const nomUnique = `${Date.now()}-${nomOriginalSecurise}`;
    cb(null, nomUnique);
  }
});

const filtreFichier = (req, file, cb) => {
  const typesAutorises = ['image/jpeg', 'image/png', 'application/pdf'];
  if (typesAutorises.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non autorisé (JPEG, PNG ou PDF uniquement)'));
  }
};

const upload = multer({
  storage: stockage,
  fileFilter: filtreFichier,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 Mo max
});


// ═══════════════════════════════════════════════
// ROUTE — Demander la création d'une salle de classe
// POST /classes/demander
//
// Body attendu en multipart/form-data :
// - ecole (texte)
// - pays (texte)
// - ville (texte)
// - quartier (texte)
// - classe (texte)
// - serie (texte, optionnel)
// - typePieceJustificative ("bulletin" ou "carte_scolaire")
// - pieceJustificative (fichier)
// ═══════════════════════════════════════════════

router.post('/demander', upload.single('pieceJustificative'), async (req, res) => {
  try {
    const { ecole, pays, ville, quartier, classe, serie, typePieceJustificative } = req.body;
    // ↑ avec multer, les champs texte arrivent quand
    //   même dans req.body, comme avec express.json()

    const resultat = await classeService.demanderClasse(
      req,
      { ecole, pays, ville, quartier, classe, serie, typePieceJustificative },
      req.file
      // ↑ req.file = le fichier uploadé (rempli par multer)
    );

    res.status(201).json(resultat);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});


// ═══════════════════════════════════════════════
// ROUTE — Lister/rechercher les classes validées
// GET /classes?etablissementId=xxx&recherche=texte
//
// Les deux paramètres sont optionnels et combinables :
// - etablissementId seul → toutes les classes validées de cet établissement
// - recherche seule → toutes les classes dont le nom correspond, tous établissements confondus
// - aucun des deux → toutes les classes validées
//
// Publique — étape 2 du flux "rejoindre une classe"
// (étape 1 = GET /etablissements?recherche=...)
// ═══════════════════════════════════════════════

router.get('/', async (req, res) => {
  try {
    const { etablissementId, recherche } = req.query;

    const classes = await classeService.classesDisponibles({ etablissementId, recherche });
    res.status(200).json(classes);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});


// ═══════════════════════════════════════════════
// ROUTE — Rejoindre une classe déjà validée
// POST /classes/:id/rejoindre
//
// Token requis. Body en JSON (pas de fichier ici) :
// - nom (obligatoire)
// - prenom (obligatoire)
// - telephone (optionnel)
// - dateNaissance (optionnel, format YYYY-MM-DD)
// - email (optionnel)
// - bio (optionnel)
// - nationalite (optionnel)
// - whatsapp (optionnel)
// - instagram (optionnel)
// - snapchat (optionnel)
// ═══════════════════════════════════════════════

router.post('/:id/rejoindre', async (req, res) => {
  try {
    const {
      nom, prenom, telephone, dateNaissance, email, bio,
      nationalite, whatsapp, instagram, snapchat
    } = req.body;

    const resultat = await classeService.rejoindreClasse(
      req,
      req.params.id,
      { nom, prenom, telephone, dateNaissance, email, bio, nationalite, whatsapp, instagram, snapchat }
    );

    res.status(201).json(resultat);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});


// ═══════════════════════════════════════════════
// ROUTE — Lister les membres d'une classe
// GET /classes/:id/membres
//
// Token requis (retrouver d'anciens camarades)
// ═══════════════════════════════════════════════

router.get('/:id/membres', async (req, res) => {
  try {
    const membres = await classeService.listerMembres(req, req.params.id);
    res.status(200).json(membres);
  } catch (erreur) {
    res.status(400).json({ message: erreur.message });
  }
});

module.exports = router;
