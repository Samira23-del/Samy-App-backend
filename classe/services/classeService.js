// classe/services/classeService.js
// ═══════════════════════════════════════════════
// RÔLE : Toute la logique métier pour les
//        demandes de création de salle de classe
// ═══════════════════════════════════════════════

const { verifyToken } = require('../../auth/services/authService');
const EtablissementModel = require('../../etablissement/Models/etablissementModel');
const SalleClasseModel = require('../Models/salleClasseModel');
const MembreClasseModel = require('../Models/membreClasseModel');

// ═══════════════════════════════════════════════
// demanderClasse
// ═══════════════════════════════════════════════
//
// N'importe quel utilisateur connecté (pas besoin
// d'être admin) peut faire cette demande

const TYPES_PIECE_AUTORISES = ['bulletin', 'carte_scolaire'];

const demanderClasse = async (req, { ecole, pays, ville, quartier, classe, serie, typePieceJustificative }, fichier) => {

  const decoded = verifyToken(req);
  // ↑ juste besoin d'être connecté, pas besoin d'être admin

  if (!ecole || !classe) {
    throw new Error('Le nom de l\'école et la classe sont obligatoires');
  }

  if (!pays || !ville || !quartier) {
    throw new Error('La localisation de l\'établissement (pays, ville, quartier) est obligatoire');
  }

  if (!TYPES_PIECE_AUTORISES.includes(typePieceJustificative)) {
    throw new Error('Le type de pièce justificative doit être "bulletin" ou "carte_scolaire"');
  }

  if (!fichier) {
    throw new Error('Une pièce justificative (bulletin ou carte scolaire) est obligatoire');
  }

  const etablissement = await EtablissementModel.trouverOuCreer({ nom: ecole, pays, ville, quartier });
  // ↑ trouve l'école si elle existe déjà dans cette ville, sinon la crée

  const demande = await SalleClasseModel.creerDemande({
    classe,
    serie,
    typePieceJustificative,
    pieceJustificative: `uploads/pieces-justificatives/${fichier.filename}`,
    // ↑ chemin relatif seulement — fichier.path serait le
    //   chemin absolu de la machine (ex: C:\Users\...),
    //   à ne jamais exposer dans les réponses API
    etablissementId: etablissement.id,
    demandeParUserId: decoded.userId
  });

  return {
    message: 'Demande envoyée, en attente de validation par un administrateur',
    demande: {
      id: demande.id,
      classe: demande.classe,
      serie: demande.serie,
      typePieceJustificative: demande.typePieceJustificative,
      statut: demande.statut,
      etablissement: {
        nom: etablissement.nom,
        pays: etablissement.pays,
        ville: etablissement.ville,
        quartier: etablissement.quartier
      }
    }
  };
};

// ═══════════════════════════════════════════════
// listerDemandesEnAttente (admin)
// ═══════════════════════════════════════════════

const listerDemandesEnAttente = async (req) => {

  const decoded = verifyToken(req);
  if (decoded.role !== 'admin') {
    throw new Error('Accès refusé — admin seulement');
  }

  return await SalleClasseModel.demandesEnAttente();
};

// ═══════════════════════════════════════════════
// validerClasse (admin)
// ═══════════════════════════════════════════════

const validerClasse = async (req, salleId) => {

  const decoded = verifyToken(req);
  if (decoded.role !== 'admin') {
    throw new Error('Accès refusé — admin seulement');
  }

  const salle = await SalleClasseModel.trouverParId(salleId);
  if (!salle) throw new Error('Demande non trouvée');

  if (salle.statut !== 'en_attente') {
    throw new Error('Cette demande a déjà été traitée');
  }

  salle.statut = 'approuve';
  await salle.save();

  return { message: `La classe "${salle.classe}" a été approuvée` };
};

// ═══════════════════════════════════════════════
// refuserClasse (admin)
// ═══════════════════════════════════════════════

const refuserClasse = async (req, salleId) => {

  const decoded = verifyToken(req);
  if (decoded.role !== 'admin') {
    throw new Error('Accès refusé — admin seulement');
  }

  const salle = await SalleClasseModel.trouverParId(salleId);
  if (!salle) throw new Error('Demande non trouvée');

  if (salle.statut !== 'en_attente') {
    throw new Error('Cette demande a déjà été traitée');
  }

  salle.statut = 'refuse';
  // ↑ on garde la ligne (pas de suppression) pour
  //   conserver un historique des refus
  await salle.save();

  return { message: `La classe "${salle.classe}" a été refusée` };
};

