const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// --- LOGIN QO‘SHILDI ---
const ADMIN_PHONE_FULL = "+998996479888"; // admin telefon raqami (to‘liq format)
const ADMIN_PASS = "1234"; // admin parol

// Sessiya sozlamalari
app.use(session({
  secret: "mening_sirli_kalit", 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Static fayllar
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ovqatlar fayli
const foodsFile = path.join(__dirname, 'foods.json');

// Helper funksiyalar
function onlyDigits(str) {
  return (str || "").toString().replace(/\D/g, "");
}
function normalizePhoneInput(input) {
  if (!input) return "";
  let digits = onlyDigits(input);

  if (digits.length === 12 && digits.startsWith("998")) {
    return "+" + digits;
  }
  if (digits.length === 9) {
    return "+998" + digits;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return "+998" + digits.slice(1);
  }
  if (digits.length >= 11 && digits.startsWith("998")) {
    return "+" + digits.slice(0, 12);
  }
  return "";
}

// --- LOGIN ROUTES ---
app.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const normalized = normalizePhoneInput(username);

  if (normalized === ADMIN_PHONE_FULL && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    req.session.adminUser = normalized;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Login yoki parol xato' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// INDEX ROUTE
app.get('/', (req, res) => {
  let foods = [];
  if (fs.existsSync(foodsFile)) {
    foods = JSON.parse(fs.readFileSync(foodsFile));
  }
  res.render('index', { foods });
});

// ADMIN PANEL (faqat login bo‘lsa)
app.get('/admin', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/login');
  }
  res.render('admin');
});

// OVQAT QO‘SHISH
app.post('/add-food', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/login');
  }

  const { name, description, price, category } = req.body;
  const image = req.files?.image;

  if (!name || !description || !price || !image || !category) {
    return res.send('Barcha maydonlarni to‘ldiring!');
  }

  // Rasmni saqlash
  const imageName = Date.now() + path.extname(image.name);
  const imagePath = path.join(__dirname, 'public', 'images', imageName);
  image.mv(imagePath, (err) => {
    if (err) return res.status(500).send(err);

    // Foods.json faylini o‘qish
    let foods = [];
    if (fs.existsSync(foodsFile)) {
      foods = JSON.parse(fs.readFileSync(foodsFile));
    }

    foods.push({
      name,
      description,
      price,
      image: '/images/' + imageName,
      category,
      new: true
    });

    fs.writeFileSync(foodsFile, JSON.stringify(foods, null, 2));
    res.redirect('/admin');
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
