const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para testar se o servidor está funcionando
app.get('/test', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando!' });
});

// Rota para receber chamados
app.post('/enviar-chamado', (req, res) => {
  const { nome, setor, ramal, tipo, titulo, prioridade, descricao } = req.body;
  
  console.log('📨 Chamado recebido:');
  console.log('Nome:', nome);
  console.log('Setor:', setor);
  console.log('Tipo:', tipo);
  console.log('Título:', titulo);
  console.log('Prioridade:', prioridade);
  console.log('Descrição:', descricao);
  console.log('-------------------');
  
  // Simular sucesso (sem envio de e-mail por enquanto)
  res.json({ 
    success: true, 
    message: '✅ Chamado recebido com sucesso!' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log('💡 Pressione Ctrl+C para parar o servidor');
});

// Manter o processo ativo
process.on('SIGINT', () => {
  console.log('\n👋 Servidor sendo finalizado...');
  process.exit(0);
});