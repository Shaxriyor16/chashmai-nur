const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Static fayllar
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ovqatlar fayli
const foodsFile = path.join(__dirname, 'foods.json');

// INDEX ROUTE
app.get('/', (req, res) => {
  let foods = [];
  if (fs.existsSync(foodsFile)) {
    foods = JSON.parse(fs.readFileSync(foodsFile));
  }
  res.render('index', { foods });
});

// ADMIN PANEL
app.get('/admin', (req, res) => {
  res.render('admin');
});

// OVQAT QO‘SHISH
app.post('/add-food', (req, res) => {
  const { name, description, price } = req.body;
  const image = req.files?.image;

  if (!name || !description || !price || !image) {
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
      new: true
    });

    fs.writeFileSync(foodsFile, JSON.stringify(foods, null, 2));
    res.redirect('/admin');
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
