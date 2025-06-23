const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к файлу базы данных
const dbPath = path.resolve(__dirname, 'gruzovozoff.db');

// Создание/подключение к базе данных
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('Подключено к базе данных SQLite');
    initializeDatabase();
  }
});

// Инициализация базы данных
function initializeDatabase() {
  db.serialize(() => {
    // Создание таблицы пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Создание таблицы заявок
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      weight TEXT NOT NULL,
      cargo_type TEXT NOT NULL,
      dimensions TEXT NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      status TEXT DEFAULT 'Новая',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
  });
}

module.exports = db;