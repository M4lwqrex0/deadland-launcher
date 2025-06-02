export $(grep -v '^#' .env | xargs)

npm version patch

version=$(node -p "require('./package.json').version")

git add .
git commit -m "🔖 Release v$version"
git tag "v$version"
git push origin master --tags

npx electron-builder --win --publish always
