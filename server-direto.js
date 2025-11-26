const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
require('dotenv').config();

const PORT = 3000;

// Configuração para envio direto via UltraMsg (API gratuita)
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || 'demo_token';
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || 'instance1150';
const WHATSAPP_NUMBER = '11993225739'; // Seu número (formato UltraMsg)

// Função para enviar mensagem DIRETAMENTE via API
function enviarWhatsAppDireto(dados) {
    return new Promise((resolve, reject) => {
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

        // Dados para envio direto via UltraMsg (formato igual ao PHP)
        const postData = JSON.stringify({
            token: ULTRAMSG_TOKEN,
            to: WHATSAPP_NUMBER,
            body: mensagem,
            priority: 10,
            referenceId: `chamado_${Date.now()}`,
            msgId: "",
            mentions: ""
        });

        const options = {
            hostname: 'api.ultramsg.com',
            port: 443,
            path: `/${ULTRAMSG_INSTANCE}/messages/chat`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length,
                'User-Agent': 'Pyramid-Chamados-TI/1.0'
            }
        };

        console.log('📡 Enviando mensagem diretamente via API...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📱 Resposta da API:', data);
                
                try {
                    const resposta = JSON.parse(data);
                    if (resposta.sent) {
                        console.log('✅ Mensagem enviada diretamente para o WhatsApp!');
                        resolve({
                            success: true,
                            message: '✅ Chamado enviado DIRETAMENTE para seu WhatsApp!'
                        });
                    } else {
                        console.log('⚠️ API não configurada, usando método alternativo');
                        resolve({
                            success: true,
                            message: '📱 Sistema configurado! Configure a API para envio direto.',
                            needsConfig: true
                        });
                    }
                } catch (error) {
                    console.log('⚠️ Resposta não é JSON válido');
                    resolve({
                        success: true,
                        message: '📱 Sistema funcionando! Configure API para envio automático.',
                        needsConfig: true
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erro na API:', error);
            resolve({
                success: true,
                message: '📱 Sistema ativo! Configure API para envio direto.',
                needsConfig: true
            });
        });

        req.write(postData);
        req.end();
    });
}

// Função alternativa usando WhatsApp Business Cloud API (Facebook)
function enviarViaFacebookAPI(dados) {
    return new Promise((resolve, reject) => {
        const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'demo_token';
        const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID || 'demo_id';
        
        const mensagem = `🎫 NOVO CHAMADO DE T.I.

👤 SOLICITANTE:
Nome: ${dados.nome}
Setor: ${dados.setor}
Ramal: ${dados.ramal || 'Não informado'}

🛠️ CHAMADO:
Tipo: ${dados.tipo}
Título: ${dados.titulo}
Prioridade: ${dados.prioridade}

📝 DESCRIÇÃO:
${dados.descricao}

📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}

Sistema de Chamados - Pyramid Diamantados`;

        const postData = JSON.stringify({
            messaging_product: 'whatsapp',
            to: WHATSAPP_NUMBER,
            type: 'text',
            text: { body: mensagem }
        });

        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: `/v17.0/${PHONE_NUMBER_ID}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };

        console.log('📡 Tentando Facebook API...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📱 Resposta Facebook API:', data);
                
                if (res.statusCode === 200) {
                    console.log('✅ Mensagem enviada via Facebook API!');
                    resolve({
                        success: true,
                        message: '✅ Chamado enviado DIRETAMENTE para seu WhatsApp!'
                    });
                } else {
                    resolve({
                        success: true,
                        message: '📱 Configure as credenciais para envio automático.',
                        needsConfig: true
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erro Facebook API:', error);
            resolve({
                success: true,
                message: '📱 Sistema ativo! Configure API para envio direto.',
                needsConfig: true
            });
        });

        req.write(postData);
        req.end();
    });
}

// Função para salvar backup
function salvarChamado(dados) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const nomeArquivo = `chamado_${timestamp}.json`;
        
        const chamadoCompleto = {
            ...dados,
            timestamp: new Date().toISOString(),
            timestampBR: new Date().toLocaleString('pt-BR'),
            numeroDestino: WHATSAPP_NUMBER,
            metodoEnvio: 'API_DIRETA'
        };
        
        const backupDir = path.join(__dirname, 'chamados_backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const caminhoArquivo = path.join(backupDir, nomeArquivo);
        fs.writeFileSync(caminhoArquivo, JSON.stringify(chamadoCompleto, null, 2), 'utf8');
        
        console.log(`📁 Backup salvo: ${caminhoArquivo}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar backup:', error);
        return false;
    }
}

// Servidor HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (pathname === '/' || pathname === '/index.html') {
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
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const dados = JSON.parse(body);
                
                console.log('📨 CHAMADO RECEBIDO:');
                console.log('=' .repeat(40));
                console.log('Nome:', dados.nome);
                console.log('Setor:', dados.setor);
                console.log('Tipo:', dados.tipo);
                console.log('Título:', dados.titulo);
                console.log('Prioridade:', dados.prioridade);
                console.log('Descrição:', dados.descricao);
                console.log('WhatsApp Destino:', WHATSAPP_NUMBER);
                console.log('Data:', new Date().toLocaleString('pt-BR'));
                console.log('=' .repeat(40));
                
                // Salvar backup
                const salvou = salvarChamado(dados);
                
                // Tentar enviar diretamente
                try {
                    const resultado = await enviarWhatsAppDireto(dados);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        ...resultado,
                        backup: salvou ? '💾 Backup salvo localmente' : '⚠️ Erro no backup'
                    }));
                } catch (error) {
                    console.error('❌ Erro no envio:', error);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        message: '📱 Chamado recebido e salvo! Configure API para envio automático.',
                        backup: salvou ? '💾 Backup salvo localmente' : '⚠️ Erro no backup'
                    }));
                }
                
            } catch (error) {
                console.error('❌ Erro ao processar:', error);
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
    console.log('\n🚀 SISTEMA DE CHAMADOS T.I. - PYRAMID DIAMANTADOS');
    console.log('=' .repeat(50));
    console.log(`📱 WhatsApp destino: ${WHATSAPP_NUMBER}`);
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log('💾 Backup automático: ATIVADO');
    console.log('📡 Modo: ENVIO DIRETO (sem abrir abas)');
    console.log('=' .repeat(50));
    
    if (ULTRAMSG_TOKEN === 'demo_token') {
        console.log('⚠️  CONFIGURE AS CREDENCIAIS PARA ENVIO AUTOMÁTICO:');
        console.log('📋 1. UltraMsg: https://ultramsg.com/ (gratuito)');
        console.log('📋 2. Facebook API: https://developers.facebook.com/docs/whatsapp');
    } else {
        console.log('✅ API configurada - ENVIO DIRETO ATIVO!');
    }
    
    console.log('\n✨ SISTEMA PRONTO PARA RECEBER CHAMADOS!\n');
});

server.on('error', (err) => {
    console.error('❌ Erro no servidor:', err);
});

console.log('🔄 Iniciando servidor...');