<?php
declare(strict_types=1);
require __DIR__ . '/_asset-common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

requirePanelAdmin();

$base = ensureAssetBase();
$writable = is_writable($base);

jsonResponse($writable ? 200 : 500, [
    'ok' => $writable,
    'assetBaseExists' => is_dir($base),
    'assetBaseWritable' => $writable,
    'publicBase' => ASSET_PUBLIC_BASE,
    'uploadMaxFilesize' => ini_get('upload_max_filesize'),
    'postMaxSize' => ini_get('post_max_size'),
    'curlAvailable' => function_exists('curl_init'),
    'error' => $writable ? null : 'ASSET_PHYSICAL_BASE exists but is not writable by PHP.'
]);
