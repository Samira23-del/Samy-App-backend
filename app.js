// app.js
// ═══════════════════════════════════════════════
// RÔLE : Point d'entrée de l'application
//        Maintenant on connecte PostgreSQL
//        avant de démarrer le serveur
// ═══════════════════════════════════════════════

const express = require('express');
const app = express();
app.use(express.json());

const sequelize = require('./auth/config/database');
// On importe la connexion PostgreSQL

const { User } = require('./auth/Models/userModel');
// On importe le modèle User
// pour que Sequelize puisse créer la table

const authRoutes = require('./auth/Controller/authController');
app.use('/auth', authRoutes);

const adminRoutes = require('./auth/Controller/adminController');
app.use('/admin', adminRoutes);
// Toutes les routes de adminController
// seront précédées de /admin


// ═══════════════════════════════════════════════
// DÉMARRAGE AVEC POSTGRESQL
// ═══════════════════════════════════════════════

const demarrer = async () => {
// async car on fait des opérations asynchrones
// connexion à PostgreSQL prend du temps

  try {

    await sequelize.authenticate();
    // authenticate() = teste si la connexion fonctionne
    // Si PostgreSQL n'est pas démarré → erreur ici
    //
    // ÉQUIVALENT PHP :
    // try { new PDO(...) } catch { echo "erreur"; }

    console.log('✅ Connecté à PostgreSQL');

    await sequelize.sync({ alter: true });
    // sync() = synchronise les modèles avec la base
    //
    // { alter: true } = met à jour les tables existantes
    // si tu modifies le modèle
    //
    // Ce que ça fait concrètement :
    // → Regarde si la table "users" existe dans PostgreSQL
    // → Si non → la crée automatiquement
    // → Si oui → met à jour si nécessaire
    //
    // ÉQUIVALENT SQL :
    // CREATE TABLE IF NOT EXISTS users (
    //   id SERIAL PRIMARY KEY,
    //   nom VARCHAR(255) NOT NULL,
    //   email VARCHAR(255) UNIQUE NOT NULL,
    //   ...
    // )

    console.log('✅ Tables créées/synchronisées');

    app.listen(3000, () => {
      console.log('🚀 Serveur démarré sur http://localhost:3000');
    });

  } catch (erreur) {
    console.log('❌ Erreur :', erreur.message);
    // Si PostgreSQL n'est pas démarré
    // ou mot de passe incorrect
    // on verra l'erreur ici
  }
};

demarrer();
// On appelle la fonction pour tout démarrer