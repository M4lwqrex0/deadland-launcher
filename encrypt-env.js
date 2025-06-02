const fs = require("fs");
const crypto = require("crypto");

const ENV_INPUT = ".env";
const KEY_OUTPUT = ".env.key";
const ENC_OUTPUT = ".env.enc";

if (!fs.existsSync(ENV_INPUT)) {
    console.error(`❌ Fichier ${ENV_INPUT} introuvable.`);
    process.exit(1);
}


const key = crypto.randomBytes(32);
fs.writeFileSync(KEY_OUTPUT, key.toString("hex"));
console.log(`🔐 Clé générée et enregistrée dans ${KEY_OUTPUT}`);


const envContent = fs.readFileSync(ENV_INPUT);
const iv = Buffer.alloc(16, 0);
const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

let encrypted = cipher.update(envContent);
encrypted = Buffer.concat([encrypted, cipher.final()]);

fs.writeFileSync(ENC_OUTPUT, encrypted);
console.log(`✅ Fichier .env chiffré → ${ENC_OUTPUT}`);
