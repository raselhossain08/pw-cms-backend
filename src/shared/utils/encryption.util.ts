import * as crypto from 'crypto';

// Ensure key is 32 bytes
const getEncryptionKey = () => {
  const key =
    process.env.ENCRYPTION_KEY || 'default_secret_key_for_dev_mode_only_32B';
  return crypto.scryptSync(key, 'salt', 32);
};

const IV_LENGTH = 16;

export const EncryptionUtil = {
  encrypt(text: string): string {
    if (!text) return text;
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        getEncryptionKey(),
        iv,
      );
      let encrypted = cipher.update(text);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
      console.error('Encryption failed:', error);
      return text;
    }
  },

  decrypt(text: string): string {
    if (!text) return text;
    try {
      const textParts = text.split(':');
      if (textParts.length < 2) return text; // Not encrypted or invalid format

      const ivHex = textParts.shift();
      if (!ivHex) return text;

      const iv = Buffer.from(ivHex, 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        getEncryptionKey(),
        iv,
      );
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error('Decryption failed:', error);
      return text;
    }
  },
};
