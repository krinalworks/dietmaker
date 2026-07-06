<?php
/**
 * Plan validation + client/plan persistence logic, kept separate from the
 * api/save_plan.php HTTP entry point so it can be exercised directly
 * (e.g. in tests) without triggering the request dispatcher.
 */

function validate_plan_payload(array $payload): ?string {
    $hasClientId = trim((string)($payload['clientId'] ?? '')) !== '';
    $hasNewName = trim((string)($payload['newClientName'] ?? '')) !== '';
    if (!$hasClientId && !$hasNewName) {
        return 'Select a client or add a new client.';
    }
    if (trim((string)($payload['weekNo'] ?? '')) === '') {
        return 'Week number is required.';
    }
    if (trim((string)($payload['startDate'] ?? '')) === '') {
        return 'Start date is required.';
    }
    if (trim((string)($payload['endDate'] ?? '')) === '') {
        return 'End date is required.';
    }
    $days = $payload['days'] ?? [];
    $hasMeal = false;
    foreach ($days as $d) {
        if (trim((string)($d['lunch'] ?? '')) !== '' || trim((string)($d['dinner'] ?? '')) !== '') {
            $hasMeal = true;
            break;
        }
    }
    if (!$hasMeal) {
        return 'Add at least one lunch or dinner entry.';
    }
    return null;
}

function normalize_days(array $days): array {
    $result = [];
    for ($i = 0; $i < 7; $i++) {
        $d = $days[$i] ?? [];
        $result[] = [
            'lunch' => trim((string)($d['lunch'] ?? '')),
            'dinner' => trim((string)($d['dinner'] ?? '')),
        ];
    }
    return $result;
}

function build_profile(array $payload): array {
    return [
        'goal' => trim((string)($payload['goal'] ?? '')),
        'dietType' => trim((string)($payload['dietType'] ?? '')),
        'programStartDate' => trim((string)($payload['programStartDate'] ?? '')),
        'programStartWeight' => trim((string)($payload['programStartWeight'] ?? '')),
        'onRising' => trim((string)($payload['onRising'] ?? '')),
        'beforeExercise' => trim((string)($payload['beforeExercise'] ?? '')),
        'afterExercise' => trim((string)($payload['afterExercise'] ?? '')),
        'brunch' => trim((string)($payload['brunch'] ?? '')),
        'snack' => trim((string)($payload['snack'] ?? '')),
        'bedTime' => trim((string)($payload['bedTime'] ?? '')),
    ];
}

/** Finds the client by ID, or creates a new one from newClientName/Age/Phone/Notes. */
function find_or_create_client(PDO $pdo, array $payload): array {
    $clientId = trim((string)($payload['clientId'] ?? ''));
    if ($clientId !== '') {
        $stmt = $pdo->prepare('SELECT id, name, age, phone, notes FROM clients WHERE id = :id');
        $stmt->execute(['id' => $clientId]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new RuntimeException('Selected client was not found. Please refresh and try again.');
        }
        return $row;
    }

    $newName = trim((string)($payload['newClientName'] ?? ''));
    if ($newName === '') {
        throw new RuntimeException('Select a client or add a new client.');
    }

    $id = generate_uuid();
    $now = now_string();
    $age = (string)($payload['newClientAge'] ?? '');
    $phone = (string)($payload['newClientPhone'] ?? '');
    $notes = (string)($payload['newClientNotes'] ?? '');

    $stmt = $pdo->prepare(
        'INSERT INTO clients (id, name, age, phone, notes, goal, diet_type, program_start_date, program_start_weight, on_rising, before_exercise, after_exercise, brunch, snack, bed_time, created_at, updated_at) '
        . 'VALUES (:id, :name, :age, :phone, :notes, \'\', \'\', NULL, \'\', \'\', \'\', \'\', \'\', \'\', \'\', :created_at, :updated_at)'
    );
    $stmt->execute([
        'id' => $id, 'name' => $newName, 'age' => $age, 'phone' => $phone, 'notes' => $notes,
        'created_at' => $now, 'updated_at' => $now,
    ]);

    return ['id' => $id, 'name' => $newName, 'age' => $age, 'phone' => $phone, 'notes' => $notes];
}

/**
 * Saves whatever profile fields were submitted this time onto the client
 * row, so the next plan for this client starts prefilled. A blank field
 * never overwrites a previously saved value — it just means "no change".
 */
function update_client_profile(PDO $pdo, string $clientId, array $profile): void {
    $columns = [
        'goal' => 'goal', 'diet_type' => 'dietType', 'program_start_weight' => 'programStartWeight',
        'on_rising' => 'onRising', 'before_exercise' => 'beforeExercise', 'after_exercise' => 'afterExercise',
        'brunch' => 'brunch', 'snack' => 'snack', 'bed_time' => 'bedTime',
    ];

    $sets = [];
    $params = ['id' => $clientId];
    foreach ($columns as $column => $key) {
        if ($profile[$key] === '') continue;
        $sets[] = "$column = :$column";
        $params[$column] = $profile[$key];
    }
    if ($profile['programStartDate'] !== '') {
        $sets[] = 'program_start_date = :program_start_date';
        $params['program_start_date'] = $profile['programStartDate'];
    }
    if (!$sets) return;

    $sets[] = 'updated_at = :updated_at';
    $params['updated_at'] = now_string();

    $sql = 'UPDATE clients SET ' . implode(', ', $sets) . ' WHERE id = :id';
    $pdo->prepare($sql)->execute($params);
}

function save_plan_row(PDO $pdo, array $client, array $profile, array $plan, array $days, array $pdf): void {
    $columns = [
        'id' => $plan['planId'], 'client_id' => $client['id'], 'client_name' => $client['name'],
        'age' => $client['age'] ?? '', 'phone' => $client['phone'] ?? '',
        'goal' => $profile['goal'], 'diet_type' => $profile['dietType'],
        'program_start_date' => $profile['programStartDate'] !== '' ? $profile['programStartDate'] : null,
        'program_start_weight' => $profile['programStartWeight'],
        'week_no' => $plan['weekNo'], 'start_date' => $plan['startDate'], 'end_date' => $plan['endDate'],
        'highlight_note' => $plan['highlightNote'],
        'on_rising' => $profile['onRising'], 'before_exercise' => $profile['beforeExercise'],
        'after_exercise' => $profile['afterExercise'], 'brunch' => $profile['brunch'],
        'snack' => $profile['snack'], 'bed_time' => $profile['bedTime'],
        'general_notes' => $plan['generalNotes'], 'pdf_file' => $pdf['id'], 'pdf_url' => $pdf['url'],
        'created_at' => now_string(),
    ];
    foreach ($days as $i => $d) {
        $n = $i + 1;
        $columns["day{$n}_lunch"] = $d['lunch'];
        $columns["day{$n}_dinner"] = $d['dinner'];
    }

    $cols = array_keys($columns);
    $placeholders = array_map(fn($c) => ":$c", $cols);
    $sql = 'INSERT INTO diet_plans (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $placeholders) . ')';
    $pdo->prepare($sql)->execute($columns);
}
