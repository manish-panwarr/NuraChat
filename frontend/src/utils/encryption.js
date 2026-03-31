// Web Crypto API based E2EE Utility (AES-GCM)

// Helper: Convert string to Uint8Array
const strToUint8Array = (str) => new TextEncoder().encode(str);

// Helper: Convert Uint8Array to string
const uint8ArrayToStr = (buffer) => new TextDecoder().decode(buffer);

// Default key for demonstration if user keys not set up (In prod, derive from user secrets)
const DEMO_KEY_RAW = "12345678901234567890123456789012";

// Import key into Web Crypto API
const getCryptoKey = async () => {
  const keyMaterial = strToUint8Array(DEMO_KEY_RAW);
  return await window.crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
};

// Encrypt plaintext message
export const encryptMessage = async (text) => {
  try {
    const key = await getCryptoKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = strToUint8Array(text);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedText
    );

    // Combine IV and Ciphertext for storage, encode in base64
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);

    // Convert to base64 string
    const base64Str = btoa(String.fromCharCode(...combined));
    return "E2E_" + base64Str;
  } catch (error) {
    console.error("Encryption failed:", error);
    return null;
  }
};

// Decrypt ciphertext message
export const decryptMessage = async (encryptedData) => {
  if (!encryptedData) return "";
  if (encryptedData.startsWith("ENC_")) {
    // Legacy base64 support during migration
    try {
      return atob(encryptedData.substring(4));
    } catch { return "**Decryption Failed**"; }
  }

  if (!encryptedData.startsWith("E2E_")) {
    return encryptedData; // Unencrypted fallback
  }

  try {
    const base64Str = encryptedData.substring(4);
    const binaryStr = atob(base64Str);
    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combined[i] = binaryStr.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const key = await getCryptoKey();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    return uint8ArrayToStr(new Uint8Array(decryptedBuffer));
  } catch (error) {
    console.error("Decryption failed:", error);
    return "**Decryption Failed**";
  }
};
