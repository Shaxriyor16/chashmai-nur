const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

// Static papka
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// SQLite baza
const db = new sqlite3.Database("./data.db");

// Jadval yaratish
db.run(`CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    price INTEGER,
    image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Rasm yuklash
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Ovqat qo‘shish (admin)
app.post("/add-food", upload.single("image"), (req, res) => {
  const { name, description, price } = req.body;
  const image = "/uploads/" + req.file.filename;

  db.run(`INSERT INTO foods (name, description, price, image) VALUES (?, ?, ?, ?)`,
    [name, description, price, image],
    (err) => {
      if (err) return res.status(500).send("Xatolik!");
      res.redirect("/admin.html");
    }
  );
});

// Ovqatlarni olish (foydalanuvchi menyu uchun)
app.get("/foods", (req, res) => {
  db.all("SELECT * FROM foods ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).send("Xatolik!");
    res.json(rows);
  });
});

app.listen(PORT, () => console.log(`Server http://localhost:${PORT} da ishlayapti`));
