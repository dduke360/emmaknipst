# Emma Sophie Weber Portfolio

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
