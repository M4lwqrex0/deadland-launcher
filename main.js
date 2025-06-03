const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const dotenv = require("dotenv");
const RPC = require('discord-rpc');


function decryptAndLoadEnv() {
  const basePath = process.env.NODE_ENV === "development" ? __dirname : process.resourcesPath;
  const envEncPath = path.join(basePath, ".env.enc");
  const envKeyPath = path.join(basePath, ".env.key");

  if (!fs.existsSync(envEncPath)) {
    console.error("❌ Fichier .env.enc introuvable :", envEncPath);
    return false;
  }

  if (!fs.existsSync(envKeyPath)) {
    console.error("❌ Fichier .env.key introuvable :", envKeyPath);
    return false;
  }

  try {
    const keyHex = fs.readFileSync(envKeyPath, "utf-8").trim();
    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.alloc(16, 0);

    const encrypted = fs.readFileSync(envEncPath);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const parsed = dotenv.parse(decrypted);
    for (const k in parsed) {
      process.env[k] = parsed[k];
    }

    console.log("✅ Variables .env chargées depuis .env.enc");
    return true;

  } catch (err) {
    console.error("💥 Erreur de déchiffrement .env.enc :", err.message);
    return false;
  }
}

if (!decryptAndLoadEnv()) {
  app.quit();
}

const requiredEnvVars = [
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_REDIRECT_URI",
  "DISCORD_GUILD_ID",
  "DISCORD_REQUIRED_ROLE_ID",
  "DISCORD_BOT_TOKEN"
];

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error("❌ Variables d’environnement manquantes :", missingVars.join(", "));
  app.quit();
}

console.log("🔧 ENV Loaded — BotToken:", process.env.DISCORD_BOT_TOKEN ? "✅" : "❌ MISSING");
console.log("CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "✅" : "❌ MISSING");
console.log("GUILD_ID:", process.env.DISCORD_GUILD_ID ? "✅" : "❌ MISSING");
console.log("REQUIRED_ROLE_ID:", process.env.DISCORD_REQUIRED_ROLE_ID ? "✅" : "❌ MISSING");

const { autoUpdater } = require("electron-updater");
const { exec } = require("child_process");
const ping = require("ping");
const fsPromises = require("fs/promises");
const express = require("express");
const http = require("http");
const open = require("open");
const fetch = require("node-fetch");

const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;
const redirectUri = process.env.DISCORD_REDIRECT_URI;
const guildId = process.env.DISCORD_GUILD_ID;
const requiredRoleId = process.env.DISCORD_REQUIRED_ROLE_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

const userDataPath = path.join(app.getPath("userData"), "user.json");



let mainWindow;

function closeFiveMIfRunning() {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'tasklist' : 'ps aux';

  exec(cmd, (err, stdout) => {
    if (err) return console.error("Erreur détection processus:", err);

    const isFiveMRunning = stdout.toLowerCase().includes('fivem.exe');
    if (isFiveMRunning) {
      console.log("🛑 FiveM détecté. Fermeture en cours...");
      exec('taskkill /F /IM FiveM.exe', (killErr) => {
        if (killErr) return console.error("Erreur fermeture FiveM:", killErr);
        console.log("✅ FiveM fermé avec succès.");
        if (mainWindow) {
          mainWindow.webContents.send('fivem-closed');
        }
      });
    } else {
      console.log("✅ Aucun processus FiveM actif.");
    }
  });
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    frame: false,
    resizable: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('./renderer/index.html');
}

async function checkAuth() {
  if (!botToken || !guildId || !requiredRoleId) {
    console.error("❌ Variables d’environnement manquantes (BOT_TOKEN, GUILD_ID ou ROLE_ID).");
    return;
  }

  if (fs.existsSync(userDataPath)) {
    const user = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));

    try {
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`, {
        headers: { Authorization: `Bot ${botToken}` }
      });

      if (!memberRes.ok) throw new Error(`Discord API error (${memberRes.status})`);

      const member = await memberRes.json();

      if (!member || !Array.isArray(member.roles) || !member.roles.includes(requiredRoleId)) {
        console.warn(`⛔ Rôle requis manquant pour ${user.username}`);

        if (mainWindow) {
          mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('role-missing', user.username);
          });
        }

        return;
      }

      console.log(`✅ ${user.username} possède le rôle requis.`);

      if (mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow.webContents.send('auth-success', user);
        });
      }

    } catch (err) {
      console.error("💥 Erreur lors de la vérification du rôle :", err.message);
    }

    return;
  }

  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds.members.read`;
  const expressApp = express();
  const server = http.createServer(expressApp);

  expressApp.get('/callback', async (req, res) => {
    const code = req.query.code;
    try {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        })
      });

      const token = await tokenRes.json();

      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      const user = await userRes.json();

      const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      const member = await memberRes.json();

      if (!member.roles || !member.roles.includes(requiredRoleId)) {
        res.send(`
  <html>
    <head>
      <style>
        body {
          background: #0e0e15;
          font-family: 'Orbitron', sans-serif;
          color: #ff4f4f;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          flex-direction: column;
        }
        h2 {
          color: #ff4f4f;
          font-size: 22px;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap" rel="stylesheet">
      <script>
        setTimeout(() => window.close(), 8000);
      </script>
    </head>
    <body>
      <div class="icon">🚫</div>
      <h2>Accès refusé : rôle Discord requis manquant.</h2>
    </body>
  </html>
`);
        return server.close();
      }

      fs.writeFileSync(userDataPath, JSON.stringify(user, null, 2));
      console.log("✅ Authentification réussie :", user.username);

      if (mainWindow) {
        mainWindow.webContents.send('auth-success', user);
      }

      res.send(`
  <html>
    <head>
      <style>
        body {
          background: #0e0e15;
          font-family: 'Orbitron', sans-serif;
          color: #a66cff;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          flex-direction: column;
        }
        h2 {
          color: #00ff8c;
          font-size: 22px;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap" rel="stylesheet">
      <script>
        setTimeout(() => window.close(), 6000);
      </script>
    </head>
    <body>
      <div class="icon">✅</div>
      <h2>Connexion réussie ! Tu peux retourner sur le launcher.</h2>
    </body>
  </html>
`);
      server.close();

    } catch (err) {
      console.error("❌ Erreur OAuth2:", err);
      res.send(`
  <html>
    <head>
      <style>
        body {
          background: #0e0e15;
          font-family: 'Orbitron', sans-serif;
          color: #ff4f4f;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          flex-direction: column;
        }
        h2 {
          color: #ff4f4f;
          font-size: 22px;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap" rel="stylesheet">
      <script>
        setTimeout(() => window.close(), 8000);
      </script>
    </head>
    <body>
      <div class="icon">🚫</div>
      <h2>Accès refusé : rôle Discord requis manquant.</h2>
    </body>
  </html>
`);
    }
  });

  server.listen(4567, () => {
    console.log("[AUTH] Serveur OAuth prêt sur http://localhost:4567");
    open(authUrl).catch(err => console.error("❌ Erreur ouverture navigateur :", err));
  });
}

