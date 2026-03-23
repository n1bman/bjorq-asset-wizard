# Changelog

## [2.9.6] � 2026-03-23

### Added
- Added a Playwright-based thumbnail generator that renders real preview images from the bundled GLB starter library instead of placeholder cards.

### Changed
- Backend startup now refreshes bundled starter thumbnails into the live catalog, so existing Home Assistant installs upgrade to the new rendered previews automatically.

## [2.9.5] — 2026-03-23

### Fixed
- Added frontend support for starter-library assets with `syncStatus: "pending"`, preventing the Catalog/Browser view from crashing on seeded models.
- Browser and Wizard views now render seeded starter assets with stable status badges instead of failing during card rendering.

## [2.9.4] — 2026-03-23

### Fixed
- Added proper support for bundled assets with `source: "imported"`, preventing the Browser catalog view from crashing when starter-library assets are rendered.
- Wired Wizard catalog cards and the Wizard asset detail view to the real thumbnail endpoints, so bundled starter assets now show preview images instead of only placeholder cubes.
- Unified catalog thumbnail loading to use the ingress-safe asset thumbnail endpoint.

## [2.9.2] — 2026-03-23

### Fixed
- Treat empty scaffold folders in `/data/catalog` as an empty catalog, so the bundled starter library now seeds correctly on first boot in the Home Assistant add-on.
- Starter models, thumbnails, and metadata now appear even when `run.sh` has pre-created category folders before backend startup.

## [2.9.1] — 2026-03-23

### Fixed
- Removed the UTF-8 BOM from `bjorq_asset_wizard/run.sh`, which prevented the Home Assistant add-on container from starting correctly.
- Add-on startup now reaches the real bashio bootstrap path instead of failing immediately on the shebang line.

## [2.9.0] — 2026-03-23

### Added
- Bundled a starter 3D catalog directly into Wizard with ready-to-use GLB assets, thumbnails, and metadata.
- Added automatic first-boot catalog seeding for both the standalone Docker image and the Home Assistant add-on image.
