=== PrimeBible Verse Preview ===
Contributors: primebible
Donate link: https://primebible.com/donate
Tags: bible, scripture, tooltip, verse, christianity
Requires at least: 5.8
Tested up to: 6.8.3
Requires PHP: 7.4
Stable tag: 2.5.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Automatically detects Bible references and displays beautiful verse previews on hover or tap. Mobile-optimized, fast, and fully customizable.

== Description ==

PrimeBible Verse Preview transforms Bible references in your content into interactive tooltips that display verse text instantly. Perfect for theology blogs, church websites, and Christian content creators.

= Key Features =
* Automatic Detection - Finds Bible references like "John 3:16" or "Romans 8:1-4" in your content
* Multiple Translations - Choose from KJV, ESV, ASV, WEB, and more
* Mobile Optimized - Touch-friendly with long-press support for mobile devices
* Lightning Fast - Aggressive caching, lazy loading, and prefetch optimization
* Fully Customizable - Control appearance, behavior, timing, and styling
* Privacy First - No tracking, no external dependencies beyond the Bible API
* Accessibility - Keyboard navigation and screen reader friendly
* Theme Support - Light, dark, or auto-detect system preference
* Performance - Deferred loading, intersection observer, minimal DOM manipulation

= How It Works =
1.  Install and activate the plugin
2.  Configure your preferred Bible translation and appearance
3.  Write content naturally: "For God so loved the world (John 3:16)"
4.  The reference automatically becomes interactive
5.  Visitors hover or tap to see the verse instantly

= Advanced Features =
* Lazy Scanning - Only processes content when it enters viewport
* Smart Caching - LRU cache with configurable size and expiry
* Per-Post Control - Disable scanning on specific posts/pages via meta box
* Exclude Selectors - Prevent scanning in code blocks, comments, etc.
* CSP Compatible - Support for Content Security Policy nonce
* Chapter Verse Counts - Optional JSON config for accurate verse range detection
* Prefetch - Intelligently preloads nearby references
* Analytics Ready - Optional Google Analytics integration
* Custom CSS - Add your own styles to match your theme

= Perfect For =
* Theology and Bible study blogs
* Church websites and ministries
* Christian authors and writers
* Seminary and Bible college sites
* Devotional and sermon websites
* Christian education platforms

= Technical Highlights =
* No jQuery or external library dependencies
* Modern vanilla JavaScript (ES2020+)
* Deferred script loading for zero blocking
* Intersection Observer API for performance
* Fetch API with retry logic and timeout
* Mobile-first responsive design
* Sub-50kb footprint including all assets

== Installation ==

= Automatic Installation =
1.  Log into your WordPress admin panel
2.  Navigate to 'Plugins → Add New'
3.  Search for "PrimeBible Verse Preview"
4.  Click 'Install Now' and then 'Activate'
5.  Go to 'Settings → PrimeBible' to configure

= Manual Installation =
1.  Download the plugin zip file
2.  Extract to `/wp-content/plugins/primebible-verse-preview/`
3.  Activate through the 'Plugins' menu in WordPress
4.  Configure at 'Settings → PrimeBible'

= After Installation =
1.  Navigate to 'Settings → PrimeBible'
2.  Choose your preferred Bible translation (default: KJV)
3.  Select theme (light/dark/system)
4.  Adjust timing and behavior settings if desired
5.  Save changes and test on a post with Bible references

== Frequently Asked Questions ==

= Is this plugin really free? =
Yes, 100% free with no hidden costs, premium tiers, or upsells. PrimeBible is a 501(c)(3) nonprofit organization making Bible study tools accessible to everyone.

= What Bible translations are available? =
Currently supports: KJV (King James Version), ESV (English Standard Version), ASV (American Standard Version), WEB (World English Bible), and more. Visit primebible.com for the full list.

= Does it work on mobile devices? =
Absolutely. The plugin is mobile-first with touch-optimized interactions including long-press to view verses. Tooltips automatically adjust size and position for small screens.

