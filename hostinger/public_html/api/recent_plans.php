<?php
require __DIR__ . '/../db.php';

try {
    $clientId = trim((string)($_GET['clientId'] ?? ''));
    if ($clientId === '') {
        json_response([]);
    }

    $pdo = get_pdo();
    $stmt = $pdo->prepare(
        'SELECT id, week_no, start_date, end_date, pdf_url, created_at FROM diet_plans '
        . 'WHERE client_id = :cid ORDER BY created_at DESC LIMIT 10'
    );
    $stmt->execute(['cid' => $clientId]);
    $rows = $stmt->fetchAll();

    $out = array_map(function ($row) {
        return [
            'planId' => $row['id'],
            'weekNo' => $row['week_no'],
            'startDate' => $row['start_date'],
            'endDate' => $row['end_date'],
            'pdfUrl' => $row['pdf_url'],
            'createdAt' => $row['created_at'],
        ];
    }, $rows);

    json_response($out);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
