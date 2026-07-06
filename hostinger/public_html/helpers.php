<?php
/** Small shared utilities used by index.php and the api/*.php endpoints. */

function app_config(): array {
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}

function app_timezone(): DateTimeZone {
    return new DateTimeZone(app_config()['timezone']);
}

function generate_uuid(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function now_string(): string {
    return (new DateTime('now', app_timezone()))->format('Y-m-d H:i:s');
}

/** Formats a "YYYY-MM-DD" input date for display. Returns the input unchanged if unparseable. */
function format_date_display(?string $dateStr): string {
    if (!$dateStr) return '';
    $d = DateTime::createFromFormat('Y-m-d', $dateStr, app_timezone());
    if (!$d) return $dateStr;
    return $d->format(app_config()['date_format']);
}

/** e.g. "Tue, 08 Jul" for the given offset (0-6) from the plan's start date. Falls back to "Day N" if unparseable. */
function plan_day_label(?string $startDateStr, int $offset): string {
    $d = $startDateStr ? DateTime::createFromFormat('Y-m-d', $startDateStr, app_timezone()) : false;
    if (!$d) return 'Day ' . ($offset + 1);
    $d->modify("+{$offset} days");
    return $d->format('D, d M');
}

function display_week_no($weekNo): string {
    $s = trim((string)$weekNo);
    return preg_match('/^\d$/', $s) ? '0' . $s : $s;
}

function sanitize_filename(string $name): string {
    $name = preg_replace('/[\\\\\/:*?"<>|]/', '-', $name);
    $name = preg_replace('/\s+/', ' ', $name);
    return trim($name);
}

/** htmlspecialchars shorthand for building PDF/HTML fragments safely. */
function h($text): string {
    return htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8');
}

function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Base URL of the app (scheme + host + path), used to build public PDF links. Works whether deployed at the domain root or in a subfolder. */
function base_url(): string {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
    if (substr($dir, -4) === '/api') {
        $dir = substr($dir, 0, -4);
    }
    return $scheme . '://' . $host . $dir;
}
