<?php
declare(strict_types=1);

// Nautica Panel website-asset configuration.
// Adjust ASSET_PHYSICAL_BASE if the cPanel subdomain uses a different Document Root.
define('ASSET_PHYSICAL_BASE', getenv('NAUTICA_ASSET_PHYSICAL_BASE') ?: '/home/gyu5la0fbzjq/public_html/assets-nautica');
define('ASSET_PUBLIC_BASE', getenv('NAUTICA_ASSET_PUBLIC_BASE') ?: 'https://assets.nauticahome.com.mx');
const FIREBASE_PROJECT_ID = 'nautica-ca65d';
const FIREBASE_WEB_API_KEY = 'AIzaSyBxtwVNpQ0YaVUgOD045nJU-t2ZRaNv-aA';

// Optional hardening: set NAUTICA_ADMIN_EMAILS in the hosting environment to a
// comma-separated allowlist. If empty, any valid Firebase-authenticated panel
// user is accepted, matching the panel's current Firestore authorization model.
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

function jsonResponse(int $status, array $payload): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function bearerToken(): string {
    // Shared hosting / CGI setups can strip the standard Authorization header.
    // Accept multiple safe transport paths while still validating the token
    // against Firebase before allowing any asset operation.
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if (preg_match('/^Bearer\s+(.+)$/i', trim((string) $header), $m)) {
        return trim($m[1]);
    }

    $customHeader = trim((string) ($_SERVER['HTTP_X_FIREBASE_TOKEN'] ?? ''));
    if ($customHeader !== '') {
        return $customHeader;
    }

    $formToken = trim((string) ($_POST['_firebaseToken'] ?? ''));
    if ($formToken !== '') {
        return $formToken;
    }

    jsonResponse(401, ['ok' => false, 'error' => 'Missing Firebase authorization token.']);
}

function curlJson(string $url, string $method = 'GET', ?array $body = null, array $headers = []): array {
    $ch = curl_init($url);
    $baseHeaders = ['Accept: application/json'];
    if ($body !== null) {
        $baseHeaders[] = 'Content-Type: application/json';
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge($baseHeaders, $headers),
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 8,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $raw = curl_exec($ch);
    if ($raw === false) {
        $message = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('Remote verification failed: ' . $message);
    }
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        $decoded = [];
    }
    return ['status' => $status, 'data' => $decoded];
}

function requirePanelAdmin(): array {
    $token = bearerToken();
    try {
        $result = curlJson(
            'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . rawurlencode(FIREBASE_WEB_API_KEY),
            'POST',
            ['idToken' => $token]
        );
    } catch (Throwable $e) {
        jsonResponse(503, ['ok' => false, 'error' => 'Could not verify Firebase session.']);
    }

    $user = $result['data']['users'][0] ?? null;
    if ($result['status'] !== 200 || !is_array($user) || empty($user['localId'])) {
        jsonResponse(401, ['ok' => false, 'error' => 'Invalid or expired Firebase session.']);
    }

    $allowlistRaw = trim((string) getenv('NAUTICA_ADMIN_EMAILS'));
    if ($allowlistRaw !== '') {
        $allowlist = array_filter(array_map(fn($v) => strtolower(trim($v)), explode(',', $allowlistRaw)));
        $email = strtolower((string) ($user['email'] ?? ''));
        if ($email === '' || !in_array($email, $allowlist, true)) {
            jsonResponse(403, ['ok' => false, 'error' => 'This Firebase user is not allowed to manage website assets.']);
        }
    }

    return ['token' => $token, 'user' => $user];
}

function sectionDirectory(string $key): string {
    $key = strtolower(trim($key));
    if ($key === 'hero' || $key === 'hero-video') return 'hero';
    if (str_starts_with($key, 'products-')) return 'products';
    if (str_starts_with($key, 'catalog-product-')) return 'catalog-products';
    if ($key === 'about') return 'about';
    if (str_starts_with($key, 'retailer-')) return 'stores';
    if (str_starts_with($key, 'inspiration-')) return 'inspiration';
    if ($key === 'newsletter') return 'newsletter';
    if ($key === 'contact') return 'contact';
    jsonResponse(400, ['ok' => false, 'error' => 'Invalid website asset section.']);
}

