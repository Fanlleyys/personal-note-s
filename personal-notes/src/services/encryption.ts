// Simple encryption service using Web Crypto API
// For production, consider using a more robust solution

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Generate a key from password
const getKeyFromPassword = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as unknown as BufferSource,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
};

// Generate random bytes
const generateRandomBytes = (length: number): Uint8Array => {
    return crypto.getRandomValues(new Uint8Array(length));
};

// Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// Convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

// Encrypt a string
export const encrypt = async (plaintext: string, userKey: string): Promise<string> => {
    try {
        const encoder = new TextEncoder();
        const salt = generateRandomBytes(16);
        const iv = generateRandomBytes(12);
        const key = await getKeyFromPassword(userKey, salt);

        const encrypted = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv: iv as unknown as BufferSource },
            key,
            encoder.encode(plaintext)
        );

        // Combine salt + iv + encrypted data
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        return arrayBufferToBase64(combined.buffer);
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

// Decrypt a string
export const decrypt = async (encryptedData: string, userKey: string): Promise<string> => {
    try {
        const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));

        // Extract salt, iv, and encrypted data
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encrypted = combined.slice(28);

        const key = await getKeyFromPassword(userKey, salt);

        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv: iv as unknown as BufferSource },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};

// Generate a random password
export const generatePassword = (length: number = 16, options?: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
}): string => {
    const {
        uppercase = true,
        lowercase = true,
        numbers = true,
        symbols = true
    } = options || {};

    let chars = '';
    if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (numbers) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) {
        chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }

    const randomValues = generateRandomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars[randomValues[i] % chars.length];
    }

    return password;
};
