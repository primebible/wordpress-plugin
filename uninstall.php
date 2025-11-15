<?php
// If uninstall not called from WordPress, exit.
if (!defined('WP_UNINSTALL_PLUGIN')) {
  exit;
}

delete_option('primebible_settings');

// Clean per-post meta
delete_post_meta_by_key( '_primebible_disable' );
