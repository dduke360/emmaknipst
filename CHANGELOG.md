# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-02-25

### Added
- iOS app wrapper setup via Capacitor (`ios/` project) and iOS scripts.
- Preflight checks (`scripts/preflight.js`) for env/config/iOS readiness.
- Mobile lightbox swipe navigation and keyboard next/previous navigation.
- Admin background color palette with light/dark groups and adaptive color system.
- App Store release checklist documentation (`APPSTORE_CHECKLIST.md`).

### Changed
- Admin authentication moved to Supabase Auth (email/password) instead of client-side password check.
- Build pipeline now injects environment variables into generated output (`www/`) only.
- Deploy output standardized to `www/` (including Netlify publish directory).
- README expanded to include full setup, deploy, iOS, and maintenance instructions.

### Fixed
- Removed hardcoded credentials from source files.
- Reduced mobile gallery flicker by avoiding unnecessary re-renders on height-only resize events.
- Gallery layout gap handling improved for mixed-size tiles.

## [1.0.0] - 2026-02-25

### Added
- Initial public photography portfolio with category filtering and lightbox.
- Admin panel for content management and Cloudinary upload flow.
- Supabase-backed photo/settings data model.
