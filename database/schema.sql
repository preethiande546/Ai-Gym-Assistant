CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  goal TEXT NOT NULL,
  bmi REAL,
  weight_kg REAL,
  height_cm REAL
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exercise TEXT NOT NULL,
  reps INTEGER NOT NULL,
  form_score INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  heart_rate INTEGER NOT NULL,
  performance_score REAL NOT NULL,
  feedback TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS diet_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  goal TEXT NOT NULL,
  calories_target INTEGER NOT NULL,
  meal_plan TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  streak_days INTEGER NOT NULL,
  sleep_hours REAL NOT NULL,
  mood TEXT NOT NULL,
  workout_completed INTEGER NOT NULL,
  skip_risk_percent INTEGER NOT NULL,
  nudge TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS device_telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  heart_rate INTEGER,
  steps INTEGER,
  calories_burned INTEGER,
  temperature_c REAL,
  battery_level REAL,
  status TEXT NOT NULL,
  received_at TEXT DEFAULT CURRENT_TIMESTAMP
);
