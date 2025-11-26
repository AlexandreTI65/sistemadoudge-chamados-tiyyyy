const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
require('dotenv').config();

const PORT = 3000;

// Configuração da API CallMeBot (gratuita para WhatsApp)
const WHATSAPP_API_URL = 'https://api.callmebot.com/whatsapp.php';
const WHATSAPP_NUMBER = '5511993225739'; // Seu número
const API_KEY = process.env.CALLMEBOT_API_KEY || 'sua_chave_api'; // Você precisa gerar essa chave

// Função para enviar mensagem direta via API
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

        // Parâmetros para a API
        const params = querystring.stringify({
            phone: WHATSAPP_NUMBER,
            text: mensagem,
            apikey: API_KEY
        });

        const urlCompleta = `${WHATSAPP_API_URL}?${params}`;

        console.log('📡 Enviando para API CallMeBot...');
        
        // Fazer requisição HTTPS
        https.get(urlCompleta, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                console.log('📱 Resposta da API:', data);
                
                if (data.includes('Message sent successfully') || response.statusCode === 200) {
                    console.log('✅ Mensagem enviada com sucesso!');
                    resolve({
                        success: true,
                        message: '✅ Chamado enviado diretamente para seu WhatsApp!'
                    });
                } else {
                    console.log('⚠️ Resposta inesperada da API');
                    resolve({
                        success: false,
                        message: '⚠️ Possível problema no envio. Verifique a configuração da API.'
                    });
                }
            });
        }).on('error', (error) => {
            console.error('❌ Erro na API:', error);
            reject({
                success: false,
                message: '❌ Erro ao conectar com a API do WhatsApp.'
            });
        });
    });
}

// Função alternativa: usar WhatAPI (outra opção gratuita)
function enviarViaWhatAPI(dados) {
    return new Promise((resolve, reject) => {
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

        // URL da WhatAPI (gratuita)
        const apiUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(mensagem)}`;
        
        console.log('📱 Link WhatsApp gerado:', apiUrl);
        
        // Como é uma API de redirecionamento, sempre retorna sucesso
        resolve({
            success: true,
            message: '✅ Chamado processado! Link WhatsApp gerado.',
            whatsappUrl: apiUrl
        });
    });
}

// Função para salvar backup local
function salvarChamado(dados) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const nomeArquivo = `chamado_${timestamp}.json`;
        
        const chamadoCompleto = {
            ...dados,
            timestamp: new Date().toISOString(),
            timestampBR: new Date().toLocaleString('pt-BR'),
            numeroDestino: WHATSAPP_NUMBER
        };
        
        // Criar pasta de backup se não existir
        const backupDir = path.join(__dirname, 'chamados_backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        // Salvar arquivo JSON
        const caminhoArquivo = path.join(backupDir, nomeArquivo);
        fs.writeFileSync(caminhoArquivo, JSON.stringify(chamadoCompleto, null, 2), 'utf8');
        
        console.log(`📁 Chamado salvo em: ${caminhoArquivo}`);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar chamado:', error);
        return false;
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
                console.log('Destino:', WHATSAPP_NUMBER);
                console.log('-------------------');
                
                // Salvar backup local
                const salvou = salvarChamado(dados);
                
                try {
                    // Tentar enviar pela API direta (se tiver chave configurada)
                    if (API_KEY && API_KEY !== 'sua_chave_api') {
                        const resultado = await enviarWhatsAppDireto(dados);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            ...resultado,
                            backup: salvou ? 'Chamado salvo em backup local' : 'Erro ao salvar backup'
                        }));
                    } else {
                        // Usar método de link direto
                        const resultado = await enviarViaWhatAPI(dados);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            ...resultado,
                            backup: salvou ? 'Chamado salvo em backup local' : 'Erro ao salvar backup'
                        }));
                    }
                } catch (error) {
                    console.error('❌ Erro no envio:', error);
                    
                    // Fallback: usar link direto
                    const resultado = await enviarViaWhatAPI(dados);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        ...resultado,
                        backup: salvou ? 'Chamado salvo em backup local' : 'Erro ao salvar backup'
                    }));
                }
                
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
    console.log(`📱 WhatsApp configurado para: ${WHATSAPP_NUMBER}`);
    console.log('💾 Backup automático ativado');
    
    if (API_KEY === 'sua_chave_api') {
        console.log('⚠️  Para API direta, configure CALLMEBOT_API_KEY no arquivo .env');
        console.log('📋 Instruções: https://www.callmebot.com/blog/free-api-whatsapp-messages/');
    } else {
        console.log('🔑 API Key configurada - envio direto ativado');
    }
    
    console.log('✨ Sistema pronto para uso!');
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

console.log('✅ Servidor WhatsApp API iniciado!');