// ═══════════════════════════════════════════════
// classesDisponibles
// ═══════════════════════════════════════════════
//
// Étape 2 du flux "rejoindre une classe" :
// une fois l'établissement choisi (via
// GET /etablissements?recherche=...), on liste
// ses classes déjà validées.
// On peut aussi filtrer par nom de classe
// (ex: "term" retrouve "Terminale") — utile si
// l'utilisateur ne se souvient plus exactement
// dans quel établissement chercher, ou veut
// juste affiner une longue liste
// Route publique, pas besoin d'être connecté
// (comme la recherche d'établissement)

const classesDisponibles = async ({ etablissementId, recherche }) => {
  return await SalleClasseModel.rechercherClassesValidees({ etablissementId, recherche });
};

// ═══════════════════════════════════════════════
// rejoindreClasse
// ═══════════════════════════════════════════════
//
// Étape 3 : l'utilisateur rejoint une classe
// validée et renseigne son profil

const rejoindreClasse = async (req, salleClasseId, {
  nom, prenom, telephone, dateNaissance, email, bio,
  nationalite, whatsapp, instagram, snapchat
}) => {

  const decoded = verifyToken(req);

  if (!nom || !prenom) {
    throw new Error('Le nom et le prénom sont obligatoires');
  }

  const salle = await SalleClasseModel.trouverParId(salleClasseId);
  if (!salle) throw new Error('Classe non trouvée');

  if (salle.statut !== 'approuve') {
    throw new Error('Cette classe n\'est pas encore validée');
  }

  const dejaMembre = await MembreClasseModel.dejaMembre(salleClasseId, decoded.userId);
  if (dejaMembre) {
    throw new Error('Vous avez déjà rejoint cette classe');
  }

  const membre = await MembreClasseModel.creerMembre({
    nom,
    prenom,
    telephone,
    dateNaissance,
    email,
    bio,
    nationalite,
    whatsapp,
    instagram,
    snapchat,
    salleClasseId,
    userId: decoded.userId
  });

  return {
    message: `Vous avez rejoint la classe "${salle.classe}"`,
    membre: {
      id: membre.id,
      nom: membre.nom,
      prenom: membre.prenom,
      bio: membre.bio
    }
  };
};

// ═══════════════════════════════════════════════
// listerMembres
// ═══════════════════════════════════════════════
//
// Pour retrouver d'anciens camarades d'une classe
// Il faut être connecté (pas public, contrairement
// à la recherche d'établissement/classes) — ce sont
// des infos personnelles des autres membres

const listerMembres = async (req, salleClasseId) => {

  verifyToken(req);
  // ↑ juste être connecté suffit, pas besoin d'être
  //   soi-même membre de cette classe précise

  const salle = await SalleClasseModel.trouverParId(salleClasseId);
  if (!salle) throw new Error('Classe non trouvée');

  return await MembreClasseModel.membresDeLaClasse(salleClasseId);
};

// ═══════════════════════════════════════════════
// cheminPieceJustificative (admin)
// ═══════════════════════════════════════════════
//
// Pour que l'admin puisse consulter le document
// fourni avant de valider/refuser une demande

const cheminPieceJustificative = async (req, salleId) => {

  const decoded = verifyToken(req);
  if (decoded.role !== 'admin') {
    throw new Error('Accès refusé — admin seulement');
  }

  const salle = await SalleClasseModel.trouverParId(salleId);
  if (!salle) throw new Error('Demande non trouvée');

  return salle.pieceJustificative;
  // ↑ chemin relatif (ex: "uploads/pieces-justificatives/xxx.pdf")
  //   c'est le contrôleur qui se charge de le transformer
  //   en chemin absolu et de servir le fichier
};

module.exports = {
  demanderClasse,
  listerDemandesEnAttente,
  validerClasse,
  refuserClasse,
  classesDisponibles,
  rejoindreClasse,
  listerMembres,
  cheminPieceJustificative
};
