// app.js — robust version for Render + local
const express = require('express');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';

// Paths
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const FOODS_FILE = path.join(ROOT, 'foods.json');
const VIEWS_DIR = path.join(ROOT, 'views');

// Ensure folders exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);
if (!fs.existsSync(FOODS_FILE)) fs.writeFileSync(FOODS_FILE, '[]');

// Middleware
app.use(express.static(PUBLIC_DIR));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Render gives HTTPS; but keep false for local. If you use HTTPS, set true.
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.set('views', VIEWS_DIR);
app.set('view engine', 'ejs');

// Admin credentials (use env in production)
const ADMIN_FULL_PHONE = process.env.ADMIN_PHONE || '+998996479888'; // your +998...
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';

// Helpers
function safeReadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('JSON read error:', err);
    return [];
  }
}
function safeWriteJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function onlyDigits(s) { return (s||'').toString().replace(/\D/g, ''); }
function normalizePhoneInput(input) {
  if (!input) return '';
  const d = onlyDigits(input);
  if (d.length === 12 && d.startsWith('998')) return '+' + d;
  if (d.length === 10 && d.startsWith('0')) return '+998' + d.slice(1);
  if (d.length === 9) return '+998' + d;
  if (d.length >= 11 && d.startsWith('998')) return '+' + d.slice(0, 12);
  return '';
}

// Routes

// Health
app.get('/health', (req, res) => res.send('ok'));

// Index: show menu
app.get('/', (req, res) => {
  const foods = safeReadJSON(FOODS_FILE);
  res.render('index', { foods });
});

// Login page (GET)
app.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.render('login', { error: null });
});

// Login (POST)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const normalized = normalizePhoneInput(username);
  if (normalized === ADMIN_FULL_PHONE && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    req.session.adminUser = normalized;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Login yoki parol xato' });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Admin (protected)
app.get('/admin', (req, res) => {
  if (!req.session || !req.session.isAdmin) return res.redirect('/login');
  const foods = safeReadJSON(FOODS_FILE);
  res.render('admin', { foods, adminUser: req.session.adminUser });
});

// Add food (protected)
app.post('/add-food', (req, res) => {
  if (!req.session || !req.session.isAdmin) return res.status(401).send('Unauthorized');

  const { name, description, price, category } = req.body;
  const file = req.files?.image;

  if (!name || !description || !price || !category) {
    return res.status(400).send('Barcha maydonlarni to‘ldiring');
  }

  let imageUrl = null;
  if (file) {
    const fileName = Date.now() + path.extname(file.name);
    const savePath = path.join(IMAGES_DIR, fileName);
    try {
      file.mv(savePath);
      imageUrl = `/images/${fileName}`;
    } catch (err) {
      console.error('Image save error', err);
      return res.status(500).send('Rasm saqlashda xatolik');
    }
  }

  const foods = safeReadJSON(FOODS_FILE);
  foods.push({
    id: Date.now(),
    name,
    description,
    price,
    category,
    image: imageUrl,
    new: true
  });
  safeWriteJSON(FOODS_FILE, foods);
  res.redirect('/admin');
});

// Debug helper: show session (only if local or admin)
app.get('/_debug/session', (req, res) => {
  if (process.env.DEBUG_SESSIONS !== 'true') {
    return res.status(403).send('Forbidden');
  }
  res.json({ session: req.session });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`NODE_ENV=${process.env.NODE_ENV || 'dev'}`);
});

