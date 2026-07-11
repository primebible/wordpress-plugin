# Changelog
All notable changes to the PrimeBible Verse Preview WordPress Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- WordPress.org plugin directory submission
- Internationalization (i18n) support
- Dark mode theme improvements
- Admin dashboard analytics

---

## [2.5.3] - 2026-07-11

### Fixed
- **Reference detection no longer matches everyday words.** Short book
  aliases ("I S", "Am", "So", "Ac", "Act", "Song", "GA", "ES", ...) collapsed
  into common English once whitespace was made optional, so prose like
  "there is 5", "I am 24", or "so 3 people" was wrapped as a verse link —
  and "is 5" even fetched 1 Samuel 5. Ambiguous aliases now still work in
  the `[primebible]` shortcode and normalization but never trigger
  auto-detection.
- Chapter/verse numbers are capped at 3 digits and guarded against times
  ("3pm"), ordinals ("3rd"), years ("2026"), and percentages, eliminating
  date/time/score false positives.
- The "Load in Admin Dashboard" setting works now (the embed script was
  never hooked to `admin_enqueue_scripts`, so the toggle did nothing).
- The documented `primebible_should_load` filter is now actually implemented.
- Inline config JSON escapes `<` and `&`, so a stored `</script>` in any
  settings field can no longer break out of the script tag (hardening;
  reaching the fields required admin capability).
- Exclude selectors and chapter-count book names are tag-stripped on save.
- Stale `data-pbv-observed` attributes are cleaned up correctly (attribute
  name typo made the removal a no-op).
- `destroy()` removes the module-level resize/orientation/color-scheme
  listeners, preventing slow listener leaks under SPA-style reloads.

### Added
- 14 detection regression tests in the built-in `PrimeBible.runTests()` suite.

---

## [2.5.2] - 2026-06-11

### Fixed
- Short book abbreviations are normalized before API requests
- `Ac`, `Rm`, `Ga`, `Lu`, and compact numbered forms such as `2Sa` resolve to full book names internally
- Delayed hover previews are canceled when the pointer leaves a reference
- Invalid exclude selectors no longer stop content scanning

### Added
- Translation dropdown and API test tool in settings
- `[primebible ref="John 3:16"]` shortcode for manual references
- Bundled chapter verse counts for accurate cross-chapter expansion

### Changed
- Release metadata now matches plugin version 2.5.2
- `mobileOptimized` now controls mobile tooltip layout instead of being a dead setting

---

## [2.5.1] - 2025-11-15

### Added
- Chapter verse counts awareness for accurate range detection
- `maxMatchesPerNode` performance limit (default: 50)
- `maxNodeTextLength` performance limit (default: 10,000 chars)
- Debug mode for troubleshooting tooltip behavior
- Comprehensive error handling for API failures
- Fallback text when verses unavailable

### Improved
- Mobile touch interaction reliability (long-press detection)
- Cache efficiency with LRU (Least Recently Used) algorithm
- Tooltip positioning algorithm for narrow viewports
- Reference detection regex for edge cases
- Performance optimization for large text nodes

### Fixed
- Edge case with overlapping verse ranges (e.g., "John 1:1-3, 1-5")
- Tooltip positioning on narrow viewports (<375px)
- Race condition in API request cancellation
- Memory leak in tooltip cleanup
- iOS Safari scroll-lock issue

---

## [2.5.0] - 2025-11-01

### Added
- Multi-translation support (KJV, ESV, ASV, WEB)
- Translation selector in admin settings
- Aggressive caching with configurable TTL
- Lazy loading for tooltips
- Prefetch mechanism for common verses

### Changed
- Redesigned admin settings page
- Updated tooltip design for better readability
- Improved mobile UX with touch-optimized interactions

### Fixed
- WordPress 6.4 compatibility issues
- PHP 8.2 deprecation warnings
- CSS conflicts with popular themes

---

## [2.0.0] - 2025-09-15

### Added
- Complete rewrite of plugin architecture
- RESTful API integration with PrimeBible.com
- Accessibility improvements (ARIA labels, keyboard navigation)
- Screen reader support
- Configurable tooltip behavior (timing, position, style)

### Changed
- Migrated from inline verse storage to API-based fetching
- Improved regex for Bible reference detection
- Modernized admin UI

### Removed
- Legacy verse database (migrated to API)
- Deprecated shortcode syntax

---

## [1.0.0] - 2025-06-01

### Added
- Initial release
- Auto-detection of Bible references
- Hover-to-view verse tooltips
- Basic admin settings
- KJV translation support
- Mobile-responsive design

---

## Versioning Strategy

We use [Semantic Versioning](https://semver.org/):
- **MAJOR** version: Incompatible API changes
- **MINOR** version: Backward-compatible functionality additions
- **PATCH** version: Backward-compatible bug fixes

## Release Notes

For detailed release notes and migration guides, visit:
- [GitHub Releases](https://github.com/primebible/wordpress-plugin/releases)
- [PrimeBible Documentation](https://primebible.com/docs/wordpress-plugin/changelog)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on reporting bugs and suggesting features.

---

**Made with ❤️ for the global church**  
PrimeBible • A 501(c)(3) Nonprofit Organization
