// etablissement/Models/etablissementModel.js
// ═══════════════════════════════════════════════
// RÔLE : Définir la structure de la table
//        "etablissements" (les écoles)
//        ET fournir les fonctions pour
//        lire/écrire dans cette table
// ═══════════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');
const { DataTypes } = require('sequelize');
const sequelize = require('../../auth/config/database');
// ↑ même connexion PostgreSQL que pour User
//   il n'y a qu'une seule base, donc une seule connexion

const Etablissement = sequelize.define(
  'Etablissement',

  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },

    nom: {
      type: DataTypes.STRING,
      allowNull: false
      // Plus "unique" tout seul : deux écoles peuvent
      // porter le même nom dans des villes différentes
      // (ex: "Lycée Victor Hugo" existe dans plusieurs
      // villes) → l'unicité se fait maintenant sur
      // nom + pays + ville (voir "indexes" plus bas)
    },

    pays: {
      type: DataTypes.STRING,
      allowNull: false
    },

    ville: {
      type: DataTypes.STRING,
      allowNull: false
    },

    quartier: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },

  {
    timestamps: true,
    tableName: 'etablissements',

    indexes: [
      {
        unique: true,
        fields: ['nom', 'pays', 'ville']
        // ↑ évite les doublons du même établissement
        //   dans la même ville, tout en permettant
        //   deux écoles homonymes dans des villes
        //   différentes
      }
    ]
  }
);

// ═══════════════════════════════════════════════
// trouverOuCreer
// ═══════════════════════════════════════════════
//
// Quand un utilisateur demande la création d'une
// salle de classe, il donne le nom de l'école ET
// sa localisation (pays, ville, quartier).
// On ne veut pas créer un doublon si l'école existe
// déjà dans cette ville, donc :
// → si nom+pays+ville existe déjà → on réutilise
//   cette ligne (le quartier n'est pas revérifié,
//   c'est juste une info descriptive)
// → sinon → on la crée avec sa localisation complète

const trouverOuCreer = async ({ nom, pays, ville, quartier }) => {
  const [etablissement] = await Etablissement.findOrCreate({
    where: { nom, pays, ville },
    defaults: { nom, pays, ville, quartier }
  });
  return etablissement;
};

// ═══════════════════════════════════════════════
// rechercher
// ═══════════════════════════════════════════════
//
// Pour le cas d'usage "Rechercher un établissement"
// recherche = texte tapé par l'utilisateur, comparé
// au nom, au pays, à la ville ET au quartier
// (vide = tout lister)

const rechercher = async (recherche) => {
  const { Op } = require('sequelize');
  // ↑ require ici (pas en haut du fichier) pour éviter
  //   une dépendance circulaire : salleClasseModel.js
  //   importe déjà etablissementModel.js, donc l'inverse
  //   au chargement du module casserait tout. En le
  //   faisant à l'intérieur de la fonction, ce require
  //   ne s'exécute qu'au moment de l'appel — largement
  //   après que tous les modèles ont fini de se charger
  const { SalleClasse } = require('../../classe/Models/salleClasseModel');

  return await Etablissement.findAll({
    where: recherche
      ? {
          [Op.or]: [
            { nom: { [Op.iLike]: `%${recherche}%` } },
            { pays: { [Op.iLike]: `%${recherche}%` } },
            { ville: { [Op.iLike]: `%${recherche}%` } },
            { quartier: { [Op.iLike]: `%${recherche}%` } }
          ]
        }
      : undefined,
    include: [{
      model: SalleClasse,
      as: 'classes',
      where: { statut: 'approuve' },
      required: false,
      // ↑ required: false = LEFT JOIN : l'établissement
      //   apparaît même s'il n'a aucune classe validée
      //   (sinon il disparaîtrait des résultats, alors
      //   qu'on veut justement pouvoir le trouver pour
      //   y demander la création d'une nouvelle classe)
      attributes: ['id', 'classe', 'serie']
    }]
  });
};

module.exports = {
  trouverOuCreer,
  rechercher,
  Etablissement
};
