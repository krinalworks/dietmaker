<?php
require __DIR__ . '/../db.php';

try {
    $pdo = get_pdo();

    $clients = $pdo->query('SELECT * FROM clients ORDER BY name')->fetchAll();
    $clientsOut = array_map(function ($row) {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'age' => $row['age'],
            'phone' => $row['phone'],
            'notes' => $row['notes'],
            'goal' => $row['goal'],
            'dietType' => $row['diet_type'],
            'programStartDate' => $row['program_start_date'] ?? '',
            'programStartWeight' => $row['program_start_weight'],
            'onRising' => $row['on_rising'],
            'beforeExercise' => $row['before_exercise'],
            'afterExercise' => $row['after_exercise'],
            'brunch' => $row['brunch'],
            'snack' => $row['snack'],
            'bedTime' => $row['bed_time'],
        ];
    }, $clients);

    $food = $pdo->query('SELECT * FROM food_library ORDER BY category, item')->fetchAll();
    $foodOut = array_map(function ($row) {
        return ['category' => $row['category'], 'item' => $row['item'], 'notes' => $row['notes']];
    }, $food);

    $config = app_config();
    json_response([
        'clients' => $clientsOut,
        'foodLibrary' => $foodOut,
        'coach' => [
            'name' => $config['dietician_name'],
            'credentials' => $config['credentials'],
            'phone' => $config['phone'],
            'instagramHandle' => $config['instagram_handle'],
        ],
    ]);
} catch (Throwable $e) {
    json_response(['error' => $e->getMessage()], 500);
}
