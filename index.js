const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const faceapi = require('face-api.js');

// Inicializa o app Express
const app = express();
app.use(bodyParser.json());

// Configura a conexão com o banco PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'reconhecimento_facial',
  password: 'ds564',
  port: 7007,
});

// Cria a pasta para armazenar as imagens, se ainda não existir
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configura o Multer para lidar com uploads de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext); // Nome único para a imagem
  }
});

const upload = multer({ storage: storage });

// Rota inicial
app.get('/', async (req, res) => {
  res.send('Tudo certo!');
});

// Rota para upload de imagem e cadastro da pessoa no banco de dados
app.post('/api/pessoa', upload.single('image'), async (req, res) => {
  const { nome, descritorFacial} = req.body;
  const file = req.file;

  console.log(nome, descritorFacial);
  console.log(file);

  if (!file) {
    return res.status(400).send('Nenhuma imagem enviada.');
  }

  try {
    // Gera a URL da imagem
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

    // Insere as informações no banco de dados
    const result = await pool.query(
      'INSERT INTO pessoas (nome, caminho_imagem, descritor_facial) VALUES ($1, $2, $3) RETURNING *',
      [nome, imageUrl, descritorFacial]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao inserir pessoa no banco de dados' });
  }
});

// Rota para buscar todas as pessoas do banco de dados
app.get('/api/pessoas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pessoas');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pessoas no banco de dados' });
  }
});

// Servir arquivos estáticos (imagens)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Iniciar o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