ipcMain.handle('check-role', async () => {
  if (!fs.existsSync(userDataPath)) return { allowed: false };

  const user = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
  try {
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`, {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });

    const member = await memberRes.json();
    const hasRole = member.roles.includes(requiredRoleId);

    return { allowed: hasRole };
  } catch (err) {
    console.error("Erreur vérification rôle :", err);
    return { allowed: false };
  }
});


ipcMain.handle('get-user', async () => {
  if (fs.existsSync(userDataPath)) {
    return JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
  }
  return null;
});

ipcMain.handle('launch-game', async () => {
  exec(`explorer "fivem://connect/45.95.113.47:30230"`);
  return { success: true };
});

ipcMain.handle('get-server-info', async () => {
  try {
    const baseUrl = 'http://45.95.113.47:30230';
    const [infoRes, playersRes] = await Promise.all([
      fetch(`${baseUrl}/info.json`),
      fetch(`${baseUrl}/players.json`)
    ]);

    if (!infoRes.ok || !playersRes.ok) throw new Error("Serveur injoignable");

    const info = await infoRes.json();
    const players = await playersRes.json();

    return {
      online: true,
      players: players.length,
      playersList: players,
      maxPlayers: parseInt(info.vars.sv_maxClients),
      hostname: info.vars.sv_hostname
    };
  } catch (err) {
    console.error("Erreur get-server-info:", err);
    return {
      online: false,
      players: 0,
      playersList: [],
      maxPlayers: 0,
      hostname: "Indisponible"
    };
  }
});

ipcMain.handle('get-latency', async () => {
  try {
    const result = await ping.promise.probe('45.95.113.47');
    return result.alive ? Math.round(result.time) : null;
  } catch (err) {
    console.error("Erreur ping:", err);
    return null;
  }
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('clear-fivem-cache', async () => {
  try {
    const cachePath = path.join(process.env.LOCALAPPDATA, 'FiveM', 'FiveM.app', 'data');
    if (!fs.existsSync(cachePath)) return { success: false, error: "Dossier introuvable." };

    const entries = await fsPromises.readdir(cachePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name !== 'game-storage') {
        const fullPath = path.join(cachePath, entry.name);
        if (entry.isDirectory()) {
          await fsPromises.rm(fullPath, { recursive: true, force: true });
        } else {
          await fsPromises.unlink(fullPath);
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Erreur suppression cache:", err);
    return { success: false, error: err.message };
  }
});

const forbiddenTools = [
  "RedEngine", "ProcessHacker", "Process Hacker", "Cheat Engine",
  "Susano", "TZ", "Keyser", "Extreme Injector", "GH Injector",
  "DLL Injector", "xenos64", "injector", "exploit"
];

ipcMain.handle("scan-for-cheats", async () => {
  try {
    const scanDirs = [
      path.join(process.env.PROGRAMFILES),
      path.join(process.env["PROGRAMFILES(X86)"]),
      path.join(process.env.LOCALAPPDATA),
      path.join(process.env.APPDATA)
    ];

    console.log("🔍 Début du scan de logiciels interdits...");

    for (const dir of scanDirs) {
      if (!fs.existsSync(dir)) {
        console.log(`📁 Dossier introuvable (ignoré) : ${dir}`);
        continue;
      }

      console.log(`📂 Analyse du dossier : ${dir}`);

      const entries = await fsPromises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const entryName = entry.name.toLowerCase();

        for (const keyword of forbiddenTools) {
          const keywordLower = keyword.toLowerCase();

          if (entryName.includes(keywordLower)) {
            const fullPath = path.join(dir, entry.name);
            console.log(`🚫 Détection : "${entry.name}" correspond au mot-clé "${keyword}"`);
            console.log(`📌 Chemin complet : ${fullPath}`);

            return {
              success: false,
              message: `Logiciel interdit détecté : ${entry.name}`
            };
          }
        }
      }
    }

    console.log("✅ Aucun logiciel interdit détecté.");
    return { success: true };

  } catch (err) {
    console.error("❌ Erreur durant le scan de logiciels malveillants :", err);
    return { success: false, message: "Erreur pendant le scan." };
  }
});



ipcMain.handle('check-for-update', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    const current = app.getVersion();
    const latest = result?.updateInfo?.version;
    return { updateAvailable: latest && latest !== current };
  } catch (err) {
    console.error("Erreur MAJ:", err);
    return { updateAvailable: false };
  }
});

ipcMain.handle('install-update-now', () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', progressObj.percent);
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-random-password', async () => {
  try {
    const basePath = process.resourcesPath;
    const passwordFilePath = path.join(basePath, 'mots-de-passe.txt');

    if (!fs.existsSync(passwordFilePath)) {
      throw new Error('Fichier mots-de-passe.txt introuvable.');
    }

    const content = await fsPromises.readFile(passwordFilePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(Boolean);

    if (lines.length === 0) {
      throw new Error('Aucun mot de passe trouvé dans mots-de-passe.txt');
    }

    const randomIndex = Math.floor(Math.random() * lines.length);
    return lines[randomIndex];
  } catch (err) {
    console.error("❌ Erreur lecture password:", err);
    return null;
  }
});

app.whenReady().then(() => {
  const requiredVars = [
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
    "DISCORD_GUILD_ID",
    "DISCORD_REQUIRED_ROLE_ID",
    "DISCORD_BOT_TOKEN"
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    const errorMsg = `Certaines variables .env sont manquantes :\n\n${missing.join('\n')}`;

    const errorWin = new BrowserWindow({
      width: 500,
      height: 250,
      title: "Erreur de configuration",
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      alwaysOnTop: true,
      backgroundColor: "#1e1e1e",
      webPreferences: { nodeIntegration: true }
    });

    errorWin.loadURL(`data:text/html,
      <html>
        <body style="background:#1e1e1e;color:white;font-family:sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;">
          <h2>❌ Erreur .env</h2>
          <p style="white-space:pre;text-align:center;">${errorMsg}</p>
        </body>
      </html>`);

    return;
  }

  createWindow();

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'M4lwqrex0',
    repo: 'deadland-launcher'
  });

  checkAuth();

  setTimeout(() => closeFiveMIfRunning(), 800);

  const rpcClient = new RPC.Client({ transport: 'ipc' });

  rpcClient.on('ready', () => {
    rpcClient.setActivity({
      details: "Launcher DeadLand RP",
      state: "Connexion sécurisée...",
      startTimestamp: new Date(),
      largeImageKey: "logo",
      largeImageText: "DeadLand RP",
      smallImageKey: "fivem",
      smallImageText: "FiveM Ready",
      buttons: [
        { label: "📌 Discord", url: "https://discord.gg/WJ8UcYuwsT" },
        { label: "🛒 Boutique", url: "https://deadland-rp.tebex.io" }
      ]
    });
    console.log("✅ Rich Presence Discord actif");
  });

  rpcClient.login({ clientId: process.env.DISCORD_CLIENT_ID }).catch(err => {
    console.error("❌ Rich Presence erreur :", err.message);
  });
});
