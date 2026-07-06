<?php
require __DIR__ . '/../db.php';

try {
    $input = read_json_body();
    $name = trim((string)($input['name'] ?? ''));
    if ($name === '') {
        json_response(['error' => 'Client name is required.'], 400);
    }

    $pdo = get_pdo();
    $id = generate_uuid();
    $now = now_string();
    $age = (string)($input['age'] ?? '');
    $phone = (string)($input['phone'] ?? '');
    $notes = (string)($input['notes'] ?? '');

    $stmt = $pdo->prepare(
        'INSERT INTO clients (id, name, age, phone, notes, goal, diet_type, program_start_date, program_start_weight, on_rising, before_exercise, after_exercise, brunch, snack, bed_time, created_at, updated_at) '
        . 'VALUES (:id, :name, :age, :phone, :notes, \'\', \'\', NULL, \'\', \'\', \'\', \'\', \'\', \'\', \'\', :created_at, :updated_at)'
    );
    $stmt->execute([
        'id' => $id, 'name' => $name, 'age' => $age, 'phone' => $phone, 'notes' => $notes,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    json_response(['id' => $id, 'name' => $name, 'age' => $age, 'phone' => $phone, 'notes' => $notes]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
