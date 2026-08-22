// classe/Models/membreClasseModel.js
// ═══════════════════════════════════════════════
// RÔLE : Définir la structure de la table
//        "membres_classe"
//        Représente le fait qu'un utilisateur a
//        rejoint une salle de classe déjà validée,
//        avec les infos qu'il a renseignées
//        (pour être retrouvé par d'anciens camarades)
// ═══════════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');
const { DataTypes } = require('sequelize');
const sequelize = require('../../auth/config/database');
const { SalleClasse } = require('./salleClasseModel');
const { User } = require('../../auth/Models/userModel');

const MembreClasse = sequelize.define(
  'MembreClasse',

  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },

    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },

    prenom: {
      type: DataTypes.STRING,
      allowNull: false
    },

    telephone: {
      type: DataTypes.STRING,
      allowNull: true
    },

    dateNaissance: {
      type: DataTypes.DATEONLY,
      // DATEONLY = juste une date, pas d'heure
      allowNull: true
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true
      // ↑ optionnel : si non fourni, on peut se
      //   rabattre sur l'email du compte (User.email)
    },

    bio: {
      type: DataTypes.TEXT,
      allowNull: true
      // ↑ texte libre : ce que l'utilisateur veut
      //   partager pour être reconnu par d'anciens
      //   camarades de classe (ex: "j'étais au fond
      //   à droite, je jouais au foot avec Karim...")
    },

    nationalite: {
      type: DataTypes.STRING,
      allowNull: true
    },

    whatsapp: {
      type: DataTypes.STRING,
      allowNull: true
      // ↑ numéro whatsapp, potentiellement différent
      //   de "telephone"
    },

    instagram: {
      type: DataTypes.STRING,
      allowNull: true
      // ↑ nom d'utilisateur (pas l'URL complète)
    },

    snapchat: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },

  {
    timestamps: true,
    tableName: 'membres_classe',

    indexes: [
      {
        unique: true,
        fields: ['salleClasseId', 'userId']
        // ↑ un utilisateur ne peut rejoindre
        //   la même classe qu'une seule fois
      }
    ]
  }
);

// ═══════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════

MembreClasse.belongsTo(SalleClasse, {
  foreignKey: 'salleClasseId',
  allowNull: false
});

MembreClasse.belongsTo(User, {
  foreignKey: 'userId',
  allowNull: false
});

// ═══════════════════════════════════════════════
// creerMembre
// ═══════════════════════════════════════════════

const creerMembre = async ({
  nom, prenom, telephone, dateNaissance, email, bio,
  nationalite, whatsapp, instagram, snapchat,
  salleClasseId, userId
}) => {
  return await MembreClasse.create({
    nom,
    prenom,
    telephone: telephone || null,
    dateNaissance: dateNaissance || null,
    email: email || null,
    bio: bio || null,
    nationalite: nationalite || null,
    whatsapp: whatsapp || null,
    instagram: instagram || null,
    snapchat: snapchat || null,
    salleClasseId,
    userId
  });
};

// ═══════════════════════════════════════════════
// dejaMembre
// ═══════════════════════════════════════════════
//
// Vérifie si un utilisateur a déjà rejoint cette
// salle de classe (pour éviter les doublons)

const dejaMembre = async (salleClasseId, userId) => {
  return await MembreClasse.findOne({ where: { salleClasseId, userId } });
};

// ═══════════════════════════════════════════════
// membresDeLaClasse
// ═══════════════════════════════════════════════
//
// Liste des anciens camarades d'une classe
// C'est ça qui permet de "retrouver ses amis"

const membresDeLaClasse = async (salleClasseId) => {
  return await MembreClasse.findAll({
    where: { salleClasseId },
    attributes: [
      'id', 'nom', 'prenom', 'telephone', 'email', 'bio',
      'nationalite', 'whatsapp', 'instagram', 'snapchat',
      'createdAt'
    ]
    // ↑ on ne renvoie jamais rien lié au compte
    //   (motDePasse etc.), juste le profil de membre
  });
};

module.exports = {
  creerMembre,
  dejaMembre,
  membresDeLaClasse,
  MembreClasse
};
