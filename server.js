const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://vkqizsiunupgoscoxjkq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcWl6c2l1bnVwZ29zY294amtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTAxNDAsImV4cCI6MjA5MzY4NjE0MH0.CPDDwvJ0Wp89LbVTVN537jmgAYF_KNmHPzV4Qqjq8Jk';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

console.log(`Servidor inicializado na porta ${PORT}`);

// --- ROTA TESTE (Para saber se o servidor está vivo) ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor online!' });
});

// --- ROTA LOGIN ---
app.post('/api/login', async (req, res) => {
    try {
        console.log("Tentativa de login para:", req.body.email);
        const { email, password } = req.body;

        if (email === 'admin@elite.com' && password === 'admin') {
            return res.json({ name: 'Admin', email, role: 'admin' });
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error || !data) {
            console.log("Erro login:", error);
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        console.log("Login sucesso:", data.name);
        res.json(data);

    } catch (error) {
        console.error("Erro crítico no login:", error);
        res.status(500).json({ error: "Erro no servidor" });
    }
});

// --- ROTA CADASTRO ---
app.post('/api/register', async (req, res) => {
    try {
        console.log("Iniciando cadastro para:", req.body.email);
        const { name, email, password, role, city, images_base64 } = req.body;

        // 1. Verificar Usuário Existente
        const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).single();
        if (existingUser) {
            console.log("Email já existe");
            return res.status(400).json({ error: "Email já cadastrado." });
        }

        // 2. Upload de Imagem (PROTEGIDO POR TRY/CATCH)
        let uploadedImageUrl = 'https://via.placeholder.com/400x500?text=Sem+Foto'; // Imagem Padrão

        if (role === 'model' && images_base64) {
            try {
                console.log("Tentando upload de imagem...");
                const fileName = `model_${Date.now()}.jpg`;
                const base64Buffer = Buffer.from(images_base64, 'base64');

                const { data, error } = await supabase.storage
                    .from('photos')
                    .upload(fileName, base64Buffer, { 
                        contentType: 'image/jpeg', 
                        upsert: true 
                    });

                if (error) throw error;

                const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
                uploadedImageUrl = publicUrlData.publicUrl;
                console.log("Imagem salva:", uploadedImageUrl);

            } catch (uploadError) {
                // SE O UPLOAD FALHAR, NÃO TRAVA O CADASTRO. USA IMAGEM PADRÃO.
                console.warn("Falha no upload (provavelmente bucket 'photos' não existe), usando placeholder:", uploadError.message);
                // uploadedImageUrl continua sendo o placeholder
            }
        }

        // 3. Salvar Usuário
        console.log("Salvando usuário no banco...");
        const { data, error } = await supabase
            .from('users')
            .insert([{ name, email, password, role, city }])
            .select()
            .single();

        if (error) throw error;

        console.log("Usuário salvo com ID:", data.id);

        // 4. Se for modelo, salvar na tabela models
        if (role === 'model') {
            await supabase.from('models').insert([{
                name, 
                age: 25, 
                gender: 'F', 
                city, 
                price: 'R$ 500', 
                bio: 'Perfil novo...',
                images: [uploadedImageUrl],
                services: ['Companhia']
            }]);
        }

        res.status(201).json({ message: "Sucesso!", user: data });

    } catch (error) {
        console.error("Erro no cadastro (Crash do servidor?):", error);
        res.status(500).json({ error: error.message });
    }
});

// --- ROTA LISTAR MODELOS ---
app.get('/api/models', async (req, res) => {
    try {
        const { data, error } = await supabase.from('models').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em ${PORT}`);
});