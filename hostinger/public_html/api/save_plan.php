<?php
require __DIR__ . '/../db.php';
require __DIR__ . '/../pdf_builder.php';
require __DIR__ . '/../lib/plan_service.php';

try {
    $payload = read_json_body();
    $error = validate_plan_payload($payload);
    if ($error) {
        json_response(['ok' => false, 'error' => $error]);
    }

    $pdo = get_pdo();
    $client = find_or_create_client($pdo, $payload);
    $profile = build_profile($payload);
    update_client_profile($pdo, $client['id'], $profile);

    $days = normalize_days($payload['days'] ?? []);
    $plan = [
        'planId' => generate_uuid(),
        'weekNo' => trim((string)$payload['weekNo']),
        'startDate' => trim((string)$payload['startDate']),
        'endDate' => trim((string)$payload['endDate']),
        'highlightNote' => trim((string)($payload['highlightNote'] ?? '')),
        'generalNotes' => trim((string)($payload['generalNotes'] ?? '')),
    ];

    $pdf = build_diet_plan_pdf($client, $profile, $plan, $days);
    save_plan_row($pdo, $client, $profile, $plan, $days, $pdf);

    json_response([
        'ok' => true,
        'pdfUrl' => $pdf['url'],
        'pdfFileId' => $pdf['id'],
        'fileName' => $pdf['fileName'],
        'client' => ['id' => $client['id'], 'name' => $client['name']],
        'planId' => $plan['planId'],
    ]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()]);
}