= Will it slow down my website? =
No. The plugin uses:
-   Deferred script loading (non-blocking)
-   Lazy scanning with Intersection Observer
-   Aggressive caching with LRU eviction
-   Minimal DOM manipulation
-   No external library dependencies
Total impact: <50kb and processes only visible content.

= Can I customize the appearance? =
Yes. You can:
-   Choose light, dark, or system theme
-   Adjust tooltip width for desktop and mobile
-   Add custom CSS in the settings panel
-   Control whether to show reference header and footer branding
-   Enable/disable animations

= How do I disable scanning on a specific post? =
Edit the post and look for the 'PrimeBible Verse Preview' meta box in the sidebar (usually on the right). Check "Disable PrimeBible scanning on this content" and save.

= Can I exclude certain elements from scanning? =
Yes. By default, these elements are excluded: `script`, `style`, `noscript`, `iframe`, `textarea`, `code`, `pre`, `.pbv-no-scan`
You can customize this list in 'Settings → PrimeBible → Exclude selectors'.
You can also add the class `pbv-no-scan` to any HTML element to prevent scanning inside it.

= Does it collect user data or track visitors? =
No. The plugin is privacy-focused and doesn't collect, store, or transmit any user data except Bible verse API requests to primebible.com (which are not logged or tracked).
Optional: You can enable Google Analytics event tracking in settings if you use GA on your site.

= What happens if the API is down? =
The plugin includes:
-   Configurable timeout (default: 8 seconds)
-   Automatic retry logic (default: 2 retries)
-   Graceful fallback (tooltip shows "Unable to load verse")
-   Error handling that doesn't break your page

= Can I use this with page builders? =
Yes. Works with:
-   Gutenberg (WordPress block editor)
-   Classic Editor
-   Elementor
-   Beaver Builder
-   Divi Builder
-   WPBakery
-   And most other page builders

= Does it support custom post types? =
Yes. In 'Settings → PrimeBible → Post types', you can select which post types should have the meta box and be scanned when using "singular only" mode.

