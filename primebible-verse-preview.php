<?php
/**
 * Plugin Name: PrimeBible Verse Preview
 * Plugin URI: https://github.com/primebible/wordpress-plugin
 * Description: Auto-detects Bible references in your content and shows a beautiful, mobile-friendly tooltip preview powered by PrimeBible. Includes admin settings, caching controls, per-post disable, and counts-aware expansion.
 * Version: 2.5.1
 * Author: PrimeBible
 * Author URI: https://primebible.com
 * License: GPL-2.0+
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: primebible-verse-preview
 */

if (!defined('ABSPATH')) {
  exit;
}

if (!class_exists('PrimeBible_Verse_Preview')) {
  final class PrimeBible_Verse_Preview {
    const VERSION = '2.5.1';
    const OPTION  = 'primebible_settings';
    const META_DISABLE = '_primebible_disable';
    const HANDLER = 'primebible-embed';

    private static $instance = null;

    public static function instance() {
      if (self::$instance === null) {
        self::$instance = new self();
      }
      return self::$instance;
    }

    private function __construct() {
      register_activation_hook(__FILE__, array($this, 'activate'));
      add_action('admin_menu', array($this, 'admin_menu'));
      add_action('admin_init', array($this, 'register_settings'));
      add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
      add_action('wp_enqueue_scripts', array($this, 'enqueue'));
      add_filter('script_loader_tag', array($this, 'add_defer_attribute'), 10, 3);

      // Per-post disable
      add_action('add_meta_boxes', array($this, 'add_metabox'));
      add_action('save_post', array($this, 'save_metabox'));
    }

    public function activate() {
      if (get_option(self::OPTION) === false) {
        add_option(self::OPTION, $this->default_settings());
      } else {
        // Merge new defaults on upgrade
        $merged = array_merge($this->default_settings(), get_option(self::OPTION, array()));
        update_option(self::OPTION, $merged);
      }
    }

    private function default_settings() {
      return array(
        // Loading scope
        'load_scope' => 'everywhere',
        'post_types' => array('post', 'page'),
        'load_in_admin' => 0,

        // JS config mirrors
        'apiUrl' => 'https://primebible.com/api/verse-preview',
        'translation' => 'KJV',
        'theme' => 'system',
        'position' => 'auto',
        'maxWidth' => 420,
        'mobileMaxWidth' => 340,
        'showReference' => 1,
        'showFooter' => 1,
        'customStyles' => '',
        'hoverDelayMs' => 200,
        'longPressMs' => 400,
        'hideDelayMs' => 150,
        'excludeSelectors' => array('script','style','noscript','iframe','textarea','code','pre','.pbv-no-scan'),
        'enableAnimations' => 1,
        'mobileOptimized' => 1,
        'prefetch' => 1,
        'maxCacheSize' => 100,
        'cacheExpiry' => 3600000,
        'analytics' => 0,
        'timeoutMs' => 8000,
        'retries' => 2,
        'maxConcurrentFetches' => 4,
        'styleNonce' => '',
        'lazyScan' => 1,

        // New in 2.5.x
        'maxMatchesPerNode' => 50,
        'maxNodeTextLength' => 12000,
        'chapterVerseCounts' => array(),
        'debug' => 0,
      );
    }

    public function admin_menu() {
      add_options_page(
        'PrimeBible Verse Preview',
        'PrimeBible',
        'manage_options',
        'primebible-verse-preview',
        array($this, 'render_settings_page')
      );
    }

    public function admin_enqueue_scripts($hook) {
      if ('settings_page_primebible-verse-preview' !== $hook) {
        return;
      }
      
      wp_enqueue_style(
        'primebible-admin',
        plugins_url('assets/css/admin.css', __FILE__),
        array(),
        self::VERSION
      );
    }

    public function register_settings() {
      register_setting(
        'primebible_options_group',
        self::OPTION,
        array('sanitize_callback' => array($this, 'sanitize_settings'))
      );
    }

    private function yesno($val) {
      return !empty($val) ? 1 : 0;
    }

    private function normalize_exclude_selectors($raw) {
      if (is_array($raw)) {
        $arr = $raw;
      } else {
        $arr = preg_split('/[\r\n,]+/', (string)$raw);
      }
      $out = array();
      foreach ($arr as $s) {
        $s = trim((string)$s);
        if ($s !== '') {
          $out[] = $s;
        }
      }
      if (empty($out)) {
        $out = $this->default_settings()['excludeSelectors'];
      }
      return array_values(array_unique($out));
    }

    private function decode_counts_json($raw, &$errorMsg) {
      $errorMsg = '';
      $raw = trim((string)$raw);
      if ($raw === '') {
        return array();
      }
      $decoded = json_decode($raw, true);
      if (!is_array($decoded)) {
        $errorMsg = 'Invalid JSON for chapter verse counts. Value ignored.';
        return array();
      }
      foreach ($decoded as $book => $chapters) {
        if (!is_array($chapters)) {
          $errorMsg = 'chapterVerseCounts must be an object of { "Book": { "1": 31, "2": 25 } }.';
          return array();
        }
        foreach ($chapters as $ch => $count) {
          if (!is_numeric($count)) {
            $errorMsg = 'Verse counts must be numbers.';
            return array();
          }
        }
      }
      return $decoded;
    }

    public function sanitize_settings($in) {
      $d = $this->default_settings();
      $out = array();

      $out['load_scope'] = isset($in['load_scope']) && in_array($in['load_scope'], array('everywhere','singular_only'), true) ? $in['load_scope'] : $d['load_scope'];

      $out['post_types'] = array();
      if (!empty($in['post_types']) && is_array($in['post_types'])) {
        foreach ($in['post_types'] as $pt) {
          $pt = sanitize_key($pt);
          if ($pt) $out['post_types'][] = $pt;
        }
      }
      if (empty($out['post_types'])) {
        $out['post_types'] = $d['post_types'];
      }

      $out['load_in_admin'] = $this->yesno($in['load_in_admin'] ?? 0);

      $out['apiUrl'] = esc_url_raw($in['apiUrl'] ?? $d['apiUrl']);
      $out['translation'] = sanitize_text_field($in['translation'] ?? $d['translation']);
      $out['theme'] = in_array(($in['theme'] ?? ''), array('system','light','dark'), true) ? $in['theme'] : $d['theme'];
      $out['position'] = in_array(($in['position'] ?? ''), array('auto','top','bottom'), true) ? $in['position'] : $d['position'];

      $out['maxWidth'] = absint($in['maxWidth'] ?? $d['maxWidth']);
      $out['mobileMaxWidth'] = absint($in['mobileMaxWidth'] ?? $d['mobileMaxWidth']);

      $out['showReference'] = $this->yesno($in['showReference'] ?? $d['showReference']);
      $out['showFooter'] = $this->yesno($in['showFooter'] ?? $d['showFooter']);

      $out['customStyles'] = wp_kses_post($in['customStyles'] ?? '');

      $out['hoverDelayMs'] = absint($in['hoverDelayMs'] ?? $d['hoverDelayMs']);
      $out['longPressMs'] = absint($in['longPressMs'] ?? $d['longPressMs']);
      $out['hideDelayMs'] = absint($in['hideDelayMs'] ?? $d['hideDelayMs']);

      $out['excludeSelectors'] = $this->normalize_exclude_selectors($in['excludeSelectors'] ?? $d['excludeSelectors']);

      $out['enableAnimations'] = $this->yesno($in['enableAnimations'] ?? $d['enableAnimations']);
      $out['mobileOptimized'] = $this->yesno($in['mobileOptimized'] ?? $d['mobileOptimized']);
      $out['prefetch'] = $this->yesno($in['prefetch'] ?? $d['prefetch']);

      $out['maxCacheSize'] = absint($in['maxCacheSize'] ?? $d['maxCacheSize']);
      $out['cacheExpiry'] = absint($in['cacheExpiry'] ?? $d['cacheExpiry']);

      $out['analytics'] = $this->yesno($in['analytics'] ?? $d['analytics']);

      $out['timeoutMs'] = absint($in['timeoutMs'] ?? $d['timeoutMs']);
      $out['retries'] = absint($in['retries'] ?? $d['retries']);
      $out['maxConcurrentFetches'] = absint($in['maxConcurrentFetches'] ?? $d['maxConcurrentFetches']);

      $styleNonce = sanitize_text_field($in['styleNonce'] ?? '');
      $out['styleNonce'] = $styleNonce;

      $out['lazyScan'] = $this->yesno($in['lazyScan'] ?? $d['lazyScan']);

      $out['maxMatchesPerNode'] = max(1, absint($in['maxMatchesPerNode'] ?? $d['maxMatchesPerNode']));
      $out['maxNodeTextLength'] = max(1000, absint($in['maxNodeTextLength'] ?? $d['maxNodeTextLength']));
      $out['debug'] = $this->yesno($in['debug'] ?? $d['debug']);

      $countsError = '';
      $out['chapterVerseCounts'] = $this->decode_counts_json($in['chapterVerseCounts'] ?? '', $countsError);
      if ($countsError) {
        add_settings_error('primebible-verse-preview', 'chapterVerseCounts', $countsError, 'error');
      }

      return $out;
    }

    private function get_settings() {
      $opts = get_option(self::OPTION);
      if (!is_array($opts)) {
        $opts = $this->default_settings();
      } else {
        $opts = array_merge($this->default_settings(), $opts);
      }
      return $opts;
    }

    public function enqueue() {
      if (is_admin() && !$this->get_settings()['load_in_admin']) {
        return;
      }

      $scope = $this->get_settings()['load_scope'];
      if ($scope === 'singular_only' && !is_singular()) {
        return;
      }

      if (is_singular()) {
        $post = get_queried_object();
        if ($post && isset($post->ID)) {
          $allowed_types = $this->get_settings()['post_types'];
          if (!in_array($post->post_type, $allowed_types, true)) {
            return;
          }
          $disabled = get_post_meta($post->ID, self::META_DISABLE, true);
          if (!empty($disabled)) {
            return;
          }
        }
      }

      $debug = defined('SCRIPT_DEBUG') && SCRIPT_DEBUG;

      $base_rel = 'assets/js/primebible-embed.js';
      $min_rel  = 'assets/js/primebible-embed.min.js';

      $base_abs = plugin_dir_path(__FILE__) . $base_rel;
      $min_abs  = plugin_dir_path(__FILE__) . $min_rel;

      $use_min = !$debug && file_exists($min_abs);
      $rel     = $use_min ? $min_rel : $base_rel;
      $abs     = $use_min ? $min_abs : $base_abs;

      $handle = self::HANDLER;
      $src    = plugins_url($rel, __FILE__);

      $ver    = file_exists($abs) ? (string) filemtime($abs) : self::VERSION;

      wp_enqueue_script($handle, $src, array(), $ver, true);

      $config = $this->build_js_config();
      $config = apply_filters('primebible_config', $config);
      $inline = 'window.PrimeBibleConfig = ' . wp_json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ';';
      wp_add_inline_script($handle, $inline, 'before');

      $opts = $this->get_settings();
      if (!empty($opts['customStyles'])) {
        $css = trim($opts['customStyles']);
        if ($css !== '') {
          $after = '(function(){try{var s=document.createElement("style");s.id="pbv-custom-styles";s.textContent=' . wp_json_encode($css) . ';document.head.appendChild(s);}catch(e){}})();';
          wp_add_inline_script($handle, $after, 'after');
        }
      }
    }

    private function build_js_config() {
      $o = $this->get_settings();
      return array(
        'apiUrl' => (string)$o['apiUrl'],
        'translation' => (string)$o['translation'],
        'theme' => (string)$o['theme'],
        'position' => (string)$o['position'],
        'maxWidth' => (int)$o['maxWidth'],
        'mobileMaxWidth' => (int)$o['mobileMaxWidth'],
        'showReference' => (bool)$o['showReference'],
        'showFooter' => (bool)$o['showFooter'],
        'customStyles' => (string)$o['customStyles'],
        'hoverDelayMs' => (int)$o['hoverDelayMs'],
        'longPressMs' => (int)$o['longPressMs'],
        'hideDelayMs' => (int)$o['hideDelayMs'],
        'excludeSelectors' => array_values(array_map('strval', (array)$o['excludeSelectors'])),
        'onError' => null,
        'enableAnimations' => (bool)$o['enableAnimations'],
        'mobileOptimized' => (bool)$o['mobileOptimized'],
        'prefetch' => (bool)$o['prefetch'],
        'maxCacheSize' => (int)$o['maxCacheSize'],
        'cacheExpiry' => (int)$o['cacheExpiry'],
        'analytics' => (bool)$o['analytics'],
        'timeoutMs' => (int)$o['timeoutMs'],
        'retries' => (int)$o['retries'],
        'maxConcurrentFetches' => (int)$o['maxConcurrentFetches'],
        'styleNonce' => $o['styleNonce'] !== '' ? (string)$o['styleNonce'] : null,
        'lazyScan' => (bool)$o['lazyScan'],
        'maxMatchesPerNode' => (int)$o['maxMatchesPerNode'],
        'maxNodeTextLength' => (int)$o['maxNodeTextLength'],
        'chapterVerseCounts' => !empty($o['chapterVerseCounts']) ? $o['chapterVerseCounts'] : null,
        'debug' => (bool)$o['debug'],
      );
    }

    public function add_defer_attribute($tag, $handle, $src) {
      if ($handle === self::HANDLER) {
        if (strpos($tag, ' defer ') === false) {
          $tag = str_replace('<script ', '<script defer ', $tag);
        }
      }
      return $tag;
    }

    public function add_metabox() {
      $opts = $this->get_settings();
      $pts = is_array($opts['post_types']) ? $opts['post_types'] : array('post','page');

      foreach ($pts as $pt) {
        add_meta_box(
          'primebible_metabox',
          'PrimeBible Verse Preview',
          array($this, 'render_metabox'),
          $pt,
          'side',
          'default'
        );
      }
    }

    public function render_metabox($post) {
      wp_nonce_field('primebible_metabox_nonce', 'primebible_metabox_nonce_field');
      $disabled = get_post_meta($post->ID, self::META_DISABLE, true);
      ?>
      <div style="padding: 8px 0;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" name="primebible_disable" value="1" <?php checked(!empty($disabled)); ?> style="margin: 0;" />
          <span>Disable verse preview on this content</span>
        </label>
        <p style="margin: 12px 0 0; padding: 12px; background: #f6f7f7; border-left: 3px solid #2271b1; font-size: 13px; line-height: 1.5;">
          <strong>Tip:</strong> Add class <code style="background: white; padding: 2px 6px; border-radius: 3px;">pbv-no-scan</code> to any element to exclude it from scanning.
        </p>
      </div>
      <?php
    }

    public function save_metabox($post_id) {
      if (!isset($_POST['primebible_metabox_nonce_field'])) {
        return;
      }

      $primebible_nonce = sanitize_text_field(wp_unslash($_POST['primebible_metabox_nonce_field']));
      if (!wp_verify_nonce($primebible_nonce, 'primebible_metabox_nonce')) {
        return;
      }
      if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
      }

      if (!current_user_can('edit_post', $post_id)) {
        return;
      }
      $val = isset($_POST['primebible_disable']) ? '1' : '';
      if ($val === '1') {
        update_post_meta($post_id, self::META_DISABLE, '1');
      } else {
        delete_post_meta($post_id, self::META_DISABLE);
      }
    }

    public function render_settings_page() {
      if (!current_user_can('manage_options')) {
        return;
      }
      $o = $this->get_settings();
      $available_post_types = get_post_types(array('public' => true), 'objects');
      ?>
      <div class="wrap pbv-admin-wrap">
        <div class="pbv-header">
          <div class="pbv-header-content">
            <h1 class="pbv-title">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                <rect width="32" height="32" rx="6" fill="#2271B1"/>
                <path d="M8 9C8 8.44772 8.44772 8 9 8H15C15.5523 8 16 8.44772 16 9V23C16 23.5523 15.5523 24 15 24H9C8.44772 24 8 23.5523 8 23V9Z" fill="white"/>
                <path d="M17 9C17 8.44772 17.4477 8 18 8H23C23.5523 8 24 8.44772 24 9V23C24 23.5523 23.5523 24 23 24H18C17.4477 24 17 23.5523 17 23V9Z" fill="white"/>
              </svg>
              PrimeBible Verse Preview
            </h1>
            <p class="pbv-subtitle">Automatically detect and preview Bible verses with beautiful tooltips</p>
          </div>
          <div class="pbv-header-badge">
            <span class="pbv-version">Version <?php echo esc_html(self::VERSION); ?></span>
          </div>
        </div>

        <?php settings_errors(); ?>

        <div class="pbv-container">
          <nav class="pbv-nav">
            <button type="button" class="pbv-nav-item active" data-section="general">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.5C6.41 3.5 3.5 6.41 3.5 10C3.5 13.59 6.41 16.5 10 16.5C13.59 16.5 16.5 13.59 16.5 10C16.5 6.41 13.59 3.5 10 3.5ZM10 15C7.24 15 5 12.76 5 10C5 7.24 7.24 5 10 5C12.76 5 15 7.24 15 10C15 12.76 12.76 15 10 15Z"/>
              </svg>
              General Settings
            </button>
            <button type="button" class="pbv-nav-item" data-section="appearance">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C10.76 18 11.5 17.88 12.18 17.66L10.41 13.71C9.96 13.89 9.49 14 9 14C6.79 14 5 12.21 5 10C5 7.79 6.79 6 9 6C11.21 6 13 7.79 13 10C13 10.49 12.89 10.96 12.71 11.41L16.66 13.18C17.88 11.92 18 10.76 18 10C18 5.58 14.42 2 10 2Z"/>
              </svg>
              Appearance
            </button>
            <button type="button" class="pbv-nav-item" data-section="behavior">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6C10.55 6 11 5.55 11 5C11 4.45 10.55 4 10 4C9.45 4 9 4.45 9 5C9 5.55 9.45 6 10 6ZM10 8C9.45 8 9 8.45 9 9V15C9 15.55 9.45 16 10 16C10.55 16 11 15.55 11 15V9C11 8.45 10.55 8 10 8Z"/>
              </svg>
              Behavior
            </button>
            <button type="button" class="pbv-nav-item" data-section="performance">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8L12 11L10 9L5 14H15V8ZM3 6V16C3 17.1 3.9 18 5 18H17C17.55 18 18 17.55 18 17C18 16.45 17.55 16 17 16H5V6C5 5.45 4.55 5 4 5C3.45 5 3 5.45 3 6Z"/>
              </svg>
              Performance
            </button>
            <button type="button" class="pbv-nav-item" data-section="advanced">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15.95 10.78C15.98 10.53 16 10.27 16 10C16 9.73 15.98 9.47 15.95 9.22L17.63 7.9C17.78 7.78 17.82 7.56 17.72 7.39L16.14 4.61C16.04 4.44 15.82 4.38 15.64 4.44L13.66 5.24C13.25 4.93 12.81 4.67 12.32 4.47L12.01 2.4C11.98 2.21 11.82 2.06 11.63 2.06H8.37C8.18 2.06 8.02 2.21 7.99 2.4L7.68 4.47C7.19 4.67 6.75 4.93 6.34 5.24L4.36 4.44C4.18 4.38 3.96 4.44 3.86 4.61L2.28 7.39C2.18 7.56 2.22 7.78 2.37 7.9L4.05 9.22C4.02 9.47 4 9.73 4 10C4 10.27 4.02 10.53 4.05 10.78L2.37 12.1C2.22 12.22 2.18 12.44 2.28 12.61L3.86 15.39C3.96 15.56 4.18 15.62 4.36 15.56L6.34 14.76C6.75 15.07 7.19 15.33 7.68 15.53L7.99 17.6C8.02 17.79 8.18 17.94 8.37 17.94H11.63C11.82 17.94 11.98 17.79 12.01 17.6L12.32 15.53C12.81 15.33 13.25 15.07 13.66 14.76L15.64 15.56C15.82 15.62 16.04 15.56 16.14 15.39L17.72 12.61C17.82 12.44 17.78 12.22 17.63 12.1L15.95 10.78ZM10 13C8.35 13 7 11.65 7 10C7 8.35 8.35 7 10 7C11.65 7 13 8.35 13 10C13 11.65 11.65 13 10 13Z"/>
              </svg>
              Advanced
            </button>
          </nav>

          <div class="pbv-content">
            <form method="post" action="options.php" novalidate>
              <?php settings_fields('primebible_options_group'); ?>

              <!-- General Settings -->
              <div class="pbv-section active" id="section-general">
                <div class="pbv-section-header">
                  <h2>General Settings</h2>
                  <p>Configure where and how the plugin loads on your site</p>
                </div>

                <div class="pbv-card">
                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label for="load_scope" class="pbv-label">
                        Load Scope
                        <span class="pbv-label-description">Choose where the plugin should be active</span>
                      </label>
                      <select id="load_scope" name="<?php echo esc_attr(self::OPTION); ?>[load_scope]" class="pbv-select">
                        <option value="everywhere" <?php selected($o['load_scope'], 'everywhere'); ?>>Everywhere (all front-end pages)</option>
                        <option value="singular_only" <?php selected($o['load_scope'], 'singular_only'); ?>>Only on single posts/pages</option>
                      </select>
                    </div>
                  </div>

                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label class="pbv-label">
                        Post Types
                        <span class="pbv-label-description">Select which content types to enable verse preview on</span>
                      </label>
                      <div class="pbv-checkbox-group">
                        <?php foreach ($available_post_types as $pt => $obj): ?>
                          <label class="pbv-checkbox-label">
                            <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[post_types][]" value="<?php echo esc_attr($pt); ?>" <?php checked(in_array($pt, (array)$o['post_types'], true)); ?> />
                            <span><?php echo esc_html($obj->labels->singular_name); ?></span>
                          </label>
                        <?php endforeach; ?>
                      </div>
                    </div>
                  </div>

                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label class="pbv-switch-label">
                        <input type="checkbox" id="load_in_admin" name="<?php echo esc_attr(self::OPTION); ?>[load_in_admin]" value="1" <?php checked(!empty($o['load_in_admin'])); ?> class="pbv-switch" />
                        <span class="pbv-switch-slider"></span>
                        <span class="pbv-switch-text">
                          <strong>Load in Admin Dashboard</strong>
                          <small>Enable verse preview in wp-admin (usually not needed)</small>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="pbv-card">
                  <div class="pbv-card-header">
                    <h3>API Configuration</h3>
                  </div>
                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label for="apiUrl" class="pbv-label">API URL</label>
                      <input type="url" id="apiUrl" name="<?php echo esc_attr(self::OPTION); ?>[apiUrl]" value="<?php echo esc_attr($o['apiUrl']); ?>" class="pbv-input" />
                    </div>
                  </div>

                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label for="translation" class="pbv-label">
                        Bible Translation
                        <span class="pbv-label-description">Default translation to use (e.g., KJV, NIV, ESV)</span>
                      </label>
                      <input type="text" id="translation" name="<?php echo esc_attr(self::OPTION); ?>[translation]" value="<?php echo esc_attr($o['translation']); ?>" class="pbv-input" placeholder="KJV" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Appearance -->
              <div class="pbv-section" id="section-appearance">
                <div class="pbv-section-header">
                  <h2>Appearance</h2>
                  <p>Customize the visual design of your verse tooltips</p>
                </div>

                <div class="pbv-card">
                  <div class="pbv-card-row pbv-row-split">
                    <div class="pbv-field">
                      <label for="theme" class="pbv-label">Theme</label>
                      <select id="theme" name="<?php echo esc_attr(self::OPTION); ?>[theme]" class="pbv-select">
                        <option value="system" <?php selected($o['theme'], 'system'); ?>>System (Auto)</option>
                        <option value="light" <?php selected($o['theme'], 'light'); ?>>Light</option>
                        <option value="dark" <?php selected($o['theme'], 'dark'); ?>>Dark</option>
                      </select>
                    </div>

                    <div class="pbv-field">
                      <label for="position" class="pbv-label">Tooltip Position</label>
                      <select id="position" name="<?php echo esc_attr(self::OPTION); ?>[position]" class="pbv-select">
                        <option value="auto" <?php selected($o['position'], 'auto'); ?>>Auto</option>
                        <option value="top" <?php selected($o['position'], 'top'); ?>>Top</option>
                        <option value="bottom" <?php selected($o['position'], 'bottom'); ?>>Bottom</option>
                      </select>
                    </div>
                  </div>

                  <div class="pbv-card-row pbv-row-split">
                    <div class="pbv-field">
                      <label for="maxWidth" class="pbv-label">Max Width (Desktop)</label>
                      <div class="pbv-input-group">
                        <input type="number" id="maxWidth" name="<?php echo esc_attr(self::OPTION); ?>[maxWidth]" value="<?php echo esc_attr($o['maxWidth']); ?>" min="200" step="10" class="pbv-input" />
                        <span class="pbv-input-suffix">px</span>
                      </div>
                    </div>

                    <div class="pbv-field">
                      <label for="mobileMaxWidth" class="pbv-label">Max Width (Mobile)</label>
                      <div class="pbv-input-group">
                        <input type="number" id="mobileMaxWidth" name="<?php echo esc_attr(self::OPTION); ?>[mobileMaxWidth]" value="<?php echo esc_attr($o['mobileMaxWidth']); ?>" min="200" step="10" class="pbv-input" />
                        <span class="pbv-input-suffix">px</span>
                      </div>
                    </div>
                  </div>

                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label class="pbv-label">Display Options</label>
                      <div class="pbv-toggle-group">
                        <label class="pbv-toggle-item">
                          <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[showReference]" value="1" <?php checked(!empty($o['showReference'])); ?> />
                          <span>Show reference header</span>
                        </label>
                        <label class="pbv-toggle-item">
                          <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[showFooter]" value="1" <?php checked(!empty($o['showFooter'])); ?> />
                          <span>Show footer branding</span>
                        </label>
                        <label class="pbv-toggle-item">
                          <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[enableAnimations]" value="1" <?php checked(!empty($o['enableAnimations'])); ?> />
                          <span>Enable animations</span>
                        </label>
                        <label class="pbv-toggle-item">
                          <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[mobileOptimized]" value="1" <?php checked(!empty($o['mobileOptimized'])); ?> />
                          <span>Mobile optimized</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label for="customStyles" class="pbv-label">
                        Custom CSS
                        <span class="pbv-label-description">Add your own CSS to further customize the tooltip appearance</span>
                      </label>
                      <textarea rows="6" id="customStyles" name="<?php echo esc_attr(self::OPTION); ?>[customStyles]" class="pbv-textarea code" placeholder=".pbv-tooltip { /* your styles */ }"><?php echo esc_textarea($o['customStyles']); ?></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Behavior -->
              <div class="pbv-section" id="section-behavior">
                <div class="pbv-section-header">
                  <h2>Behavior</h2>
                  <p>Fine-tune interaction timing and content scanning</p>
                </div>

                <div class="pbv-card">
                  <div class="pbv-card-header">
                    <h3>Interaction Timing</h3>
                  </div>
                  <div class="pbv-card-row pbv-row-thirds">
                    <div class="pbv-field">
                      <label for="hoverDelayMs" class="pbv-label">Hover Delay</label>
                      <div class="pbv-input-group">
                        <input type="number" id="hoverDelayMs" name="<?php echo esc_attr(self::OPTION); ?>[hoverDelayMs]" value="<?php echo esc_attr($o['hoverDelayMs']); ?>" min="0" step="50" class="pbv-input" />
                        <span class="pbv-input-suffix">ms</span>
                      </div>
                    </div>

                    <div class="pbv-field">
                      <label for="longPressMs" class="pbv-label">Long Press</label>
                      <div class="pbv-input-group">
                        <input type="number" id="longPressMs" name="<?php echo esc_attr(self::OPTION); ?>[longPressMs]" value="<?php echo esc_attr($o['longPressMs']); ?>" min="0" step="50" class="pbv-input" />
                        <span class="pbv-input-suffix">ms</span>
                      </div>
                    </div>

                    <div class="pbv-field">
                      <label for="hideDelayMs" class="pbv-label">Hide Delay</label>
                      <div class="pbv-input-group">
                        <input type="number" id="hideDelayMs" name="<?php echo esc_attr(self::OPTION); ?>[hideDelayMs]" value="<?php echo esc_attr($o['hideDelayMs']); ?>" min="0" step="50" class="pbv-input" />
                        <span class="pbv-input-suffix">ms</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pbv-card">
                  <div class="pbv-card-header">
                    <h3>Content Scanning</h3>
                  </div>
                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label for="excludeSelectors" class="pbv-label">
                        Exclude Selectors
                        <span class="pbv-label-description">CSS selectors for elements that should not be scanned (comma or newline separated)</span>
                      </label>
                      <textarea rows="4" id="excludeSelectors" name="<?php echo esc_attr(self::OPTION); ?>[excludeSelectors]" class="pbv-textarea code" placeholder="script, style, .no-scan"><?php echo esc_textarea(implode(', ', (array)$o['excludeSelectors'])); ?></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Performance -->
              <div class="pbv-section" id="section-performance">
                <div class="pbv-section-header">
                  <h2>Performance</h2>
                  <p>Optimize loading, caching, and resource usage</p>
                </div>

                <div class="pbv-card">
                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label class="pbv-label">Optimization Features</label>
                      <div class="pbv-toggle-group">
                        <label class="pbv-toggle-item">
                          <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[prefetch]" value="1" <?php checked(!empty($o['prefetch'])); ?> />
                          <span>Prefetch nearby verses</span>
                        </label>
                        <label class="pbv-toggle-item">
                          <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[lazyScan]" value="1" <?php checked(!empty($o['lazyScan'])); ?> />
                          <span>Lazy scan with IntersectionObserver</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div class="pbv-card-row pbv-row-split">
                    <div class="pbv-field">
                      <label for="maxCacheSize" class="pbv-label">Max Cache Entries</label>
                      <input type="number" id="maxCacheSize" name="<?php echo esc_attr(self::OPTION); ?>[maxCacheSize]" value="<?php echo esc_attr($o['maxCacheSize']); ?>" min="10" step="10" class="pbv-input" />
                    </div>

                    <div class="pbv-field">
                      <label for="cacheExpiry" class="pbv-label">Cache Expiry</label>
                      <div class="pbv-input-group">
                        <input type="number" id="cacheExpiry" name="<?php echo esc_attr(self::OPTION); ?>[cacheExpiry]" value="<?php echo esc_attr($o['cacheExpiry']); ?>" min="0" step="1000" class="pbv-input" />
                        <span class="pbv-input-suffix">ms</span>
                      </div>
                    </div>
                  </div>

                  <div class="pbv-card-row pbv-row-thirds">
                    <div class="pbv-field">
                      <label for="timeoutMs" class="pbv-label">Request Timeout</label>
                      <div class="pbv-input-group">
                        <input type="number" id="timeoutMs" name="<?php echo esc_attr(self::OPTION); ?>[timeoutMs]" value="<?php echo esc_attr($o['timeoutMs']); ?>" min="1000" step="500" class="pbv-input" />
                        <span class="pbv-input-suffix">ms</span>
                      </div>
                    </div>

                    <div class="pbv-field">
                      <label for="retries" class="pbv-label">Retry Attempts</label>
                      <input type="number" id="retries" name="<?php echo esc_attr(self::OPTION); ?>[retries]" value="<?php echo esc_attr($o['retries']); ?>" min="0" step="1" class="pbv-input" />
                    </div>

                    <div class="pbv-field">
                      <label for="maxConcurrentFetches" class="pbv-label">Max Concurrent</label>
                      <input type="number" id="maxConcurrentFetches" name="<?php echo esc_attr(self::OPTION); ?>[maxConcurrentFetches]" value="<?php echo esc_attr($o['maxConcurrentFetches']); ?>" min="1" step="1" class="pbv-input" />
                    </div>
                  </div>

                  <div class="pbv-card-row pbv-row-split">
                    <div class="pbv-field">
                      <label for="maxMatchesPerNode" class="pbv-label">Max Matches Per Node</label>
                      <input type="number" id="maxMatchesPerNode" name="<?php echo esc_attr(self::OPTION); ?>[maxMatchesPerNode]" value="<?php echo esc_attr($o['maxMatchesPerNode']); ?>" min="1" step="1" class="pbv-input" />
                    </div>

                    <div class="pbv-field">
                      <label for="maxNodeTextLength" class="pbv-label">Max Node Text Length</label>
                      <input type="number" id="maxNodeTextLength" name="<?php echo esc_attr(self::OPTION); ?>[maxNodeTextLength]" value="<?php echo esc_attr($o['maxNodeTextLength']); ?>" min="1000" step="500" class="pbv-input" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Advanced -->
              <div class="pbv-section" id="section-advanced">
                <div class="pbv-section-header">
                  <h2>Advanced</h2>
                  <p>Expert settings for developers and advanced users</p>
                </div>

                <div class="pbv-card">
                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label for="chapterVerseCounts" class="pbv-label">
                        Chapter Verse Counts (JSON)
                        <span class="pbv-label-description">Optional JSON mapping of books to chapter verse counts for improved parsing accuracy</span>
                      </label>
                      <textarea rows="8" id="chapterVerseCounts" name="<?php echo esc_attr(self::OPTION); ?>[chapterVerseCounts]" class="pbv-textarea code" placeholder='{"John":{"3":36,"4":54}}'><?php echo esc_textarea(empty($o['chapterVerseCounts']) ? '' : wp_json_encode($o['chapterVerseCounts'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)); ?></textarea>
                      <div class="pbv-help-box">
                        <strong>Example format:</strong>
                        <code>{"John":{"3":36,"4":54},"Genesis":{"1":31,"2":25}}</code>
                      </div>
                    </div>
                  </div>

                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label for="styleNonce" class="pbv-label">
                        CSP Style Nonce
                        <span class="pbv-label-description">Content Security Policy nonce for inline styles (if your site uses CSP)</span>
                      </label>
                      <input type="text" id="styleNonce" name="<?php echo esc_attr(self::OPTION); ?>[styleNonce]" value="<?php echo esc_attr($o['styleNonce']); ?>" class="pbv-input" placeholder="xyz123" />
                    </div>
                  </div>

                  <div class="pbv-card-row">
                    <div class="pbv-field">
                      <label class="pbv-label">Additional Options</label>
                      <div class="pbv-toggle-group">
                        <label class="pbv-toggle-item">
                          <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[analytics]" value="1" <?php checked(!empty($o['analytics'])); ?> />
                          <span>Enable analytics tracking (fires 'verse_preview' event to window.gtag)</span>
                        </label>
                        <label class="pbv-toggle-item">
                          <input type="checkbox" name="<?php echo esc_attr(self::OPTION); ?>[debug]" value="1" <?php checked(!empty($o['debug'])); ?> />
                          <span>Enable debug mode (logs to browser console)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pbv-card pbv-info-card">
                  <div class="pbv-info-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z"/>
                    </svg>
                  </div>
                  <div class="pbv-info-content">
                    <h4>Development Tips</h4>
                    <ul>
                      <li>Add class <code>pbv-no-scan</code> to any element to prevent verse scanning inside it</li>
                      <li>Use the per-post meta box to disable scanning for specific posts or pages</li>
                      <li>Enable debug mode to see detailed console logs during development</li>
                      <li>The plugin automatically loads minified assets in production unless <code>SCRIPT_DEBUG</code> is enabled</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div class="pbv-footer">
                <?php submit_button('Save Changes', 'primary pbv-save-button', 'submit', false); ?>
                <p class="pbv-footer-text">
                  Need help? Visit <a href="https://primebible.com/support" target="_blank" rel="noopener">PrimeBible Support</a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      <script>
      (function() {
        const nav = document.querySelectorAll('.pbv-nav-item');
        const sections = document.querySelectorAll('.pbv-section');
        
        nav.forEach(item => {
          item.addEventListener('click', function() {
            const target = this.dataset.section;
            
            nav.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById('section-' + target).classList.add('active');
          });
        });
      })();
      </script>
      <?php
    }
  }

  PrimeBible_Verse_Preview::instance();
}
