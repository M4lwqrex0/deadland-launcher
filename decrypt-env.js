const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ENC_PATH = path.join(__dirname, ".env.enc");
const KEY_PATH = path.join(__dirname, ".env.key");

if (!fs.existsSync(ENC_PATH) || !fs.existsSync(KEY_PATH)) {
    console.error("❌ Fichiers requis introuvables.");
    process.exit(1);
}

try {
    const key = Buffer.from(fs.readFileSync(KEY_PATH, "utf-8").trim(), "hex");
    const iv = Buffer.alloc(16, 0);
    const encrypted = fs.readFileSync(ENC_PATH);

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    console.log("✅ Déchiffrement réussi !");
    console.log(decrypted.toString());

} catch (err) {
    console.error("💥 Erreur de déchiffrement :", err.message);
}
