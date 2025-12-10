# 🎵 Spider Music App - MongoDB Setup Guide

## Configuration MongoDB Atlas

### 1. Créer un compte MongoDB Atlas (Gratuit)
1. Va sur https://www.mongodb.com/cloud/atlas
2. Clique sur "Sign Up"
3. Crée ton compte avec ton email

### 2. Créer un cluster (M0 = Gratuit)
1. Après connexion, clique sur "Create a Deployment"
2. Sélectionne **M0 (FREE)** → **Create**
3. Attends ~5 minutes que le cluster se déploie

### 3. Créer un utilisateur de base de données
1. Va dans **Database Access** (menu à gauche)
2. Clique sur **Add New Database User**
3. Crée un utilisateur avec :
   - **Username** : `spider-user`
   - **Password** : (génère un mot de passe fort)
4. Sélectionne **Built-in Role: Atlas Admin**
5. Clique **Create User**

### 4. Ajouter une IP à la whitelist
1. Va dans **Network Access** (menu à gauche)
2. Clique sur **Add IP Address**
3. Sélectionne **Allow access from anywhere** (0.0.0.0/0)
4. Clique **Confirm**

### 5. Copier la chaîne de connexion
1. Va dans **Clusters** → Clique sur **Connect**
2. Sélectionne **Drivers** → **Node.js**
3. Copie la chaîne de connexion (exemple) :
   ```
   mongodb+srv://spider-user:PASSWORD@cluster0.xxxxx.mongodb.net/spider-music?retryWrites=true&w=majority
   ```

### 6. Mets à jour le fichier `.env`
```env
MONGODB_URI=mongodb+srv://spider-user:TON_MOT_DE_PASSE@cluster0.xxxxx.mongodb.net/spider-music?retryWrites=true&w=majority
```

**REMPLACE :**
- `spider-user` par ton username MongoDB
- `TON_MOT_DE_PASSE` par ton mot de passe
- `cluster0.xxxxx` par ton cluster

## Configuration Railway

1. **Push le code avec `.env`** :
   ```bash
   git add .env
   git commit -m "feat: add MongoDB Atlas integration"
   git push origin main
   ```

2. **Dans Railway Dashboard** :
   - Va dans ton projet
   - Clique sur **Variables**
   - Ajoute la variable `MONGODB_URI` avec ta chaîne de connexion
   - ⚠️ **Ne commite jamais les vrais identifiants sur GitHub !**

3. **Redéploie** → Railway devrait recompiler automatiquement

## Architecture

```
Frontend (index.html)
    ↓
Express Server (server.js)
    ├─ MongoDB Atlas (données persistantes)
    │   └─ Users, Songs, Playlists, Posts, etc.
    └─ Cloudinary (fichiers audio)
        └─ URLs persistantes
```

## Avantages de MongoDB

✅ Données persistantes même après redéploiement
✅ Gratuit (M0 = 512MB)
✅ Scalable quand tu grandis
✅ Pas de limite de fichier JSON
✅ Requêtes rapides

## Démarrer localement

```bash
npm install
npm start
```

Serveur sur : http://localhost:3000

Les données seront automatiquement stockées dans MongoDB Atlas !
