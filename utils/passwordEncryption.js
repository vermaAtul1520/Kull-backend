const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.PASSWORD_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const IV_LENGTH = 16;

/**
 * Encrypts a plain text password for storage
 * This is separate from bcrypt hashing - used only for admin viewing
 * @param {string} text - Plain text password
 * @returns {string} - Encrypted password in format: iv:encryptedData
 */
const encryptPassword = (text) => {
  try {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv and encrypted data separated by ':'
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Password encryption error:', error);
    return null;
  }
};

/**
 * Decrypts an encrypted password
 * @param {string} encryptedText - Encrypted password in format: iv:encryptedData
 * @returns {string} - Decrypted plain text password
 */
const decryptPassword = (encryptedText) => {
  try {
    if (!encryptedText) return null;
    
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      console.error('Invalid encrypted password format');
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Password decryption error:', error);
    return null;
  }
};

module.exports = {
  encryptPassword,
  decryptPassword
};
