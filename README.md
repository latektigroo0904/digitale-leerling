# Digitale Leerling

Een experimentele leer-chat die bewust bijna zonder kennis start.

## Startkennis

De leerling kent alleen:

- `ik`
- `ben`
- `kan`
- `wil`

Bij een onbekend woord vraagt hij naar de betekenis en bewaart jouw antwoord lokaal in de browser.

## Project

- `web/` — PWA
- `src-tauri/` — Tauri 2 desktop/mobile shell
- `.github/workflows/pwa-deploy.yml` — GitHub Pages deployment
- `.github/workflows/ios-build.yml` — ongetekende iOS Simulator-build op een GitHub macOS runner

## Lokaal PWA testen

```bash
cd web
python -m http.server 8080
```

Open daarna `http://localhost:8080`.

## Desktop met Tauri

```bash
npm install
npm run desktop:dev
```

Release-build:

```bash
npm run desktop:build
```

## iOS

De GitHub Actions-workflow bouwt eerst een ongetekende Simulator-build.
Voor installatie op een echte iPhone of distributie via TestFlight voegen we later jouw echte Apple Development Team en signing toe.

## GitHub Pages

De PWA-workflow publiceert alleen `web/`.
Eenmalig moet in GitHub **Settings → Pages → Source** op **GitHub Actions** staan.
