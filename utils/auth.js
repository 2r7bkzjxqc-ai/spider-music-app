const crypto = require('crypto');

// Fonction pour hasher les mots de passe
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

// Fonction pour vérifier les mots de passe
function verifyPassword(password, hashed) {
    const parts = hashed.split(':');
    if (parts.length !== 2) return false;
    
    const salt = parts[0];
    const storedHash = parts[1];
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    
    return hash === storedHash;
}

// Fonction pour nettoyer les infos utilisateur (sans exposer les données sensibles)
function cleanUserData(user) {
    if (!user) return null;
    
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password; // Ne jamais envoyer le mot de passe
    
    return userObj;
}

module.exports = {
    hashPassword,
    verifyPassword,
    cleanUserData
};
