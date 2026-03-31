import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config(); // 👈 sabse upar
const algorithm = process.env.ENCRYPTION_ALGO;

if (!process.env.ENCRYPTION_KEY) {
  throw new Error("❌ ENCRYPTION_KEY missing in .env file");
}

const key = Buffer.from(process.env.ENCRYPTION_KEY, "utf-8");

export const encryptText = (text) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    iv: iv.toString("hex"),
    content: encrypted,
    authTag,
  };
};

export const decryptText = (encryptedData) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(encryptedData.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

  let decrypted = decipher.update(encryptedData.content, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
