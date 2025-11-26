const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const PORT = 3000;

// Configuração do WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "pyramid-ti-system"
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let whatsappReady = false;

// Eventos do WhatsApp Client
client.on('qr', (qrCode) => {
    console.log('\n🔗 ESCANEIE O QR CODE COM SEU WHATSAPP:');
    console.log('📱 Abra o WhatsApp > Menu (3 pontinhos) > WhatsApp Web > Escanear código');
    qrcode.generate(qrCode, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto para enviar mensagens!');
    whatsappReady = true;
});

client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação do WhatsApp:', msg);
});

client.on('disconnected', (reason) => {
    console.log('📱 WhatsApp desconectado:', reason);
    whatsappReady = false;
});

// Inicializar WhatsApp Client
console.log('🚀 Iniciando conexão com WhatsApp...');
client.initialize();

// Função para enviar mensagem diretamente
async function enviarMensagemDireta(dados) {
    const numeroTI = process.env.WHATSAPP_TI || '5511993225739';
    
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

    try {
        // Formato do número: numero@c.us
        const chatId = `${numeroTI}@c.us`;
        
        await client.sendMessage(chatId, mensagem);
        console.log(`✅ Mensagem enviada diretamente para ${numeroTI}`);
        return { success: true, message: '✅ Chamado enviado diretamente para o WhatsApp!' };
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        return { success: false, message: '❌ Erro ao enviar para WhatsApp. Tente novamente.' };
    }
}

// Servidor HTTP
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
    } else if (pathname === '/status') {
        // Status do WhatsApp
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            whatsappReady, 
            message: whatsappReady ? 'WhatsApp conectado' : 'WhatsApp não conectado' 
        }));
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
                
                if (!whatsappReady) {
                    console.log('⚠️ WhatsApp não está conectado');
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: '❌ WhatsApp não conectado. Escaneie o QR Code no console.' 
                    }));
                    return;
                }

                // Enviar mensagem diretamente
                const resultado = await enviarMensagemDireta(dados);
                
                const statusCode = resultado.success ? 200 : 500;
                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(resultado));
                
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
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log('📱 Aguardando conexão com WhatsApp...');
});

server.on('error', (err) => {
    console.error('Erro no servidor:', err);
});

// Tratamento de erros
process.on('uncaughtException', (err) => {
    console.error('Erro não capturado:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Promise rejeitada:', err);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Finalizando servidor e WhatsApp...');
    client.destroy();
    server.close(() => {
        process.exit(0);
    });
});

console.log('✅ Servidor WhatsApp iniciado!');