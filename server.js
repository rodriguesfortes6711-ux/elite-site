const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Conexão segura com o Neon
let pool;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    console.log("Conectado ao Neon!");
} else {
    console.log("AVISO: Variável DATABASE_URL não encontrada. Banco de dados não irá funcionar.");
}

// Rota de teste (Para saber se subiu)
app.get('/api/health', (req, res) => {
    res.json({ status: 'Servidor no ar!', db: pool ? 'Neon Conectado' : 'Sem Banco' });
});

// Rota de teste do banco
app.get('/api/test-db', async (req, res) => {
    if(!pool) return res.json({ erro: "Banco não configurado no Render" });
    try {
        const result = await pool.query('SELECT current_database(), current_user');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});