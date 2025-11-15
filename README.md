# PrimeBible Verse Preview - WordPress Plugin

![License](https://img.shields.io/badge/license-GPL--2.0%2B-blue.svg)
![WordPress](https://img.shields.io/badge/WordPress-5.8%2B-blue.svg)
![PHP](https://img.shields.io/badge/PHP-7.4%2B-blue.svg)

Beautiful, mobile-friendly Bible verse tooltips for WordPress. Auto-detects references and shows instant previews.

[Download from WordPress.org](#) | [Documentation](https://primebible.com/docs/wordpress-plugin) | [Report Bug](https://github.com/primebible/wordpress-plugin/issues) | [Request Feature](https://github.com/primebible/wordpress-plugin/issues)

---

## ✨ Features

- 🔍 **Auto-detection** of Bible references (e.g., "John 3:16", "Romans 8:1-4")
- 📱 **Mobile-optimized** with touch support and long-press
- ⚡ **Lightning fast** - aggressive caching, lazy loading, prefetch
- 🎨 **Fully customizable** - themes, styles, timing, behavior
- 🔒 **Privacy-focused** - no tracking or data collection
- 🌍 **Multiple translations** - KJV, ESV, ASV, WEB, and more
- ♿ **Accessible** - keyboard navigation and screen reader friendly
- 🚀 **Performance** - <50kb, deferred loading, minimal DOM impact

## 📸 Screenshots

### Verse Tooltip
![Verse Tooltip](assets/screenshot-1.png)
*Hover or tap any Bible reference to see an instant verse preview*

### Admin Settings
![Admin Settings](assets/screenshot-2.png)
*Full control over translations, themes, and behavior*

## 🚀 Quick Start

### From WordPress.org (Recommended)

```bash
1. Go to Plugins → Add New in WordPress admin
2. Search "PrimeBible Verse Preview"
3. Click Install → Activate
4. Configure at Settings → PrimeBible
```

### Manual Installation

```bash
1. Download the latest release
2. Upload to /wp-content/plugins/primebible-verse-preview/
3. Activate through WordPress admin
4. Configure settings
```

### From Source (Developers)

```bash
cd /path/to/wordpress/wp-content/plugins
git clone https://github.com/primebible/wordpress-plugin.git primebible-verse-preview
```

## 💡 Usage

Write content naturally with Bible references:

```
Jesus said, "I am the way, the truth, and the life" (John 14:6).
For more context, read Romans 8:1-4 and Ephesians 2:8-9.
```

The references automatically become interactive tooltips. No manual markup required!

## ⚙️ Configuration

Access settings at **Settings → PrimeBible** in WordPress admin.

### Key Options

- **Bible Translation**: Choose from 10+ translations
- **Theme**: Light, dark, or system preference
- **Tooltip Appearance**: Width, position, animations
- **Performance**: Caching, lazy loading, prefetch
- **Per-Post Control**: Disable on specific posts/pages

See [full documentation](https://primebible.com/docs/wordpress-plugin) for all options.

## 🛠️ Development

### Requirements

- PHP 7.4+
- WordPress 5.8+
- Modern browser with ES2020+ support

### File Structure

```
primebible-verse-preview/
├── primebible-verse-preview.php   # Main plugin file
├── readme.txt                      # WordPress.org readme
├── README.md                       # This file
├── LICENSE                         # GPL-2.0+
├── assets/
│   └── js/
│       └── primebible-embed.js    # Frontend script
└── languages/                      # Translations
```

### Local Development

```bash
# Clone the repo
git clone https://github.com/primebible/wordpress-plugin.git

# Create symlink in your WordPress install
ln -s /path/to/repo /path/to/wordpress/wp-content/plugins/primebible-verse-preview

# Activate in WordPress admin
```

### Testing

Test on:
- ✅ Latest WordPress version
- ✅ PHP 7.4, 8.0, 8.1, 8.2
- ✅ Common page builders (Gutenberg, Elementor, Divi)
- ✅ Multiple themes
- ✅ Mobile devices

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

### Ways to Contribute

- 🐛 **Report bugs** via [Issues](https://github.com/primebible/wordpress-plugin/issues)
- 💡 **Suggest features**
- 🔧 **Submit pull requests**
- 🌍 **Translate** into other languages
- 📖 **Improve documentation**

## 📋 Changelog

### [2.5.1] - 2025-11-15

#### Added
- Chapter verse counts awareness for accurate range detection
- `maxMatchesPerNode` and `maxNodeTextLength` performance limits
- Debug mode for troubleshooting

#### Improved
- Mobile touch interaction reliability
- Cache efficiency with LRU algorithm

#### Fixed
- Edge case with overlapping verse ranges
- Tooltip positioning on narrow viewports

See [CHANGELOG.md](CHANGELOG.md) for full version history.

## 📄 License

GPL-2.0-or-later. See [LICENSE](LICENSE) for details.

Free for personal and commercial use. Modify and redistribute as you like.

## 🙏 About PrimeBible

PrimeBible is a **501(c)(3) nonprofit** dedicated to making deep Bible study accessible to everyone.

### Our Free Tools

- 📖 Original language analysis (Hebrew/Greek)
- 📚 Strong's Concordance integration  
- 🔗 Cross-reference explorer
- 📅 Biblical timeline
- ✍️ Scholarly articles on prophecy and theology

**Mission**: Provide free, high-quality Bible study resources to the global church.

[Visit PrimeBible.com](https://primebible.com) • [Donate](https://primebible.com/donate)

## 💬 Support

- **Documentation**: [primebible.com/docs/wordpress-plugin](https://primebible.com/docs/wordpress-plugin)
- **WordPress.org Forum**: [Support Forum](https://wordpress.org/support/plugin/primebible-verse-preview/)
- **GitHub Issues**: [Report Bug](https://github.com/primebible/wordpress-plugin/issues)
- **Email**: support@primebible.com
- **Response Time**: 24-48 hours

We're committed to excellent support. If you have an issue, we'll help you resolve it.

## ⭐ Support the Project

If this plugin blesses your ministry:

- ⭐ Star this repository
- 📝 Leave a [5-star review on WordPress.org](#)
- 📢 Share with other Christian content creators
- 💝 [Donate](https://primebible.com/donate) to support nonprofit Bible tools

---

**Made with ❤️ for the global church**

*PrimeBible • A 501(c)(3) Nonprofit Organization*
