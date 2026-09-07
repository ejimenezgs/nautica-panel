<?php
declare(strict_types=1);
require __DIR__ . '/_asset-common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

$auth = requirePanelAdmin();
$payload = json_decode((string) file_get_contents('php://input'), true);
$url = is_array($payload) ? trim((string) ($payload['url'] ?? '')) : '';
if ($url === '') {
    jsonResponse(400, ['ok' => false, 'error' => 'Missing asset URL.']);
}

$path = safeAssetPathFromUrl($url);
if ($path === null) {
    jsonResponse(400, ['ok' => false, 'error' => 'Asset URL is outside the allowed Nautica asset storage.']);
}

$referenced = isAssetStillReferenced($url, $auth['token']);
if ($referenced === null) {
    jsonResponse(503, ['ok' => false, 'error' => 'Could not verify Firestore references. Asset was preserved.']);
}
if ($referenced) {
    jsonResponse(200, ['ok' => true, 'deleted' => false, 'referenced' => true]);
}

if (!file_exists($path)) {
    jsonResponse(200, ['ok' => true, 'deleted' => false, 'missing' => true]);
}
if (!is_file($path)) {
    jsonResponse(400, ['ok' => false, 'error' => 'Target is not a regular file.']);
}
if (!@unlink($path)) {
    jsonResponse(500, ['ok' => false, 'error' => 'Could not delete the old asset.']);
}

jsonResponse(200, ['ok' => true, 'deleted' => true]);
