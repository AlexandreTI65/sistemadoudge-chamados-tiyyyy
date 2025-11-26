const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const os = require('os');
require('dotenv').config();

const PORT = 3000;

// Configurações corretas da UltraMsg
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || 'ynquqp53ffqmu94z';
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || 'instance145584';
const WHATSAPP_TI = '5511993225739'; // WhatsApp da T.I.

// Função para obter IP da máquina
function obterIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            // Pular endereços internos e não IPv4
            if (interface.family === 'IPv4' && !interface.internal) {
                ips.push(interface.address);
            }
        }
    }
    return ips;
}

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

// Função para enviar mensagem via API UltraMsg
function enviarMensagemWhatsApp(numeroDestino, mensagem, tipoMensagem = 'chamado') {
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
                        console.log(`✅ ${tipoMensagem.toUpperCase()} ENVIADO COM SUCESSO!`);
                        resolve({
                            success: true,
                            message: `✅ ${tipoMensagem} enviado!`,
                            response: resposta
                        });
                    } else if (resposta.error) {
                        console.log(`⚠️ Erro no ${tipoMensagem}:`, resposta.error);
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
                            message: `⚠️ Erro no ${tipoMensagem}`,
                            response: data
                        });
                    }
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ Erro no ${tipoMensagem}:`, error);
            reject({
                success: false,
                message: `❌ Erro de conexão - ${tipoMensagem}`,
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

_Sistema de Chamados - Pyramid Diamantados_`;

    return await enviarMensagemWhatsApp(WHATSAPP_TI, mensagem, 'CHAMADO T.I.');
}

// Função para enviar confirmação para solicitante
async function enviarConfirmacaoSolicitante(dados) {
    const numeroLimpo = limparNumero(dados.celular);
    
    if (!numeroLimpo || numeroLimpo.length < 10) {
        return {
            success: false,
            message: 'Número de celular inválido'
        };
    }

    const protocolo = Date.now().toString().slice(-6);

    const mensagem = `✅ *SOLICITAÇÃO RECEBIDA COM SUCESSO!*

Olá *${dados.nome}*! 👋

Sua solicitação de suporte foi *RECEBIDA* pela equipe de T.I. da Pyramid Diamantados.

📋 *RESUMO DA SOLICITAÇÃO:*
• Título: ${dados.titulo}
• Tipo: ${dados.tipo}
• Prioridade: ${dados.prioridade}
• Protocolo: #${protocolo}

⏰ *PRÓXIMOS PASSOS:*
• Nossa equipe irá analisar sua solicitação
• Você será contatado em breve
• Tempo estimado de resposta: até 24h

📞 *CONTATO T.I.:*
• WhatsApp: (11) 99322-5739
• Ramal: Interno

🔄 *Status:* Em análise

_Obrigado por utilizar nosso sistema!_
*Pyramid Diamantados - T.I.*`;

    return await enviarMensagemWhatsApp(numeroLimpo, mensagem, 'CONFIRMAÇÃO');
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
            numeroTI: WHATSAPP_TI,
            celularLimpo: limparNumero(dados.celular),
            protocolo: Date.now().toString().slice(-6),
            metodoEnvio: 'ULTRAMSG_API_REDE_LOCAL'
        };
        
        const backupDir = path.join(__dirname, 'chamados_backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        const caminhoArquivo = path.join(backupDir, nomeArquivo);
        fs.writeFileSync(caminhoArquivo, JSON.stringify(chamadoCompleto, null, 2), 'utf8');
        
        console.log(`📁 Backup salvo: ${nomeArquivo}`);
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

    // CORS para permitir acesso de outras máquinas
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
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Arquivo não encontrado');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
                
                console.log(`\n📨 CHAMADO RECEBIDO de: ${req.connection.remoteAddress}`);
                console.log(`👤 ${dados.nome} (${dados.setor})`);
                console.log(`📱 Celular: ${dados.celular}`);
                console.log(`🛠️ ${dados.tipo}: ${dados.titulo}`);
                
                // Salvar backup
                const salvou = salvarChamado(dados);
                
                // Enviar para T.I. e confirmação para cliente
                try {
                    console.log('🚀 Enviando mensagens...');
                    
                    const resultadoTI = await enviarChamadoTI(dados);
                    const resultadoCliente = await enviarConfirmacaoSolicitante(dados);
                    
                    const sucessoTI = resultadoTI.success;
                    const sucessoCliente = resultadoCliente.success;
                    
                    let mensagemFinal = '';
                    if (sucessoTI && sucessoCliente) {
                        mensagemFinal = '🎉 Chamado enviado para T.I. e confirmação enviada!';
                    } else if (sucessoTI) {
                        mensagemFinal = '✅ Chamado enviado para T.I. (erro na confirmação)';
                    } else if (sucessoCliente) {
                        mensagemFinal = '⚠️ Confirmação enviada, mas erro no envio para T.I.';
                    } else {
                        mensagemFinal = '❌ Erro nos envios';
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: sucessoTI || sucessoCliente,
                        message: mensagemFinal,
                        backup: salvou ? '💾 Backup salvo' : '⚠️ Erro no backup',
                        timestamp: new Date().toLocaleString('pt-BR')
                    }));
                    
                    console.log(`✅ ${mensagemFinal}`);
                    
                } catch (error) {
                    console.error('❌ Erro no envio:', error);
                    
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        message: '❌ Erro ao processar chamado',
                        backup: salvou ? '💾 Backup salvo' : '⚠️ Erro no backup'
                    }));
                }
                
            } catch (error) {
                console.error('❌ Erro ao processar:', error);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: '❌ Erro no formato dos dados'
                }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Página não encontrada');
    }
});

// Iniciar servidor escutando em todas as interfaces (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
    const ips = obterIPs();
    
    console.log('\n🏢 SISTEMA DE CHAMADOS T.I. - PYRAMID DIAMANTADOS');
    console.log('📡 HOSPEDAGEM PRÓPRIA - REDE LOCAL');
    console.log('='  .repeat(80));
    console.log(`🖥️  Servidor: Esta Máquina (${os.hostname()})`);
    console.log(`🔌 Porta: ${PORT}`);
    console.log(`🌐 Acesso Local: http://localhost:${PORT}`);
    
    if (ips.length > 0) {
        console.log('🌍 Acesso pela Rede:');
        ips.forEach(ip => {
            console.log(`   📍 http://${ip}:${PORT}`);
        });
    }
    
    console.log(`📱 WhatsApp T.I.: +55${WHATSAPP_TI}`);
    console.log(`🏢 Instance: ${ULTRAMSG_INSTANCE}`);
    console.log('💾 Backup: ATIVO');
    console.log('📡 API: UltraMsg Dupla');
    console.log('='  .repeat(80));
    console.log('✅ SERVIDOR REDE LOCAL FUNCIONANDO!');
    console.log('👥 Outras pessoas podem acessar pelos IPs acima!');
    console.log('🔥 Sistema funcionando 24/7 enquanto este PC estiver ligado!');
    console.log('\n🎯 INSTRUÇÕES PARA OS USUÁRIOS:');
    console.log('1. Conectar na mesma rede WiFi/cabo');
    console.log('2. Abrir navegador e digitar um dos IPs acima');
    console.log('3. Preencher e enviar chamados normalmente\n');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} já está em uso. Tente:`);
        console.error(`   1. taskkill /F /IM node.exe`);
        console.error(`   2. Ou mude a porta no código`);
    } else {
        console.error('❌ Erro no servidor:', err);
    }
});

console.log('🔄 Iniciando servidor para rede local...');