= What if I need help? =
1.  Check this FAQ
2.  Visit the [Support Forum](https://wordpress.org/support/plugin/primebible-verse-preview/)
3.  Read documentation at primebible.com/docs
4.  Contact support at support@primebible.com

= Can I contribute or request features? =
Absolutely! The plugin is GPL-licensed. You can:
-   Submit bug reports and feature requests on the support forum
-   Contribute code via GitHub (link in plugin header)
-   Suggest improvements
-   Translate into other languages

== Screenshots ==
1.  Verse Tooltip - Beautiful hover preview showing John 3:16 with reference header and verse text
2.  Admin Settings Page - Full control over translations, themes, performance, and behavior
3.  Mobile View - Touch-optimized tooltip perfectly sized for phones and tablets
4.  Per-Post Control - Meta box to disable scanning on specific posts
5.  Dark Theme - System-aware dark mode for night reading
6.  Advanced Settings - Performance tuning, caching, timing controls

== Changelog ==

= 2.5.1 - 2025-11-15 =
* Added: Chapter verse counts awareness for accurate range detection
* Added: `maxMatchesPerNode` and `maxNodeTextLength` performance limits
* Added: Debug mode for troubleshooting
* Improved: Mobile touch interaction reliability
* Improved: Cache efficiency with LRU algorithm
* Fixed: Edge case with overlapping verse ranges
* Fixed: Tooltip positioning on narrow viewports

= 2.0.0 - 2025-10-01 =
* Major: Complete rewrite for performance and reliability
* Added: Lazy scanning with Intersection Observer
* Added: Smart prefetch for nearby references
* Added: Configurable caching with expiry
* Added: Per-post disable meta box
* Added: Custom CSS support
* Added: CSP nonce compatibility
* Added: Load scope (everywhere vs singular only)
* Added: Post type selection
* Added: Exclude selectors configuration
* Improved: Mobile interactions with long-press
* Improved: Tooltip positioning algorithm
* Improved: Error handling and retry logic
* Changed: Migrated from inline styles to dynamic style injection
* Changed: Settings UI overhaul for better UX
* Performance: 40% faster initial scan
* Performance: 60% reduction in memory usage

= 1.5.0 - 2025-08-15 =
* Added: Multiple translation support
* Added: Theme selection (light/dark/system)
* Added: Animation controls
* Improved: Tooltip positioning on mobile
* Fixed: Conflict with certain themes

= 1.0.0 - 2025-06-01 =
* Initial release
* Auto-detection of Bible references
* KJV translation support
* Basic tooltip functionality
* Admin settings panel

== Upgrade Notice ==

= 2.5.1 =
Recommended update: Performance improvements, counts-aware detection, and mobile enhancements. Fully backward compatible.

= 2.0.0 =
Major update with significant performance improvements, lazy scanning, and enhanced customization. Recommended for all users. Settings will be preserved but please review new options.

= 1.5.0 =
Adds multiple translations and theme support. Your existing settings will be preserved.

== Additional Info ==

= About PrimeBible =
PrimeBible is a 501(c)(3) nonprofit organization dedicated to making deep Bible study accessible to everyone. Our platform provides free tools including:
* Hebrew and Greek original language analysis
* Strong's Concordance integration
* Cross-reference explorer
* Biblical timeline
* Scholarly articles on messianic prophecy, textual criticism, and theology
Learn more at [primebible.com](https://primebible.com)

= Support the Mission =
This plugin is free and always will be. If it blesses your ministry, consider:
* Leaving a 5-star review
* Sharing with other Christian content creators
* Donating to support nonprofit Bible study tools at primebible.com/donate

= Credits =
Developed by the PrimeBible team with love for the global church.
Special thanks to the WordPress community and all beta testers who provided feedback.

== Privacy Policy ==
Data Collection: This plugin does not collect, store, or transmit any personal data about your visitors.

API Requests: When a verse tooltip is displayed, the plugin fetches verse text from primebible.com's API. These requests include:
-   The Bible reference (e.g., "John 3:16")
-   The requested translation (e.g., "KJV")

No Tracking: PrimeBible does not log IP addresses, track user behavior, or use cookies from these API requests.

Optional Analytics: If you enable the analytics setting, the plugin will fire a Google Analytics event when a tooltip is opened (if GA is already installed on your site). This is disabled by default.

Third-Party Services: The plugin connects to primebible.com's API to fetch verse text. No other third-party services are used.
For more information, see the [PrimeBible Privacy Policy](https://primebible.com/privacy).

== Copyright and Licensing ==
PrimeBible Verse Preview is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

Bible translations are subject to their respective copyright holders. PrimeBible provides access to public domain translations and those licensed for free distribution.

== Developer Notes ==

= Hooks and Filters =

Filter: `primebible_config`
Modify the JavaScript configuration before it's output.

 add_filter('primebible_config', function($config) {
     $config['translation'] = 'ESV';
     $config['theme'] = 'dark';
     return $config;
 });

Action: `primebible_before_enqueue`
Runs before scripts are enqueued (if loading conditions are met).

 add_action('primebible_before_enqueue', function() {
     // Your code here
 });

= Programmatic Control =

Disable on specific page by template:

 add_filter('primebible_should_load', function($should_load) {
     if (is_page_template('template-landing.php')) {
         return false;
     }
     return $should_load;
 });

= GitHub Repository =
Development happens on GitHub: [github.com/primebible/wordpress-plugin](https://github.com/primebible/wordpress-plugin)
Contributions welcome:
-   Bug reports
-   Feature requests
-   Pull requests
-   Documentation improvements



== Support ==
Documentation: [primebible.com/docs/wordpress-plugin](https://primebible.com/docs/wordpress-plugin)
Support Forum: [wordpress.org/support/plugin/primebible-verse-preview](https://wordpress.org/support/plugin/primebible-verse-preview)
Email: support@primebible.com
Average Response Time: 24-48 hours

We're committed to excellent support. If you have an issue, we'll help you resolve it.
