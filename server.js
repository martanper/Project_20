const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;
const db = new sqlite3.Database('./database/gruzovozoff.db');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Инициализация БД
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

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

// Маршруты для страниц
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/reg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reg.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// API для регистрации
app.post('/api/register', (req, res) => {
  const { login, password, full_name, phone, email } = req.body;
  
  // Проверка на кириллицу
  const cyrillicRegex = /^[а-яёА-ЯЁ\s]+$/;
  if (!cyrillicRegex.test(login)) {
    return res.status(400).json({ error: 'Логин должен содержать только кириллицу' });
  }

  if (login.length < 6) {
    return res.status(400).json({ error: 'Логин должен быть не менее 6 символов' });
  }

  db.run(
    'INSERT INTO users (login, password, full_name, phone, email) VALUES (?, ?, ?, ?, ?)',
    [login, password, full_name, phone, email],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// API для авторизации
app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  
  db.get(
    'SELECT * FROM users WHERE login = ? AND password = ?',
    [login, password],
    (err, row) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!row) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
      }
      res.json(row);
    }
  );
});

// API для создания заявки
app.post('/api/orders', (req, res) => {
  const { userId, date, time, weight, cargoType, dimensions, fromAddress, toAddress } = req.body;
  
  db.run(
    `INSERT INTO orders (user_id, date, time, weight, cargo_type, dimensions, from_address, to_address) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, date, time, weight, cargoType, dimensions, fromAddress, toAddress],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// API для получения заявок пользователя
app.get('/api/orders/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// API для администратора
app.get('/api/admin/orders', (req, res) => {
  const { login, password } = req.query;
  
  if (login !== 'admin' || password !== 'gruzovik2024') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  db.all(
    `SELECT o.*, u.full_name, u.phone, u.email 
     FROM orders o JOIN users u ON o.user_id = u.id 
     ORDER BY o.created_at DESC`,
    (err, rows) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Обновление статуса заявки
app.put('/api/admin/orders/:id', (req, res) => {
  const { login, password, status } = req.body;
  const orderId = req.params.id;
  
  if (login !== 'admin' || password !== 'gruzovik2024') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  db.run(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, orderId],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ changes: this.changes });
    }
  );
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});