function allowedMimeMap(): array {
    return [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
    ];
}

function ensureAssetBase(): string {
    $base = rtrim(ASSET_PHYSICAL_BASE, DIRECTORY_SEPARATOR);
    if (!is_dir($base) && !@mkdir($base, 0755, true) && !is_dir($base)) {
        jsonResponse(500, ['ok' => false, 'error' => 'Asset storage directory does not exist and could not be created. Check ASSET_PHYSICAL_BASE.']);
    }
    $real = realpath($base);
    if ($real === false) {
        jsonResponse(500, ['ok' => false, 'error' => 'Could not resolve ASSET_PHYSICAL_BASE.']);
    }
    return $real;
}

function safeAssetPathFromUrl(string $url): ?string {
    $url = trim($url);
    $baseUrl = rtrim(ASSET_PUBLIC_BASE, '/');
    if ($url === '' || !str_starts_with($url, $baseUrl . '/')) return null;
    if (str_contains($url, '../') || str_contains(rawurldecode($url), '../')) return null;

    $parts = parse_url($url);
    $baseParts = parse_url($baseUrl);
    if (!$parts || !$baseParts) return null;
    if (($parts['scheme'] ?? '') !== ($baseParts['scheme'] ?? '') || ($parts['host'] ?? '') !== ($baseParts['host'] ?? '')) return null;

    $relative = ltrim(rawurldecode((string) ($parts['path'] ?? '')), '/');
    if ($relative === '' || str_contains($relative, "\0") || str_contains($relative, '..')) return null;

    $base = ensureAssetBase();
    $candidate = $base . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);
    $parentReal = realpath(dirname($candidate));
    if ($parentReal === false || ($parentReal !== $base && !str_starts_with($parentReal, $base . DIRECTORY_SEPARATOR))) return null;
    return $candidate;
}

function firestoreHomeDocument(string $idToken): ?array {
    $url = 'https://firestore.googleapis.com/v1/projects/' . rawurlencode(FIREBASE_PROJECT_ID)
        . '/databases/(default)/documents/siteContent/home';
    try {
        $result = curlJson($url, 'GET', null, ['Authorization: Bearer ' . $idToken]);
    } catch (Throwable $e) {
        return null;
    }
    if ($result['status'] === 404) return [];
    if ($result['status'] !== 200) return null;
    return $result['data'];
}

function recursiveContainsExactString(mixed $value, string $needle): bool {
    if (is_string($value)) return $value === $needle;
    if (!is_array($value)) return false;
    foreach ($value as $child) {
        if (recursiveContainsExactString($child, $needle)) return true;
    }
    return false;
}

function firestoreCollectionContainsUrl(string $collection, string $url, string $idToken): ?bool {
    $pageToken = '';
    $pages = 0;
    do {
        $endpoint = 'https://firestore.googleapis.com/v1/projects/' . rawurlencode(FIREBASE_PROJECT_ID)
            . '/databases/(default)/documents/' . rawurlencode($collection) . '?pageSize=300';
        if ($pageToken !== '') $endpoint .= '&pageToken=' . rawurlencode($pageToken);
        try {
            $result = curlJson($endpoint, 'GET', null, ['Authorization: Bearer ' . $idToken]);
        } catch (Throwable $e) {
            return null;
        }
        if ($result['status'] === 404) return false;
        if ($result['status'] !== 200) return null;
        $documents = $result['data']['documents'] ?? [];
        if (is_array($documents)) {
            foreach ($documents as $document) {
                if (recursiveContainsExactString($document, $url)) return true;
            }
        }
        $pageToken = trim((string) ($result['data']['nextPageToken'] ?? ''));
        $pages++;
    } while ($pageToken !== '' && $pages < 20);
    return false;
}

function isAssetStillReferenced(string $url, string $idToken): ?bool {
    $document = firestoreHomeDocument($idToken);
    if ($document === null) return null;
    if (recursiveContainsExactString($document, $url)) return true;

    // Product overrides also store public cPanel image URLs. Preserve an asset
    // whenever any catalog override still points to it.
    return firestoreCollectionContainsUrl('catalogProductOverrides', $url, $idToken);
}
