<?php
declare(strict_types=1);
require __DIR__ . '/_asset-common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

requirePanelAdmin();
$key = (string) ($_POST['key'] ?? '');
$section = sectionDirectory($key);
$file = $_FILES['file'] ?? null;

if (!is_array($file) || !isset($file['tmp_name'], $file['error'], $file['size'])) {
    jsonResponse(400, ['ok' => false, 'error' => 'No file received.']);
}
if ((int) $file['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(400, ['ok' => false, 'error' => 'Upload failed before validation.']);
}
if (!is_uploaded_file($file['tmp_name'])) {
    jsonResponse(400, ['ok' => false, 'error' => 'Invalid uploaded file.']);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = (string) $finfo->file($file['tmp_name']);
$map = allowedMimeMap();
if (!isset($map[$mime])) {
    jsonResponse(415, ['ok' => false, 'error' => 'Unsupported file type. Allowed: JPG, PNG, WebP, GIF, MP4, WebM.']);
}
$isVideo = str_starts_with($mime, 'video/');
$limit = $isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
if ((int) $file['size'] <= 0 || (int) $file['size'] > $limit) {
    jsonResponse(413, ['ok' => false, 'error' => $isVideo ? 'Video exceeds 150 MB limit.' : 'Image exceeds 20 MB limit.']);
}

$base = ensureAssetBase();
$targetDir = $base . DIRECTORY_SEPARATOR . 'home' . DIRECTORY_SEPARATOR . $section;
if (!is_dir($targetDir) && !@mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
    jsonResponse(500, ['ok' => false, 'error' => 'Could not create the website asset directory.']);
}
$realDir = realpath($targetDir);
if ($realDir === false || ($realDir !== $base && !str_starts_with($realDir, $base . DIRECTORY_SEPARATOR))) {
    jsonResponse(500, ['ok' => false, 'error' => 'Unsafe asset directory configuration.']);
}

$originalBase = pathinfo((string) ($file['name'] ?? 'asset'), PATHINFO_FILENAME);
$slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $originalBase) ?: 'asset');
$slug = trim(substr($slug, 0, 55), '-');
if ($slug === '') $slug = 'asset';
$unique = bin2hex(random_bytes(8));
$filename = $slug . '-' . gmdate('Ymd-His') . '-' . $unique . '.' . $map[$mime];
$target = $realDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($file['tmp_name'], $target)) {
    jsonResponse(500, ['ok' => false, 'error' => 'Could not save uploaded file on cPanel.']);
}
@chmod($target, 0644);

$url = rtrim(ASSET_PUBLIC_BASE, '/') . '/home/' . rawurlencode($section) . '/' . rawurlencode($filename);
jsonResponse(200, ['ok' => true, 'url' => $url]);
