#!/bin/bash

# 🛡️ Charge les variables d'environnement depuis le .env
export $(grep -v '^#' .env | xargs)

# 🔁 Incrémentation automatique de la version patch
npm version patch

# 🏷️ Récupère la nouvelle version
version=$(node -p "require('./package.json').version")

# 🏷️ Commit + tag Git
git add .
git commit -m "🔖 Release v$version"
git tag "v$version"
git push origin master --tags

# 🚀 Build & Publish
npx electron-builder --win --publish always
