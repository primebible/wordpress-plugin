# Contributing to PrimeBible Verse Preview

Thank you for your interest in contributing to PrimeBible's WordPress plugin! As a **501(c)(3) nonprofit**, we rely on volunteer contributors to make deep Bible study accessible to everyone.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Community](#community)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you agree to uphold this code. Please report unacceptable behavior to support@primebible.com.

**Expected Behavior:**
- Be respectful and inclusive
- Focus on what's best for the global church community
- Accept constructive criticism gracefully
- Show empathy toward other contributors

---

## How Can I Contribute?

### 1. Report Bugs

Found a bug? Help us fix it!

**Before Reporting:**
- Check [existing issues](https://github.com/primebible/wordpress-plugin/issues) to avoid duplicates
- Test with WordPress 5.8+ and PHP 7.4+
- Disable other plugins to isolate the issue

**Bug Report Should Include:**
- Clear, descriptive title
- Steps to reproduce
- Expected vs. actual behavior
- WordPress version, PHP version, browser
- Screenshots/screen recordings (if applicable)
- Console errors (if any)

### 2. Suggest Features

Have an idea? We'd love to hear it!

**Feature Requests Should Include:**
- Problem statement (what pain point does this solve?)
- Proposed solution
- Alternative solutions considered
- Impact on performance/usability

### 3. Improve Documentation

- Fix typos or unclear instructions
- Add usage examples
- Translate to other languages
- Write tutorials or guides

### 4. Write Code

- Fix bugs
- Implement features
- Optimize performance
- Add tests

---

## Getting Started

### Prerequisites

- **Local WordPress Environment**: [LocalWP](https://localwp.com/), [XAMPP](https://www.apachefriends.org/), or [Docker](https://www.docker.com/)
- **PHP**: 7.4 or higher
- **WordPress**: 5.8 or higher
- **Git**: For version control

### Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/wordpress-plugin.git
cd wordpress-plugin

# 3. Create a symlink in your WordPress plugins directory
ln -s /path/to/wordpress-plugin /path/to/wordpress/wp-content/plugins/primebible-verse-preview

# 4. Activate the plugin in WordPress admin
```

---

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/doc-name` - Documentation changes

### Workflow

```bash
# 1. Create a new branch
git checkout -b feature/awesome-feature

# 2. Make your changes
# ... code code code ...

# 3. Commit with descriptive messages
git commit -m "feat: Add awesome new feature

Detailed description of what changed and why.
References #123"

# 4. Push to your fork
git push origin feature/awesome-feature

# 5. Open a Pull Request on GitHub
```

---

## Coding Standards

### PHP Standards

**Follow WordPress Coding Standards:**
- [WordPress PHP Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/)
- Use `snake_case` for functions and variables
- Use `PascalCase` for classes
- Prefix all global functions/classes with `primebible_`

**Example:**
```php
<?php
function primebible_get_verse( $reference ) {
    // Function code
}

class PrimeBible_Tooltip {
    // Class code
}
?>
```

### JavaScript Standards

- Use ES6+ syntax
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use `camelCase` for variables and functions
- Add JSDoc comments for functions

**Example:**
```javascript
/**
 * Fetches verse text from API
 * @param {string} reference - Bible reference (e.g., "John 3:16")
 * @returns {Promise<string>} Verse text
 */
async function fetchVerse(reference) {
  // Function code
}
```

### CSS Standards

- Use BEM methodology
- Prefix classes with `pb-` (PrimeBible)
- Mobile-first responsive design

**Example:**
```css
.pb-tooltip { }
.pb-tooltip__header { }
.pb-tooltip__body { }
.pb-tooltip--dark { }
```

---

## Submitting Changes

### Pull Request Guidelines

**Before Submitting:**
- ✅ Test thoroughly (multiple browsers, devices)
- ✅ Follow coding standards
- ✅ Update documentation if needed
- ✅ Add/update tests if applicable
- ✅ Ensure no console errors

**Pull Request Template:**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on WordPress 5.8+
- [ ] Tested on PHP 7.4+
- [ ] Tested on mobile devices
- [ ] No console errors

## Screenshots
(if applicable)

## Related Issues
Fixes #123
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add new translation support
fix: Resolve tooltip positioning bug
docs: Update installation instructions
style: Format code according to standards
refactor: Simplify API request logic
test: Add unit tests for verse detection
chore: Update dependencies
```

---

## Community

### Where to Get Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Email**: support@primebible.com
- **Documentation**: https://primebible.com/docs/wordpress-plugin

### Recognition

All contributors are recognized in:
- Repository contributors page
- Annual impact reports
- Plugin credits

We deeply appreciate every contribution, no matter how small!

---

## License

By contributing, you agree that your contributions will be licensed under the **GPL-2.0-or-later** license, same as this project.

---

**Thank you for helping us make Bible study accessible to everyone!**

PrimeBible • A 501(c)(3) Nonprofit Organization
