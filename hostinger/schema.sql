-- Diet Plan Generator — MySQL schema.
-- Import this once via hPanel → phpMyAdmin after creating the database.
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS, never drops/erases data.

CREATE TABLE IF NOT EXISTS clients (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age VARCHAR(20) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  notes TEXT NULL,
  goal VARCHAR(255) NOT NULL DEFAULT '',
  diet_type VARCHAR(255) NOT NULL DEFAULT '',
  program_start_date DATE NULL,
  program_start_weight VARCHAR(20) NOT NULL DEFAULT '',
  on_rising VARCHAR(255) NOT NULL DEFAULT '',
  before_exercise VARCHAR(255) NOT NULL DEFAULT '',
  after_exercise VARCHAR(255) NOT NULL DEFAULT '',
  brunch VARCHAR(255) NOT NULL DEFAULT '',
  snack VARCHAR(255) NOT NULL DEFAULT '',
  bed_time VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS diet_plans (
  id CHAR(36) PRIMARY KEY,
  client_id CHAR(36) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  age VARCHAR(20) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  goal VARCHAR(255) NOT NULL DEFAULT '',
  diet_type VARCHAR(255) NOT NULL DEFAULT '',
  program_start_date DATE NULL,
  program_start_weight VARCHAR(20) NOT NULL DEFAULT '',
  week_no VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  highlight_note VARCHAR(500) NOT NULL DEFAULT '',
  on_rising VARCHAR(255) NOT NULL DEFAULT '',
  before_exercise VARCHAR(255) NOT NULL DEFAULT '',
  after_exercise VARCHAR(255) NOT NULL DEFAULT '',
  brunch VARCHAR(255) NOT NULL DEFAULT '',
  snack VARCHAR(255) NOT NULL DEFAULT '',
  bed_time VARCHAR(255) NOT NULL DEFAULT '',
  day1_lunch TEXT NULL, day1_dinner TEXT NULL,
  day2_lunch TEXT NULL, day2_dinner TEXT NULL,
  day3_lunch TEXT NULL, day3_dinner TEXT NULL,
  day4_lunch TEXT NULL, day4_dinner TEXT NULL,
  day5_lunch TEXT NULL, day5_dinner TEXT NULL,
  day6_lunch TEXT NULL, day6_dinner TEXT NULL,
  day7_lunch TEXT NULL, day7_dinner TEXT NULL,
  general_notes TEXT NULL,
  pdf_file VARCHAR(255) NOT NULL DEFAULT '',
  pdf_url VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  INDEX idx_diet_plans_client_id (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS food_library (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) NOT NULL DEFAULT '',
  item VARCHAR(255) NOT NULL,
  notes VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
