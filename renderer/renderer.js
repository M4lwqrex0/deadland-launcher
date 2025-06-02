document.getElementById("close-btn").addEventListener("click", () => {
  window.close();
});

// === Toast notification ===
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

// === Mise à jour statut serveur ===
async function updateServerStatus() {
  const serverInfo = await window.electronAPI.getServerInfo();
  document.getElementById('player-count').textContent = `${serverInfo.players}/${serverInfo.maxPlayers}`;
  document.getElementById('server-status').textContent = serverInfo.online ? '🟢 Opérationnel' : '🔴 Fermé';
  document.getElementById('server-status').style.color = serverInfo.online ? 'lime' : 'red';

  document.getElementById('player-tooltip').textContent = serverInfo.players > 0
    ? "🔥 Oh ya du monde de connecté, fonce !"
    : "😴 Aucun joueur actuellement connecté...\nMais connecte-toi, le monde attire le monde !";
}

// === Latence ===
async function updateLatency() {
  const latency = await window.electronAPI.getLatency();
  const display = document.getElementById('latency');
  if (latency !== null) {
    display.textContent = `${latency}ms`;
    display.style.color = latency < 60 ? 'lightgreen' : latency < 120 ? 'orange' : 'red';
  } else {
    display.textContent = 'N/A';
    display.style.color = 'red';
  }
}

// === Initialisation après login ===
function initApp(user) {
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("main-content").style.display = "block";

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

  const launchButton = document.querySelector(".launch-btn");

  // Vérification initiale du rôle
  window.electronAPI.checkRoleValid().then(res => {
    if (!res.allowed) {
      launchButton.disabled = true;
      launchButton.textContent = "Accès refusé (Rôle manquant)";
      launchButton.style.background = "#555";
      showToast("⚠️ Tu n'as plus le rôle requis pour lancer le jeu.");
    }
  });

  // Vérification périodique du rôle
  setInterval(async () => {
    const res = await window.electronAPI.checkRoleValid();
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

// === Authentification utilisateur ===
window.electronAPI.getUser().then(user => {
  if (user) {
    initApp(user);
    checkAndHandleUpdate(); // ← ici aussi
  } else {
    document.getElementById("auth-screen").innerHTML = "<p>Connexion Discord requise pour utiliser le launcher...</p>";
  }
});

window.electronAPI.onAuthSuccess((event, user) => {
  console.log("[RENDERER] Connexion Discord validée :", user.username);
  initApp(user);
  checkAndHandleUpdate(); // <-- ici
});


// === Liens externes ===
document.getElementById("link-tebex").addEventListener("click", () => {
  window.electronAPI.openExternal("https://deadland-rp.tebex.io");
});
document.getElementById("link-discord").addEventListener("click", () => {
  window.electronAPI.openExternal("https://discord.gg/WJ8UcYuwsT");
});
document.getElementById("link-cache").addEventListener("click", async () => {
  const result = await window.electronAPI.clearCache();
  result.success
    ? showToast("✅ Cache supprimé avec succès !")
    : showToast("❌ Erreur lors de la suppression : " + result.error);
});

// === Rôle retiré en live ===
window.electronAPI.onRoleMissing?.((event, username) => {
  showToast(`⚠️ ${username}, ton rôle Discord a été retiré. Accès désactivé.`);
  document.querySelector(".launch-btn").disabled = true;
});

// === Lancement du jeu ===
async function start() {
  const box = document.getElementById("verification-box");
  const progress = document.getElementById("progress-bar");
  const label = document.getElementById("verification-label");
  const roleStatus = document.getElementById("role-status");

  box.style.display = "block";
  roleStatus.textContent = "";
  progress.style.width = "0%";
  label.textContent = "Analyse système...";

  // Scan anti-triche (40% → 60%)
  for (let i = 40; i <= 60; i++) {
    progress.style.width = `${i}%`;
    await new Promise(r => setTimeout(r, 15));
  }

  label.textContent = "Scan de logiciels malveillants...";
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

  // Finalisation (61% → 100%)
  label.textContent = "Aucune anomalie détectée. Lancement...";
  for (let i = 61; i <= 100; i++) {
    progress.style.width = `${i}%`;
    await new Promise(r => setTimeout(r, 15));
  }

  box.style.display = "none";
  window.electronAPI.launchGame();
}



// === Bannière d’infos ===
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

  banner.style.opacity = 0;
  setTimeout(() => {
    banner.textContent = newsMessages[newsIndex];
    banner.style.opacity = 1;
    newsIndex = (newsIndex + 1) % newsMessages.length;
  }, 300);
}
setInterval(rotateNews, 5000);
rotateNews();

let updateCheckInProgress = false;

async function checkAndHandleUpdate() {
  if (updateCheckInProgress) return;
  updateCheckInProgress = true;

  const box = document.getElementById("verification-box");
  const progress = document.getElementById("progress-bar");
  const label = document.getElementById("verification-label");

  // Préparation UI
  box.style.display = "block";
  progress.style.width = "0%";
  label.textContent = "Vérification des mises à jour...";

  // Attache les listeners AVANT le check
  const onProgress = (_, percent) => {
    progress.style.width = `${percent}%`;
    label.textContent = `Téléchargement : ${Math.floor(percent)}%`;
  };

  const onDownloaded = () => {
    label.textContent = "✅ Mise à jour téléchargée. Redémarrage imminent...";
    setTimeout(() => {
      window.electronAPI.installUpdateNow();
    }, 2000);
  };

  window.electronAPI.onUpdateProgress(onProgress);
  window.electronAPI.onUpdateDownloaded(onDownloaded);

  try {
    const updateInfo = await window.electronAPI.checkForUpdate?.();
    if (!updateInfo?.updateAvailable) {
      box.style.display = "none";
    }
  } catch (err) {
    console.error("❌ Erreur vérification MAJ :", err);
    label.textContent = "Erreur lors de la vérification de mise à jour.";
  } finally {
    updateCheckInProgress = false;
  }
}


