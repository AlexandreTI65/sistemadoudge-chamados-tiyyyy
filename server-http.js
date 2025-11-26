const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
require('dotenv').config();

const PORT = 3000;

// Configuração do WhatsApp
// Número da TI da Pyramid (substitua pelo número real)
const WHATSAPP_TI = process.env.WHATSAPP_TI || '5511999999999'; // Formato: 55 + DDD + número

// Função para enviar mensagem via WhatsApp Web
function enviarWhatsApp(dados) {
  const mensagem = `🎫 *NOVO CHAMADO DE T.I.*

👤 *SOLICITANTE:*
• Nome: ${dados.nome}
• Setor: ${dados.setor}
• Ramal: ${dados.ramal || 'Não informado'}

🛠️ *CHAMADO:*
• Tipo: ${dados.tipo}
• Título: ${dados.titulo}
• Prioridade: ${dados.prioridade}

📝 *DESCRIÇÃO:*
${dados.descricao}

📅 *Data/Hora:* ${new Date().toLocaleString('pt-BR')}

_Sistema de Chamados - Pyramid Diamantados_`;

  // Codificar mensagem para URL
  const mensagemCodificada = encodeURIComponent(mensagem);
  
  // URL do WhatsApp Web
  const whatsappURL = `https://wa.me/${WHATSAPP_TI}?text=${mensagemCodificada}`;
  
  return {
    url: whatsappURL,
    mensagem: mensagem
  };
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    // Servir o arquivo HTML
    const filePath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Arquivo não encontrado');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (pathname === '/enviar-chamado' && req.method === 'POST') {
    // Processar envio de chamado
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const dados = JSON.parse(body);
        
        console.log('📨 Chamado recebido:');
        console.log('Nome:', dados.nome);
        console.log('Setor:', dados.setor);
        console.log('Tipo:', dados.tipo);
        console.log('Título:', dados.titulo);
        console.log('Prioridade:', dados.prioridade);
        console.log('Descrição:', dados.descricao);
        console.log('Data:', new Date().toLocaleString());
        console.log('-------------------');
        
        // Gerar mensagem para WhatsApp
        const whatsappData = enviarWhatsApp(dados);
        
        console.log('📱 WhatsApp URL gerada:');
        console.log(whatsappData.url);
        console.log('\n� Mensagem formatada:');
        console.log(whatsappData.mensagem);
        console.log('-------------------');
        
        // Retornar resposta com link do WhatsApp
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: '✅ Chamado processado! Redirecionando para WhatsApp...',
          whatsappUrl: whatsappData.url
        }));
        
      } catch (error) {
        console.error('Erro ao processar chamado:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: '❌ Erro ao processar chamado' 
        }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Página não encontrada');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP rodando em http://localhost:${PORT}`);
  console.log('💡 Pressione Ctrl+C para parar o servidor');
});

server.on('error', (err) => {
  console.error('Erro no servidor:', err);
});

// Manter o processo ativo e tratamento de erros
process.on('uncaughtException', (err) => {
  console.error('Erro não capturado:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Promise rejeitada:', err);
});

console.log('✅ Servidor pronto para receber chamados!');