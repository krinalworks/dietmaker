<?php
require_once __DIR__ . '/helpers.php';

/** Shared PDO connection, opened once per request. */
function get_pdo(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $db = app_config()['db'];
        $dsn = 'mysql:host=' . $db['host'] . ';dbname=' . $db['name'] . ';charset=utf8mb4';
        $pdo = new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}
