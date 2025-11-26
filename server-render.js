const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
require('dotenv').config();

// Configuração da porta (Render usa variável de ambiente)
const PORT = process.env.PORT || 3000;

// Configurações da UltraMsg (usando variáveis de ambiente para segurança)
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || 'ynquqp53ffqmu94z';
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || 'instance145584';
const WHATSAPP_TI = process.env.WHATSAPP_TI || '5511993225739';

// Log de inicialização
console.log('🚀 Iniciando sistema...');
console.log('📡 Ambiente:', process.env.NODE_ENV || 'development');
console.log('🔌 Porta:', PORT);

// Função para limpar número de telefone
function limparNumero(numero) {
    if (!numero) return '';
    
    let limpo = numero.replace(/\D/g, '');
    
    if (limpo.startsWith('0')) {
        limpo = limpo.substring(1);
    }
    
    if (limpo.length === 11 && limpo.startsWith('11')) {
        limpo = '55' + limpo;
    } else if (limpo.length === 10) {
        limpo = '5511' + limpo;
    } else if (limpo.length === 9) {
        limpo = '55119' + limpo;
    }
    
    return limpo;
}

// Função para enviar mensagem via UltraMsg API
function enviarMensagemWhatsApp(numeroDestino, mensagem, tipoMensagem = 'mensagem') {
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify({
            token: ULTRAMSG_TOKEN,
            to: numeroDestino,
            body: mensagem
        });

        const options = {
            hostname: 'api.ultramsg.com',
            port: 443,
            path: `/${ULTRAMSG_INSTANCE}/messages/chat`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`📡 Enviando ${tipoMensagem} para: ${numeroDestino}`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📱 ${tipoMensagem} - Status: ${res.statusCode}`);
                
                try {
                    const resposta = JSON.parse(data);
                    
                    if (resposta.sent === true || resposta.sent === 'true' || resposta.id) {
                        console.log(`✅ ${tipoMensagem.toUpperCase()} ENVIADO!`);
                        resolve({
                            success: true,
                            message: `✅ ${tipoMensagem} enviado!`,
                            response: resposta
                        });
                    } else if (resposta.error) {
                        console.log(`⚠️ Erro ${tipoMensagem}:`, resposta.error);
                        resolve({
                            success: false,
                            message: `⚠️ Erro: ${resposta.error}`,
                            response: resposta
                        });
                    } else {
                        resolve({
                            success: true,
                            message: `✅ ${tipoMensagem} processado!`,
                            response: resposta
                        });
                    }
                } catch (parseError) {
                    if (res.statusCode === 200) {
                        resolve({
                            success: true,
                            message: `✅ ${tipoMensagem} enviado!`,
                            response: data
                        });
                    } else {
                        resolve({
                            success: false,
                            message: `⚠️ Erro ${tipoMensagem}`,
                            response: data
                        });
                    }
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ Erro ${tipoMensagem}:`, error.message);
            reject({
                success: false,
                message: `❌ Erro de conexão`,
                error: error.message
            });
        });

        req.write(postData);
        req.end();
    });
}

// Função para enviar chamado para T.I.
async function enviarChamadoTI(dados) {
    const mensagem = `🎫 *NOVO CHAMADO DE T.I.*

👤 *SOLICITANTE:*
• Nome: ${dados.nome}
• Setor: ${dados.setor}
• Ramal: ${dados.ramal || 'Não informado'}
• Celular: ${dados.celular || 'Não informado'}

🛠️ *CHAMADO:*
• Tipo: ${dados.tipo}
• Título: ${dados.titulo}
• Prioridade: ${dados.prioridade}

📝 *DESCRIÇÃO:*
${dados.descricao}

📅 *Data/Hora:* ${new Date().toLocaleString('pt-BR')}

_Sistema Online - Pyramid Diamantados_`;

    return await enviarMensagemWhatsApp(WHATSAPP_TI, mensagem, 'Chamado T.I.');
}

