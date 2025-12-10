# Spider Music - Guide de Démarrage Rapide

## 🎵 À Propos
Spider Music est une application web de streaming musical construite avec Express.js, MongoDB et Vanilla JS.

## 📋 Prérequis
- Node.js v22+ 
- npm
- MongoDB Atlas account (gratuit)

## 🚀 Installation Locale

### 1. Cloner le dépôt
```bash
git clone <repo-url>
cd spider-music-app
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Déchiffrer les données sensibles
```bash
ENCRYPTION_KEY=eca3e226a959cc9d4d511076e455423df1848ade5da77699c30371c16777328d node decrypt-data.js
```
Cela crée les fichiers JSON à partir des fichiers `.enc`.

### 4. Démarrer le serveur
```bash
node server.js
```

Le serveur sera disponible à: `http://localhost:3000`

## 👤 Comptes de Test
- **Username:** `Louka`
- **Password:** `Ceta2007`
- **Role:** Superadmin

## 🔑 Variables d'Environnement

### Développement Local
Aucune variable d'environnement requise - le serveur fonctionne en mode hors ligne.

### Production (Railway)
```
PORT=3000
ENCRYPTION_KEY=eca3e226a959cc9d4d511076e455423df1848ade5da77699c30371c16777328d
```

## 📁 Structure du Projet

```
spider-music-app/
├── server.js              # Serveur Express principal
├── index.html             # Interface utilisateur
├── package.json           # Dépendances npm
├── *.json.enc             # Données chiffrées
├── decrypt-data.js        # Script de déchiffrement
├── encrypt-data.js        # Script de chiffrement
├── uploads/audio/         # Fichiers audio
└── ENCRYPTION.md          # Guide de gestion des clés
```

## 🎯 Fonctionnalités

✅ **Authentification** - Login/Register avec JWT simple
✅ **Gestion des chansons** - Browse, play, liker les chansons
✅ **Playlists** - Créer et gérer des playlists
✅ **Artistes** - Explorer les profils d'artistes
✅ **Posts & Notifications** - Feed social
✅ **Recherche** - Rechercher musiques, utilisateurs, artistes
✅ **Dark Mode** - Interface avec thème sombre

## 🔒 Sécurité

- Tous les fichiers sensibles (users.json, songs.json, etc.) sont **chiffrés avec AES-256-CBC**
- Les fichiers `.json` ne sont **jamais commitées** sur GitHub
- Seuls les fichiers `.json.enc` versionnés
- La clé de chiffrement stockée en variable d'environnement

Voir `ENCRYPTION.md` pour plus de détails.

## 🌐 Déploiement sur Railway

1. **Créer un projet Railway**
   - Connecter le repo GitHub
   - Auto-deploy activé

2. **Ajouter les variables d'environnement**
   - `PORT`: 3000
   - `ENCRYPTION_KEY`: eca3e226a959cc9d4d511076e455423df1848ade5da77699c30371c16777328d

3. **Configurer le port**
   - Target port: 3000
   - Public port: 8080

## 📝 Endpoints API

### Authentification
- `POST /auth/login` - Connexion
- `POST /auth/register` - Inscription

### Musiques
- `GET /songs` - Lister toutes les chansons
- `GET /songs/:id` - Détails d'une chanson
- `POST /songs/:id/like` - Liker une chanson

### Utilisateurs
- `GET /users` - Lister les utilisateurs
- `GET /users/profile/:username` - Profil utilisateur
- `POST /users/follow` - Suivre un utilisateur

### Playlists
- `GET /playlists` - Lister les playlists
- `POST /playlists/:id/songs` - Ajouter une chanson
- `DELETE /playlists/:id/songs/:songId` - Retirer une chanson

### Autres
- `GET /genres` - Lister les genres
- `GET /artists` - Lister les artistes
- `GET /posts` - Fil d'actualité
- `GET /notifications` - Notifications
- `GET /health` - Santé du serveur

## 🐛 Troubleshooting

### Le serveur ne démarre pas
```bash
# Vérifier la syntaxe
node -c server.js

# Réinstaller les dépendances
rm -r node_modules package-lock.json
npm install
```

### Les fichiers audio ne se lisent pas
- Vérifier que les fichiers existent dans `uploads/audio/`
- Vérifier que les chemins dans `songs.json` commencent par `/audio/`

### Chiffrement non fonctionnel
- Vérifier que `ENCRYPTION_KEY` est définie
- Vérifier que la clé a exactement 64 caractères hex
- Régénérer les fichiers `.enc`: `node encrypt-data.js`

## 📚 Documentation Supplémentaire
- `ENCRYPTION.md` - Gestion du chiffrement et des clés
- `PARAMETRES.md` - Configuration système

## 📝 Notes de Développement
- Les migrations MongoDB se font automatiquement au démarrage
- Les données sont sauvegardées en BDD - modifiez via l'API
- Les fichiers JSON décryptés sont à usage local uniquement
- N'oubliez pas de re-chiffrer avant de commit!

---
**Status:** ✅ Production Ready
**Dernière mise à jour:** Dec 10, 2025
