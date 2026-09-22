# Digitale Leerling

Een experimentele leer-chat die bewust bijna zonder kennis start en stap voor stap door de gebruiker wordt aangeleerd.

## Startkennis

De leerling kent aanvankelijk alleen:

- `ik`
- `ben`
- `kan`
- `wil`

Bij een onbekend woord vraagt hij naar de betekenis. De aangeleerde definities worden lokaal op het toestel opgeslagen in IndexedDB. Bestaande gegevens uit de oudere localStorage-versie worden automatisch gemigreerd.

## Projectstructuur

- `web/` — PWA/browserversie
- `web/db.js` — IndexedDB-opslag en automatische migratie van oudere localStorage-data
- `src-tauri/` — Tauri 2 shell voor desktop en mobiel
- `.github/workflows/pwa-deploy.yml` — GitHub Pages
- `.github/workflows/windows-build.yml` — Windows desktopbuild
- `.github/workflows/android-build.yml` — Android debug-APK
- `.github/workflows/ios-build.yml` — ongetekende iOS Simulator-build op macOS

## PWA lokaal testen

```bash
cd web
python -m http.server 8080
```

Open daarna `http://localhost:8080`.

## Desktop lokaal ontwikkelen

Vereist Node.js, Rust en de platformvereisten van Tauri.

```bash
npm install
npm run desktop:dev
```

## Automatische builds

Alle buildworkflows kunnen handmatig gestart worden via **GitHub → Actions** en draaien ook automatisch wanneer relevante bronbestanden veranderen.

### Windows

De Windows-workflow maakt een NSIS-installer en bewaart die als GitHub Actions-artifact.

### Android

De Android-workflow maakt een debug-APK en bewaart die als GitHub Actions-artifact.

### iOS

De iOS-workflow initialiseert het Tauri/Xcode-project op een GitHub macOS-runner en maakt een ongetekende Simulator-build.

Een Simulator-build kan niet rechtstreeks op een echte iPhone worden geïnstalleerd. Voor een echte iPhone/TestFlight-build voegen we later Apple signing, jouw Development Team en provisioning toe.

## GitHub Pages

De workflow publiceert alleen `web/`.

Eenmalige accountinstelling:

**Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**

Daarna kunnen nieuwe versies automatisch naar GitHub Pages worden uitgerold.
