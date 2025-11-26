const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Rota para servir a página inicial
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// SMTP2GO config
const transporter = nodemailer.createTransport({
  host: 'mail.smtp2go.com',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.post('/enviar-chamado', async (req, res) => {
  const { nome, setor, ramal, tipo, titulo, prioridade, descricao } = req.body;

  console.log('📨 Recebendo chamado:', { nome, setor, tipo, titulo });

  // Verificar se as credenciais SMTP estão configuradas
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'seu_usuario_smtp2go') {
    console.log('⚠️  Credenciais SMTP não configuradas - simulando envio');
    
    // Log do chamado para fins de teste
    console.log('--- CHAMADO RECEBIDO ---');
    console.log(`Nome: ${nome}`);
    console.log(`Setor: ${setor}`);
    console.log(`Ramal: ${ramal || 'Não informado'}`);
    console.log(`Tipo: ${tipo}`);
    console.log(`Título: ${titulo}`);
    console.log(`Prioridade: ${prioridade}`);
    console.log(`Descrição: ${descricao}`);
    console.log(`Data: ${new Date().toLocaleString()}`);
    console.log('----------------------');
    
    return res.json({ success: true, message: '✅ Chamado recebido! (Configure as credenciais SMTP para envio real)' });
  }

  const mailOptions = {
    from: '"Chamados T.I." <noreply@pyramiddiamantados.com.br>',
    to: 'ti@pyramiddiamantados.com.br',
    subject: `Chamado T.I.: ${titulo}`,
    html: `
      <h2>Novo Chamado T.I.</h2>
      <p><strong>Nome:</strong> ${nome}</p>
      <p><strong>Setor:</strong> ${setor}</p>
      <p><strong>Ramal:</strong> ${ramal || 'Não informado'}</p>
      <p><strong>Tipo:</strong> ${tipo}</p>
      <p><strong>Prioridade:</strong> ${prioridade}</p>
      <p><strong>Descrição:</strong><br>${(descricao || '').replace(/\n/g, '<br>')}</p>
      <p><em>Enviado em ${new Date().toLocaleString()}</em></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ E-mail enviado com sucesso!');
    res.json({ success: true, message: '✅ Chamado enviado com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
    res.status(500).json({ success: false, message: '❌ Erro ao enviar chamado.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
