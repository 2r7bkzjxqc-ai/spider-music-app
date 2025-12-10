# 🎵 Spider Music - Paramètres & Multilangue

## ✨ Nouvelles Fonctionnalités

### 🔧 Onglet Paramètres

Un nouvel onglet **Paramètres** a été ajouté dans la barre latérale, accessible à tous les utilisateurs.

#### 📍 Localisation
- **Navigation** : Sidebar → Icône ⚙️ "Paramètres"
- **Vue** : `view-settings`

#### 🎨 Design
- Glassmorphisme moderne avec dégradés cyan/bleu/violet
- Cartes séparées pour chaque section
- Interface responsive et intuitive

---

## 👤 Changement de Pseudo

### Fonctionnalité
Permet aux utilisateurs de modifier leur nom d'utilisateur directement depuis les paramètres.

### Caractéristiques
- ✅ **Validation** : Minimum 3 caractères
- ✅ **Vérification** : Détection des doublons
- ✅ **Mise à jour globale** : 
  - Nom d'utilisateur
  - Playlists associées
  - Posts créés
  - Likes sur chansons
  - Likes sur posts

### Utilisation
1. Aller dans **Paramètres**
2. Section **Compte**
3. Saisir le nouveau pseudo
4. Cliquer sur **Modifier**

### API
```javascript
PUT /users/:username
Body: { newUsername: "nouveau_nom" }
```

---

## 🌍 Système Multilingue

### Langues Supportées

| Langue | Code | Emoji |
|--------|------|-------|
| Français | `fr` | 🇫🇷 |
| English | `en` | 🇬🇧 |
| Español | `es` | 🇪🇸 |
| Italiano | `it` | 🇮🇹 |
| Português | `pt` | 🇵🇹 |
| Deutsch | `de` | 🇩🇪 |
| 中文 | `zh` | 🇨🇳 |
| 日本語 | `ja` | 🇯🇵 |
| 한국어 | `ko` | 🇰🇷 |

### Éléments Traduits

#### Navigation
- Écouter / Listen / Escuchar...
- Mes titres / My Songs / Mis canciones...
- Explorer / Explore / Explorar...
- Communauté / Community / Comunidad...
- Paramètres / Settings / Configuración...
- Gestion / Management / Gestión...

#### Interface Paramètres
- Titre et sous-titre
- Section Compte
- Labels et boutons
- Messages de validation

#### Lecteur
- Boutons de contrôle (Play, Pause, Next, Previous)
- Indicateurs (Shuffle, Repeat, Like)
- Volume

#### Messages Communs
- Recherche
- Chargement
- Erreurs et succès
- Actions (Enregistrer, Annuler, Supprimer, etc.)

### Utilisation

#### Changer de langue
1. Aller dans **Paramètres**
2. Section **Langue**
3. Cliquer sur la langue souhaitée
4. La langue change instantanément

#### Persistance
La langue sélectionnée est sauvegardée dans `localStorage` et sera restaurée au prochain chargement.

### Architecture Technique

#### Système de traduction
```javascript
// Dictionnaire de traductions
const translations = {
    fr: { nav: { listen: "Écouter", ... }, ... },
    en: { nav: { listen: "Listen", ... }, ... },
    // ... 9 langues au total
};

// Fonction de traduction
function t(key) {
    // Exemple: t('nav.listen') → "Écouter" (si langue = fr)
}

// Mise à jour de l'interface
function updateTranslations() {
    // Parcourt tous les éléments avec data-i18n
    // Met à jour leur contenu
}
```

#### Marquage des éléments
```html
<!-- Attribut data-i18n avec clé de traduction -->
<span data-i18n="nav.listen">Écouter</span>

<!-- Le texte sera remplacé automatiquement -->
```

#### Stockage
```javascript
// Sauvegarde de la langue
localStorage.setItem('appLang', 'en');

// Récupération au chargement
let currentLang = localStorage.getItem('appLang') || 'fr';
```

---

## 🎯 Notifications Traduites

Les messages système (toasts) sont également traduits :
- ✅ Pseudo modifié
- 🌍 Langue changée
- ⚠️ Erreurs de validation

Exemple :
- **FR** : "✅ Pseudo modifié !"
- **EN** : "✅ Username changed!"
- **ES** : "✅ ¡Nombre cambiado!"
- **ZH** : "✅ 用户名已更改！"

---

## 🔄 Initialisation

Le système de traduction s'initialise automatiquement au chargement :

```javascript
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initSearch();
    updateTranslations(); // ← Initialisation des traductions
    // ...
});
```

---

## 📱 Responsive Design

L'onglet Paramètres est entièrement responsive :
- **Mobile** : Grille 2 colonnes pour les langues
- **Tablet** : Grille 3 colonnes
- **Desktop** : Layout optimisé avec max-width

---

## 🎨 Style Visuel

### Bouton de langue actif
```css
.lang-btn[data-lang].active {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2));
    border-color: rgba(6, 182, 212, 0.5);
}
```

### Indicateur visuel
Le bouton de la langue active affiche un fond cyan/bleu lumineux pour une identification immédiate.

---

## 🚀 Extensibilité

Pour ajouter une nouvelle langue :

1. **Ajouter le dictionnaire** dans `translations` (index.html)
2. **Ajouter le bouton** dans la section Langue
3. **Ajouter les traductions** pour tous les messages

Le système détecte automatiquement et applique la nouvelle langue !

---

## 📊 Statistiques

- **9 langues** supportées
- **~50 clés** de traduction
- **100% de l'interface** traduite
- **Sauvegarde** automatique des préférences

---

## 🎉 Conclusion

Spider Music est maintenant une application **multilingue complète** avec un système de **gestion de compte** moderne et intuitif !

🌟 **Profitez de votre expérience musicale dans votre langue préférée !** 🌟
