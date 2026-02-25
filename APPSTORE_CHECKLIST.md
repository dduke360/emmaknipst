# App Store Checklist (iOS)

## 1) Apple & App Setup
- Join Apple Developer Program (paid).
- Create app in App Store Connect.
- Use the same Bundle Identifier as Xcode target.

## 2) Project Config (Xcode)
- Open `ios/App/App.xcodeproj`.
- Target `App` -> Signing & Capabilities:
  - Select your Team.
  - Keep `Automatically manage signing` enabled.
  - Verify Bundle Identifier is unique.
- Set versioning:
  - `MARKETING_VERSION` (e.g. `1.0.0`)
  - `CURRENT_PROJECT_VERSION` (build number, e.g. `1`)

## 3) Environment Variables
- Set these in your build/deploy environment:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `ADMIN_PASSWORD`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_UPLOAD_PRESET`
- Do not commit real secrets into tracked files.

## 4) Web/App Sync
- Run:
  - `npm run ios:sync`
- Open in Xcode:
  - `npm run ios:open`

## 5) Required Store Assets
- App Icon 1024x1024 (already scaffolded in `Assets.xcassets`).
- Screenshots for required iPhone sizes.
- App description, keywords, category.
- Support URL and Privacy Policy URL.

## 6) Privacy & Permissions
- Confirm App Privacy answers in App Store Connect.
- `Info.plist` includes camera/photo usage descriptions.
- If no tracking is used, do not add ATT prompt.

## 7) Build & Upload
- In Xcode:
  - Product -> Archive
  - Distribute App -> App Store Connect -> Upload
- In App Store Connect:
  - Select uploaded build
  - Complete all metadata
  - Submit for Review

## 8) First-Release QA
- Test on real iPhone (not only simulator).
- Verify offline/error handling.
- Verify admin login/upload flow works.
- Verify lightbox gestures and keyboard navigation.
