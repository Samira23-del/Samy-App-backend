// auth/Models/userModel.js
// ═══════════════════════════════════════════════
// RÔLE : Définir la structure de la table users
//        dans PostgreSQL
//        ET fournir les fonctions pour
//        lire/écrire dans cette table
//
// ÉQUIVALENT PHP :
// User.php avec Eloquent dans Laravel
// ═══════════════════════════════════════════════

const { v4: uuidv4 } = require('uuid');
// v4 = version 4 de UUID (aléatoire)
// uuidv4() génère : "550e8400-e29b-41d4-a716-446655440000"

const { DataTypes } = require('sequelize');
// DataTypes = les types de données disponibles
// String, Integer, Boolean, etc.
// C'est comme les types en SQL :
// VARCHAR, INT, BOOLEAN...

const sequelize = require('../config/database');
// On importe la connexion qu'on vient de créer
// .. = remonter d'un dossier (de Models vers auth)
// config/database = notre fichier de config

// ═══════════════════════════════════════════════
// DÉFINITION DU MODÈLE
// ═══════════════════════════════════════════════

const User = sequelize.define(
// sequelize.define() = crée un modèle
// qui correspond à une table dans PostgreSQL
//
// ÉQUIVALENT PHP/Laravel :
// class User extends Model { ... }

  'User',
  // ↑ nom du modèle
  // Sequelize créera une table "Users"
  // (il met automatiquement une majuscule et le pluriel)

  // ── LES COLONNES DE LA TABLE ──
  {
    id: {
      type: DataTypes.UUID,
      // UUID au lieu de INTEGER
      defaultValue: () => uuidv4(),
      // Génère automatiquement un UUID
      // à chaque création d'utilisateur
      primaryKey: true
      // Plus besoin de autoIncrement
    },

    nom: {
      type: DataTypes.STRING,
      // STRING = texte
      // En SQL : VARCHAR(255)
      allowNull: false
      // allowNull: false = obligatoire
      // ÉQUIVALENT SQL : NOT NULL
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
      // unique = pas deux users avec le même email
      // ÉQUIVALENT SQL : UNIQUE
    },

    motDePasse: {
      type: DataTypes.STRING,
      allowNull: false
      // On stockera le hash bcrypt ici
      // pas le vrai mot de passe
    },

    role: {
      type: DataTypes.ENUM('user', 'admin'),
      // ENUM = seulement ces valeurs autorisées
      // ÉQUIVALENT SQL : role VARCHAR CHECK (role IN ('user','admin'))
      defaultValue: 'user'
      // valeur par défaut si non précisé
    },

    actif: {
      type: DataTypes.BOOLEAN,
      // BOOLEAN = true ou false
      defaultValue: true
    }
  },

  // ── OPTIONS ──
  {
    timestamps: true,
    // Ajoute automatiquement :
    // createdAt = date de création
    // updatedAt = date de modification

    tableName: 'users'
    // Force le nom de la table en minuscules
    // Sans ça Sequelize appellerait la table "Users"
  }
);

// ═══════════════════════════════════════════════
// LES FONCTIONS QUI REMPLACENT LE TABLEAU
// ═══════════════════════════════════════════════

const creerUser = async (nom, email, motDePasseHash) => {
// async car on parle à PostgreSQL
// ça prend du temps → on doit attendre

  return await User.create({
  // User.create() = INSERT INTO users ...
  // Insère une nouvelle ligne dans la table
  //
  // ÉQUIVALENT SQL :
  // INSERT INTO users (nom, email, motDePasse, role, actif)
  // VALUES ('Samy', 'samy@gmail.com', '$2b$...', 'user', true)
  //
  // ÉQUIVALENT PHP :
  // $user = new User();
  // $user->save();
    nom,
    email,
    motDePasse: motDePasseHash,
    role: 'user',
    actif: true
  });
};

const trouverParEmail = async (email) => {
// Cherche un user par email

  return await User.findOne({
  // User.findOne() = SELECT * FROM users WHERE ...
  // Retourne le premier résultat trouvé
  //
  // ÉQUIVALENT SQL :
  // SELECT * FROM users WHERE email = 'samy@gmail.com' LIMIT 1
    where: { email: email }
    // where = la condition de recherche
    // ÉQUIVALENT SQL : WHERE email = ?
  });
};

const trouverParId = async (id) => {
// Cherche un user par son id

  return await User.findByPk(id);
  // findByPk = find By Primary Key
  // Cherche par la clé primaire (id)
  //
  // ÉQUIVALENT SQL :
  // SELECT * FROM users WHERE id = 1
  //
  // ÉQUIVALENT PHP/Laravel :
  // User::find($id)
};

const tousLesUsers = async () => {
// Retourne tous les users

  return await User.findAll({
  // findAll() = SELECT * FROM users
  //
  // ÉQUIVALENT SQL :
  // SELECT id, nom, email, role, actif FROM users
    attributes: { exclude: ['motDePasse'] }
    // exclude = exclure ces colonnes du résultat
    // On ne retourne jamais le mot de passe
    //
    // ÉQUIVALENT SQL :
    // SELECT id, nom, email, role, actif FROM users
    // (sans motDePasse)
  });
};

module.exports = {
  creerUser,
  trouverParEmail,
  trouverParId,
  tousLesUsers,
  User
  // On exporte aussi User pour sync dans app.js
};