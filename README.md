# Emma Sophie Weber Portfolio

## Local Web Test

1. `.env` anlegen (z. B. aus `.env.example`):

```bash
cp .env.example .env
```

2. Werte in `.env` eintragen (Supabase, Admin, Cloudinary).
3. Lokal starten:

```bash
npm run dev
```

Das baut nach `www/` mit deinen `.env`-Werten und startet dann einen lokalen Server.

## iOS Workflow (Capacitor)

Nutze für den iPhone-App-Build diesen Ablauf:

```bash
npm run preflight
npm run ios:sync
# oder alternativ:
# npm run ios:preflight
npm run ios:open
```

### Bedeutung
- `npm run preflight`: prüft Env-Variablen, wichtige Dateien und iOS-Berechtigungen.
- `npm run ios:sync`: baut Web-Assets und synchronisiert sie ins iOS-Projekt.
- `npm run ios:preflight`: kombiniert Preflight + Sync.
- `npm run ios:open`: öffnet das iOS-Projekt in Xcode.
