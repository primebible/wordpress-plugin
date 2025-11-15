<?php
// If uninstall not called from WordPress, exit.
if (!defined('WP_UNINSTALL_PLUGIN')) {
  exit;
}

delete_option('primebible_settings');

// Clean per-post meta
global $wpdb;
$meta_key = '_primebible_disable';
$wpdb->query(
  $wpdb->prepare(
    "DELETE FROM {$wpdb->postmeta} WHERE meta_key = %s",
    $meta_key
  )
);
