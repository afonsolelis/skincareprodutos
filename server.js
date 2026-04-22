require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');

const Product = require('./models/Product');
const { cloudinary, upload } = require('./config/cloudinary');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

// ---------- Páginas ----------
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  if (req.session.authed) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', requireAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------- Auth ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'credenciais inválidas' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth/me', (req, res) => {
  res.json({ authed: !!(req.session && req.session.authed) });
});

// ---------- Produtos (público) ----------
app.get('/api/products', async (_req, res) => {
  try {
    const items = await Product.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao listar produtos' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const item = await Product.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'não encontrado' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: 'id inválido' });
  }
});

// ---------- Produtos (admin) ----------
app.post(
  '/api/products',
  requireAuth,
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, description, price } = req.body;
      if (!req.file) return res.status(400).json({ error: 'imagem obrigatória' });
      if (!name || !description) {
        return res.status(400).json({ error: 'nome e descrição obrigatórios' });
      }
      const product = await Product.create({
        name,
        description,
        price: price || '',
        imageUrl: req.file.path,
        imagePublicId: req.file.filename,
      });
      res.status(201).json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'erro ao criar produto' });
    }
  }
);

app.put(
  '/api/products/:id',
  requireAuth,
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, description, price } = req.body;
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'não encontrado' });

      if (name !== undefined) product.name = name;
      if (description !== undefined) product.description = description;
      if (price !== undefined) product.price = price;

      if (req.file) {
        if (product.imagePublicId) {
          try {
            await cloudinary.uploader.destroy(product.imagePublicId);
          } catch (_) {}
        }
        product.imageUrl = req.file.path;
        product.imagePublicId = req.file.filename;
      }

      await product.save();
      res.json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'erro ao atualizar produto' });
    }
  }
);

app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'não encontrado' });
    if (product.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(product.imagePublicId);
      } catch (_) {}
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'erro ao remover produto' });
  }
});

// ---------- Healthcheck ----------
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'erro interno' });
});

// ---------- Bootstrap ----------
async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI não definida');
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoUri);
    console.log('mongo conectado');
  } catch (err) {
    console.error('falha conectando no mongo:', err.message);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`server em :${PORT}`));
}

start();
