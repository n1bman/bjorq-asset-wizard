# Changelog

## [2.9.1] — 2026-03-23

### Fixed
- Removed the UTF-8 BOM from `bjorq_asset_wizard/run.sh`, which prevented the Home Assistant add-on container from starting correctly.
- Add-on startup now reaches the real bashio bootstrap path instead of failing immediately on the shebang line.

## [2.9.0] — 2026-03-23

### Added
- Bundled a starter 3D catalog directly into Wizard with ready-to-use GLB assets, thumbnails, and metadata.
- Added automatic first-boot catalog seeding for both the standalone Docker image and the Home Assistant add-on image.

### Fixed
- Fixed the frontend CI/build pipeline by loading `lovable-tagger` lazily in development only.
- Removed the UTF-8 BOM from `package.json`, which was breaking Vite/PostCSS in GitHub Actions.

### Changed
- Wizard is now positioned as a stable asset pipeline and catalog server with an embedded starter library.
- TRELLIS / Photo → 3D remains removed from the product surface.

## [2.8.1] — 2026-03-23

### Fixed
- Fixed the frontend CI/build pipeline by loading `lovable-tagger` lazily in development only and removing the UTF-8 BOM from `package.json`, which was breaking Vite/PostCSS in GitHub Actions.

### Added
- Bundled a starter 3D catalog directly into Wizard so the app can seed ready-to-use GLB assets with thumbnails and clean categories on first boot.
- Added automatic first-boot catalog seeding for both the standalone Docker image and the Home Assistant add-on image.

## [2.8.0] — 2026-03-23

### Changed
- Removed all TRELLIS / Photo → 3D functionality from Wizard UI, backend, add-on config, and Windows worker packaging.
- Cleaned docs so Wizard now documents only upload, analyze, optimize, catalog, and sync flows.