// Função para enviar confirmação para solicitante
async function enviarConfirmacaoSolicitante(dados) {
    const numeroLimpo = limparNumero(dados.celular);
    
    if (!numeroLimpo || numeroLimpo.length < 10) {
        return {
            success: false,
            message: 'Número inválido'
        };
    }

    const protocolo = Date.now().toString().slice(-6);

    const mensagem = `✅ *SOLICITAÇÃO RECEBIDA COM SUCESSO!*

Olá *${dados.nome}*! 👋

Sua solicitação foi *RECEBIDA* pela T.I. da Pyramid Diamantados.

📋 *RESUMO:*
• Título: ${dados.titulo}
• Tipo: ${dados.tipo}
• Prioridade: ${dados.prioridade}
• Protocolo: #${protocolo}

⏰ *PRÓXIMOS PASSOS:*
• Nossa equipe analisará sua solicitação
• Você será contatado em breve
• Tempo estimado: até 24h

📞 *CONTATO T.I.:*
• WhatsApp: (11) 99322-5739

🔄 *Status:* Em análise

_Obrigado por utilizar nosso sistema!_
*Pyramid Diamantados - T.I.*`;

    return await enviarMensagemWhatsApp(numeroLimpo, mensagem, 'Confirmação');
}

// Servidor HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Página principal
    if (pathname === '/' || pathname === '/index.html') {
        const filePath = path.join(__dirname, 'public', 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Página não encontrada');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    } 
    // Health check para Render
    else if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
    }
    // Endpoint principal para enviar chamados
    else if (pathname === '/enviar-chamado' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const dados = JSON.parse(body);
                
                console.log(`\n📨 NOVO CHAMADO:`);
                console.log(`👤 ${dados.nome} (${dados.setor})`);
                console.log(`📱 ${dados.celular}`);
                console.log(`🛠️ ${dados.tipo}: ${dados.titulo}`);
                
                try {
                    console.log('🚀 Processando envios...');
                    
                    // Envios paralelos para otimizar velocidade
                    const [resultadoTI, resultadoCliente] = await Promise.all([
                        enviarChamadoTI(dados),
                        enviarConfirmacaoSolicitante(dados)
                    ]);
                    
                    const sucessoTI = resultadoTI.success;
                    const sucessoCliente = resultadoCliente.success;
                    
                    let mensagemFinal = '';
                    if (sucessoTI && sucessoCliente) {
                        mensagemFinal = '🎉 Chamado enviado para T.I. e confirmação enviada!';
                    } else if (sucessoTI) {
                        mensagemFinal = '✅ Chamado enviado para T.I. (erro na confirmação)';
                    } else if (sucessoCliente) {
                        mensagemFinal = '⚠️ Confirmação enviada (erro no envio T.I.)';
                    } else {
                        mensagemFinal = '❌ Erro nos envios';
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: sucessoTI || sucessoCliente,
                        message: mensagemFinal,
                        timestamp: new Date().toLocaleString('pt-BR')
                    }));
                    
                    console.log(`✅ ${mensagemFinal}`);
                    
                } catch (error) {
                    console.error('❌ Erro no processamento:', error);
                    
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        message: '❌ Erro interno do servidor'
                    }));
                }
                
            } catch (error) {
                console.error('❌ Erro JSON:', error);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: '❌ Dados inválidos'
                }));
            }
        });
    } 
    // 404
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Página não encontrada');
    }
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
    console.log('\n🏢 SISTEMA DE CHAMADOS T.I. - PYRAMID DIAMANTADOS');
    console.log('🌐 HOSPEDAGEM: RENDER.COM');
    console.log('='  .repeat(60));
    console.log(`🔌 Porta: ${PORT}`);
    console.log(`📱 WhatsApp T.I.: +55${WHATSAPP_TI}`);
    console.log(`🏢 Instance: ${ULTRAMSG_INSTANCE}`);
    console.log(`🔑 Token: ${ULTRAMSG_TOKEN.substring(0, 8)}...`);
    console.log('='  .repeat(60));
    console.log('✅ SERVIDOR ONLINE NO RENDER!');
    console.log('🌍 Acessível de qualquer lugar do mundo!');
    console.log('⚡ Sistema em produção funcionando 24/7!');
    console.log('\n🎯 Aguardando chamados...\n');
});

// Tratamento de erros
server.on('error', (err) => {
    console.error('❌ Erro no servidor:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Desligando servidor...');
    server.close(() => {
        console.log('✅ Servidor desligado');
        process.exit(0);
    });
});

console.log('🔄 Iniciando servidor para Render...');