# Emma Sophie Weber Portfolio

Zentrale Doku für Setup, Betrieb und Wartung.

## Tech Stack
- Static frontend: `index.html`, `app.js`, `style.css`
- Admin: `admin.html` (Supabase Auth + Cloudinary Upload)
- Backend services: Supabase (DB + Auth), Cloudinary (Media)
- iOS wrapper: Capacitor (`ios/`)

## Erforderliche Environment Variablen
Lege lokal eine `.env` an (nicht committen):

```bash
cp .env.example .env
```

Pflicht-Variablen:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_UPLOAD_PRESET`

Hinweis:
- Werte sind als Platzhalter im Source (`admin.html`, `supabase.js`) hinterlegt.
- Build injiziert Variablen nur in den generierten Output (`www/`), nicht in Source-Dateien.

## Supabase Setup (DB + Auth)
1. Tabellen/RLS gemäß [`SUPABASE_SETUP.md`](/Users/rudolfweber/development/cursor/emmaknipst/SUPABASE_SETUP.md) anlegen.
2. Für Admin-Zugriff mindestens einen User in Supabase Auth erstellen:
   - Supabase Dashboard -> Authentication -> Users -> Create user
   - Email + Passwort vergeben
3. Mit diesem Account in `admin.html` einloggen.

## Lokale Entwicklung
Startet Build + lokalen Server auf `www/`:

```bash
npm run dev
```

Nützliche Commands:
- `npm run build` -> Web-Build nach `www/` (mit Env-Injektion)
- `npm run preflight` -> Pflichtchecks vor Deploy/Release

## Deploy (Web)
- Build-Publish-Ordner: `www/`
- Netlify (oder CI) muss diese Variablen gesetzt haben:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_UPLOAD_PRESET`

## iOS Workflow (Capacitor)
Standardablauf:

```bash
npm run preflight
npm run ios:sync
# oder alternativ:
# npm run ios:preflight
npm run ios:open
```

Bedeutung:
- `npm run preflight`: prüft Env-Variablen, Platzhalter, iOS-Dateien, Permissions.
- `npm run ios:sync`: erstellt iOS-Webbundle (`www/`, ohne Admin-Seite) und synchronisiert nach Xcode.
- `npm run ios:preflight`: kombiniert Preflight + iOS-Sync.
- `npm run ios:open`: öffnet `ios/App/App.xcodeproj` in Xcode.

## App Store Release
Siehe vollständige Checkliste:
- [`APPSTORE_CHECKLIST.md`](/Users/rudolfweber/development/cursor/emmaknipst/APPSTORE_CHECKLIST.md)

Kurz:
1. Apple Developer Program + Signing Team
2. `npm run ios:preflight`
3. Xcode: Archive + Upload in App Store Connect
4. Metadaten/Screenshots/Privacy ausfüllen

## Wartungskonventionen
- Keine Secrets in Source committen.
- `.env` bleibt lokal; `.env.example` nur mit Platzhaltern.
- Vor jedem Release:
  1. `npm run preflight`
  2. `npm run build`
  3. iOS (falls nötig) `npm run ios:preflight`
