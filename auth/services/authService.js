// auth/services/authServices.js
// ═══════════════════════════════════════════════
// RÔLE : Toute la logique métier
//        Maintenant les fonctions du Model
//        sont asynchrones car elles parlent
//        à PostgreSQL
// ═══════════════════════════════════════════════

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../Models/userModel');

const SECRET = 'monsecret123';

// ═══════════════════════════════════════════════
// verifyToken — identique à avant
// ═══════════════════════════════════════════════

const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('Token manquant');

  const token = authHeader.split(' ')[1];

  try {
    return jwt.verify(token, SECRET);
  } catch {
    throw new Error('Token invalide ou expiré');
  }
};

// ═══════════════════════════════════════════════
// register
// ═══════════════════════════════════════════════

const register = async (nom, email, motDePasse) => {

  if (!nom || !email || !motDePasse) {
    throw new Error('Tous les champs sont obligatoires');
  }

  const userExistant = await UserModel.trouverParEmail(email);
  // ↑ await car maintenant c'est une requête PostgreSQL
  //   On attend que PostgreSQL réponde

  if (userExistant) {
    throw new Error('Cet email est déjà utilisé');
  }

  const hash = await bcrypt.hash(motDePasse, 10);

  const nouvelUser = await UserModel.creerUser(nom, email, hash);
  // ↑ await car INSERT INTO users...
  //   On attend que PostgreSQL confirme l'insertion

  return {
    message: 'Compte créé avec succès',
    user: {
      id: nouvelUser.id,
      nom: nouvelUser.nom,
      email: nouvelUser.email
    }
  };
};

// ═══════════════════════════════════════════════
// login
// ═══════════════════════════════════════════════

const login = async (email, motDePasse) => {

  const user = await UserModel.trouverParEmail(email);
  // ↑ SELECT * FROM users WHERE email = ?

  if (!user) throw new Error('Email ou mot de passe incorrect');
  if (!user.actif) throw new Error('Compte désactivé');

  const ok = await bcrypt.compare(motDePasse, user.motDePasse);
  if (!ok) throw new Error('Email ou mot de passe incorrect');

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    SECRET,
    { expiresIn: '30d' }
  );

  return {
    message: 'Connexion réussie',
    token,
    user: {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role
    }
  };
};

// ═══════════════════════════════════════════════
// changerMotDePasse
// ═══════════════════════════════════════════════

const changerMotDePasse = async (req, ancienMdp, nouveauMdp) => {

  const decoded = verifyToken(req);

  const user = await UserModel.trouverParId(decoded.userId);
  // ↑ SELECT * FROM users WHERE id = ?

  if (!user) throw new Error('Utilisateur non trouvé');

  const ok = await bcrypt.compare(ancienMdp, user.motDePasse);
  if (!ok) throw new Error('Ancien mot de passe incorrect');

  user.motDePasse = await bcrypt.hash(nouveauMdp, 10);
  await user.save();
  // ↑ user.save() = UPDATE users SET motDePasse = ? WHERE id = ?
  //   Sequelize sait automatiquement quelle ligne mettre à jour
  //
  // ÉQUIVALENT SQL :
  // UPDATE users SET motDePasse = '$2b$...' WHERE id = 1

  return { message: 'Mot de passe modifié avec succès' };
};

// ═══════════════════════════════════════════════
// listerUtilisateurs
// ═══════════════════════════════════════════════

const listerUtilisateurs = async (req) => {

  const decoded = verifyToken(req);
  if (decoded.role !== 'admin') {
    throw new Error('Accès refusé — admin seulement');
  }

  const users = await UserModel.tousLesUsers();
  // ↑ SELECT id, nom, email, role, actif FROM users

  return users;
};

// ═══════════════════════════════════════════════
// desactiverUtilisateur
// ═══════════════════════════════════════════════

const desactiverUtilisateur = async (req, userId) => {

  const decoded = verifyToken(req);
  if (decoded.role !== 'admin') {
    throw new Error('Accès refusé — admin seulement');
  }

  const user = await UserModel.trouverParId(userId);
  // ↑ SELECT * FROM users WHERE id = ?

  if (!user) throw new Error('Utilisateur non trouvé');

  user.actif = false;
  await user.save();
  // ↑ UPDATE users SET actif = false WHERE id = ?

  return { message: `${user.nom} a été désactivé` };
};

module.exports = {
  register,
  login,
  changerMotDePasse,
  listerUtilisateurs,
  desactiverUtilisateur
};