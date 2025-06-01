document.getElementById("close-btn").addEventListener("click", () => {
  window.close();
});


// Toast notification
function showToast(message) {
  const sound = new Audio('renderer/cache-success.mp3');
  sound.volume = 0.3;
  sound.play().catch(err => console.warn("Erreur audio:", err));

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Mise à jour statut serveur
async function updateServerStatus() {
  const serverInfo = await window.electronAPI.getServerInfo();
  const countEl = document.getElementById('player-count');
  const tooltip = document.getElementById('player-tooltip');
  const statusEl = document.getElementById('server-status');

  countEl.textContent = `${serverInfo.players}/${serverInfo.maxPlayers}`;
  statusEl.textContent = serverInfo.online ? '🟢 Opérationnel' : '🔴 Fermé';
  statusEl.style.color = serverInfo.online ? 'lime' : 'red';

  tooltip.textContent = serverInfo.players > 0
    ? "🔥 Oh ya du monde de connecté, fonce !"
    : "😴 Aucun joueur actuellement connecté...\nMais connecte-toi, le monde attire le monde !";
}

// Latence
async function updateLatency() {
  const latency = await window.electronAPI.getLatency();
  const latencyDisplay = document.getElementById('latency');
  if (latency !== null) {
    latencyDisplay.textContent = `${latency}ms`;
    latencyDisplay.style.color = latency < 60 ? 'lightgreen' : latency < 120 ? 'orange' : 'red';
  } else {
    latencyDisplay.textContent = 'N/A';
    latencyDisplay.style.color = 'red';
  }
}

// Initialisation après login
function initApp(user) {
  const authScreen = document.getElementById("auth-screen");
  const mainContent = document.getElementById("main-content");
  const launchButton = document.querySelector(".launch-btn");

  authScreen.style.display = "none";
  mainContent.style.display = "block";

  const container = document.createElement("div");
  container.classList.add("discord-container");

  const userInfo = document.createElement("div");
  userInfo.classList.add("discord-info");

  const avatar = document.createElement("img");
  avatar.classList.add("discord-avatar");
  avatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  avatar.alt = "Avatar";

  const username = document.createElement("span");
  username.textContent = `Connecté : ${user.username}`;
  username.classList.add("discord-username");

  userInfo.appendChild(avatar);
  userInfo.appendChild(username);
  container.appendChild(userInfo);
  document.body.appendChild(container);

  updateServerStatus();
  updateLatency();
  setInterval(() => {
    updateServerStatus();
    updateLatency();
  }, 10000);

  // ✅ Vérification du rôle à l'ouverture
  window.electronAPI.checkRoleValid().then(res => {
    if (!res.allowed) {
      launchButton.disabled = true;
      launchButton.textContent = "Accès refusé (Rôle manquant)";
      launchButton.style.background = "#555";
      showToast("⚠️ Tu n'as plus le rôle requis pour lancer le jeu.");
    }
  });

  // ✅ Vérification en temps réel toutes les 15s
  setInterval(async () => {
    console.log("🕒 Vérification du rôle en temps réel...");
    const res = await window.electronAPI.checkRoleValid();
    console.log("Résultat rôle:", res);

    if (!res.allowed && !launchButton.disabled) {
      launchButton.disabled = true;
      launchButton.textContent = "Accès refusé (Rôle manquant)";
      launchButton.style.background = "#555";
      showToast("🚫 Ton rôle Discord a été retiré. Accès désactivé.");
    }

    if (res.allowed && launchButton.disabled) {
      launchButton.disabled = false;
      launchButton.textContent = "REJOINDRE LE SERVEUR";
      launchButton.style.background = "#a66cff";
      showToast("✅ Rôle détecté. Accès restauré !");
    }
  }, 15000);
}


// Authentification utilisateur
window.electronAPI.getUser().then(user => {
  if (user) {
    initApp(user);
  } else {
    document.getElementById("auth-screen").innerHTML = "<p>Connexion Discord requise pour utiliser le launcher...</p>";
  }
});

// Événement auth succès
window.electronAPI.onAuthSuccess((event, user) => {
  console.log("[RENDERER] Connexion Discord validée :", user.username);
  initApp(user);
});

// Liens externes
document.getElementById("link-tebex").addEventListener("click", () => {
  window.electronAPI.openExternal("https://deadland-rp.tebex.io");
});
document.getElementById("link-discord").addEventListener("click", () => {
  window.electronAPI.openExternal("https://discord.gg/WJ8UcYuwsT");
});
document.getElementById("link-cache").addEventListener("click", async () => {
  const result = await window.electronAPI.clearCache();
  if (result.success) {
    showToast("✅ Cache supprimé avec succès !");
  } else {
    showToast("❌ Erreur lors de la suppression : " + result.error);
  }
});

// Event live si rôle supprimé (optionnel selon ton backend)
window.electronAPI.onRoleMissing?.((event, username) => {
  showToast(`⚠️ ${username}, ton rôle Discord a été retiré. Accès désactivé.`);
  document.querySelector(".launch-btn").disabled = true;
});

// Lancement du jeu
async function start() {
  const box = document.getElementById("verification-box");
  const progress = document.getElementById("progress-bar");
  const label = document.getElementById("verification-label");
  const roleStatus = document.getElementById("role-status");

  box.style.display = "block";
  roleStatus.textContent = "";
  progress.style.width = "0%";

  label.textContent = "Scan de logiciels malveillants...";
  for (let i = 0; i <= 40; i++) {
    progress.style.width = `${i}%`;
    await new Promise(r => setTimeout(r, 20));
  }

  const result = await window.electronAPI.scanForCheats();

  if (!result.success) {
    roleStatus.textContent = `❌ ${result.message}`;
    for (let i = 10; i > 0; i--) {
      label.textContent = `Triche détectée. Fermeture dans ${i} seconde${i > 1 ? 's' : ''}...`;
      await new Promise(r => setTimeout(r, 1000));
    }
    window.close();
    return;
  }

  label.textContent = "Aucune anomalie détectée. Lancement...";
  for (let i = 41; i <= 100; i++) {
    progress.style.width = `${i}%`;
    await new Promise(r => setTimeout(r, 20));
  }

  box.style.display = "none";
  window.electronAPI.launchGame();
}

window.electronAPI.onFiveMClosed?.(() => {
  showToast("🛑 La fermeture automatique de FiveM a été effectuée pour éviter toute injection..");
});


const newsMessages = [
  "🚨 Mise à jour : Aucune",
  "🎉 Événement RP : Aucun !",
  "🛠 Maintenance prévue : Aucune.",
  "📢 Rejoignez le Discord pour les dernières annonces !",
  "🔥 Nouveau : Rien"
];

let newsIndex = 0;

function rotateNews() {
  const banner = document.getElementById("news-banner");
  if (!banner) return;

  banner.style.opacity = 0; // transition douce
  setTimeout(() => {
    banner.textContent = newsMessages[newsIndex];
    banner.style.opacity = 1;
    newsIndex = (newsIndex + 1) % newsMessages.length;
  }, 300); // délai court pour le fondu
}

window.electronAPI?.onUpdateAvailable?.(() => {
  showToast("🔔 Une mise à jour est disponible. Téléchargement en cours...");
});

window.electronAPI?.onUpdateProgress?.((_, percent) => {
  showToast(`⬇️ Mise à jour : ${Math.floor(percent)}% téléchargé`);
});

window.electronAPI?.onUpdateDownloaded?.(() => {
  showToast("✅ Mise à jour téléchargée. Elle sera installée au prochain redémarrage.");
});


setInterval(rotateNews, 5000); // Change toutes les 5s
rotateNews(); // Affiche immédiatement le 1er message
