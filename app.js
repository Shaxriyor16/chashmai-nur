const express = require('express');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Paths ---
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const FOODS_FILE = path.join(ROOT, 'foods.json');
const VIEWS_DIR = path.join(ROOT, 'views');

// --- Ensure folders exist ---
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);
if (!fs.existsSync(FOODS_FILE)) fs.writeFileSync(FOODS_FILE, '[]');

// --- Middleware ---
app.use(express.static(PUBLIC_DIR));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 5 * 1024 * 1024 } }));

app.use(session({
  secret: 'dev_secret_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.set('views', VIEWS_DIR);
app.set('view engine', 'ejs');

// --- Admin credentials ---
const ADMIN_NUMBER = process.env.ADMIN_PHONE || '+998996479888';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Fi132607';

// --- Helpers ---
function safeReadJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]'); }
  catch (err) { console.error('JSON read error:', err); return []; }
}
function safeWriteJSON(filePath, data) { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); }
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

// --- Routes ---

// Home page (for everyone)
app.get('/', (req, res) => {
  res.render('index', { foods: safeReadJSON(FOODS_FILE) });
});

// Login page (always open, session cookie mavjud bo‘lsa ham)
app.get('/login', (req, res) => {
  const loginCode = Math.floor(1000 + Math.random() * 9000).toString();
  req.session.loginCode = loginCode;
  res.render('login', { error: null, loginCode });
});

// Login POST
app.post('/login', (req, res) => {
  const { username, password, code } = req.body;
  const normalized = normalizePhoneInput(username);

  if (normalized === ADMIN_NUMBER && password === ADMIN_PASS && code === req.session.loginCode) {
    req.session.isAdmin = true;
    req.session.adminUser = normalized;
    return res.redirect('/admin');
  } else {
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    req.session.loginCode = newCode;
    return res.render('login', { error: '🚨 Login yoki parol noto‘g‘ri!', loginCode: newCode });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Admin panel (faqat admin uchun)
app.get('/admin', (req, res) => {
  if (!req.session?.isAdmin) return res.redirect('/login');
  res.render('admin', { foods: safeReadJSON(FOODS_FILE), adminUser: req.session.adminUser });
});

// Add food (admin only)
app.post('/add-food', (req, res) => {
  if (!req.session?.isAdmin) return res.status(401).send('Unauthorized');

  const { name, description, price, category } = req.body;
  const file = req.files?.image;

  if (!name || !description || !price || !category)
    return res.status(400).send('Barcha maydonlarni to‘ldiring');

  let imageUrl = null;
  if (file) {
    const fileName = Date.now() + path.extname(file.name);
    const savePath = path.join(IMAGES_DIR, fileName);
    try { file.mv(savePath); imageUrl = `/images/${fileName}`; }
    catch (err) { console.error('Image save error', err); return res.status(500).send('Rasm saqlashda xatolik'); }
  }

  const foods = safeReadJSON(FOODS_FILE);
  foods.push({ id: Date.now(), name, description, price, category, image: imageUrl, new: true });
  safeWriteJSON(FOODS_FILE, foods);
  res.redirect('/admin');
});

// --- Start server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}, NODE_ENV=${process.env.NODE_ENV || 'dev'}`));
