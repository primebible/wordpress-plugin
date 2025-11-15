# Changelog
All notable changes to the PrimeBible Verse Preview WordPress Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- WordPress.org plugin directory submission
- Additional Bible translation support (NIV, NASB, NET)
- Dark mode theme improvements
- Admin dashboard analytics
- Internationalization (i18n) support

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
