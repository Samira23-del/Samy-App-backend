// classe/Models/salleClasseModel.js
// ═══════════════════════════════════════════════
// RÔLE : Définir la structure de la table
//        "salles_classe"
//        C'est à la fois :
//        - la DEMANDE de création (statut en_attente)
//        - la salle validée une fois approuvée
// ═══════════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');
const { DataTypes } = require('sequelize');
const sequelize = require('../../auth/config/database');
const { Etablissement } = require('../../etablissement/Models/etablissementModel');
const { User } = require('../../auth/Models/userModel');

const SalleClasse = sequelize.define(
  'SalleClasse',

  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },

    classe: {
      type: DataTypes.STRING,
      // ex: "6ème", "Terminale"
      allowNull: false
    },

    serie: {
      type: DataTypes.STRING,
      // ex: "A", "C", "D"
      allowNull: true
      // ↑ optionnel : toutes les classes n'ont pas
      //   de série (ex: 6ème n'en a pas)
    },

    typePieceJustificative: {
      type: DataTypes.ENUM('bulletin', 'carte_scolaire'),
      // ENUM = seulement ces 2 valeurs autorisées
      // Correspond aux 2 ovales <<Extend>> du diagramme
      allowNull: false
    },

    pieceJustificative: {
      type: DataTypes.STRING,
      allowNull: false
      // On stocke le CHEMIN du fichier uploadé
      // (pas le fichier lui-même dans la base)
      // ex: "uploads/pieces-justificatives/16789-bulletin.pdf"
    },

    statut: {
      type: DataTypes.ENUM('en_attente', 'approuve', 'refuse'),
      defaultValue: 'en_attente'
    }
  },

  {
    timestamps: true,
    tableName: 'salles_classe'
  }
);

// ═══════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════
//
// Une salle appartient à UN établissement
// Un établissement peut avoir PLUSIEURS salles

SalleClasse.belongsTo(Etablissement, {
  foreignKey: 'etablissementId',
  allowNull: false
});

Etablissement.hasMany(SalleClasse, {
  foreignKey: 'etablissementId',
  as: 'classes'
  // ↑ "as" donne un nom lisible à la relation quand on
  //   fait Etablissement.findAll({ include: ... }) —
  //   sinon Sequelize l'appellerait juste "SalleClasses"
});

// Une salle a été demandée par UN utilisateur
// Un utilisateur peut avoir demandé PLUSIEURS salles

SalleClasse.belongsTo(User, {
  foreignKey: 'demandeParUserId',
  allowNull: false
});

// ═══════════════════════════════════════════════
// creerDemande
// ═══════════════════════════════════════════════

const creerDemande = async ({ classe, serie, typePieceJustificative, pieceJustificative, etablissementId, demandeParUserId }) => {
  return await SalleClasse.create({
    classe,
    serie: serie || null,
    typePieceJustificative,
    pieceJustificative,
    etablissementId,
    demandeParUserId,
    statut: 'en_attente'
  });
};

// ═══════════════════════════════════════════════
// trouverParId
// ═══════════════════════════════════════════════

const trouverParId = async (id) => {
  return await SalleClasse.findByPk(id);
};

// ═══════════════════════════════════════════════
// demandesEnAttente
// ═══════════════════════════════════════════════
//
// Liste que l'admin verra pour valider/refuser
// On inclut le nom de l'établissement et de
// l'utilisateur demandeur pour que l'admin ait
// le contexte complet

const demandesEnAttente = async () => {
  return await SalleClasse.findAll({
    where: { statut: 'en_attente' },
    include: [
      { model: Etablissement, attributes: ['id', 'nom'] },
      { model: User, attributes: ['id', 'nom', 'email'] }
    ]
  });
};

// ═══════════════════════════════════════════════
// rechercherClassesValidees
// ═══════════════════════════════════════════════
//
// Pour le flux "rejoindre une classe" :
// - etablissementId : limite à un établissement
//   (typiquement choisi via /etablissements?recherche=...)
// - recherche : filtre par nom de classe
//   (ex: "term" retrouve "Terminale")
// Les deux sont optionnels et combinables ; sans
// aucun des deux, on retourne toutes les classes
// validées

const rechercherClassesValidees = async ({ etablissementId, recherche }) => {
  const { Op } = require('sequelize');

  const where = { statut: 'approuve' };
  if (etablissementId) where.etablissementId = etablissementId;
  if (recherche) where.classe = { [Op.iLike]: `%${recherche}%` };

  return await SalleClasse.findAll({
    where,
    attributes: ['id', 'classe', 'serie', 'etablissementId'],
    include: [{ model: Etablissement, attributes: ['id', 'nom', 'ville', 'pays'] }]
    // ↑ pas besoin d'exposer la pièce justificative
    //   ni qui l'a demandée à ce stade
  });
};

module.exports = {
  creerDemande,
  trouverParId,
  demandesEnAttente,
  rechercherClassesValidees,
  SalleClasse
};
