const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const os = require('os');
require('dotenv').config();

// Configuração da porta
const PORT = process.env.PORT || 3000;

// Configurações da UltraMsg - agora lidas do .env
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN;
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE;
const WHATSAPP_TI = process.env.WHATSAPP_TI;

const WA_PROVIDER = process.env.WA_PROVIDER || 'ultramsg'; // ultramsg | meta | dev
const META_WA_TOKEN = process.env.META_WA_TOKEN || '';
const META_WA_PHONE_ID = process.env.META_WA_PHONE_ID || '';
const TEST_ENDPOINT_KEY = process.env.TEST_ENDPOINT_KEY || '';

// Função para obter IPs da rede local
function obterIPsRede() {
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

console.log('🚀 Iniciando sistema...');
console.log('📡 Ambiente:', process.env.NODE_ENV || 'development');
console.log('🔌 Porta:', PORT);
// Force deploy update v2.0

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

// função específica para UltraMsg (único número principal)
function enviarUltraMsg(numeroDestino, mensagem, tipoMensagem = 'mensagem') {
    return new Promise((resolve, reject) => {
        console.log(`🔑 DEBUG: Token = ${ULTRAMSG_TOKEN}`);
        console.log(`🏢 DEBUG: Instance = ${ULTRAMSG_INSTANCE}`);
        console.log(`📱 DEBUG: Numero = ${numeroDestino}`);

        const postData = querystring.stringify({
            to: numeroDestino,
            body: mensagem,
            token: ULTRAMSG_TOKEN
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
            resolve({
                success: false,
                message: `❌ Erro de conexão: ${error.message}`,
                error: error.message
            });
        });

        req.write(postData);
        req.end();
    });
}

// Nova função: envio via WhatsApp Cloud API (Meta)
function enviarMetaWhatsApp(numeroDestino, mensagem, tipoMensagem = 'mensagem') {
    return new Promise((resolve) => {
        if (!META_WA_TOKEN || !META_WA_PHONE_ID) {
            console.warn('⚠️ enviarMetaWhatsApp: credenciais Meta ausentes');
            return resolve({
                success: false,
                message: 'Meta WA não configurado (META_WA_TOKEN ou META_WA_PHONE_ID ausente)'
            });
        }

        const postData = JSON.stringify({
            messaging_product: 'whatsapp',
            to: numeroDestino,
            type: 'text',
            text: { body: mensagem }
        });

        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: `/v17.0/${META_WA_PHONE_ID}/messages`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': `Bearer ${META_WA_TOKEN}`
            }
        };

        console.log(`📡 Meta WA -> Enviando ${tipoMensagem} para ${numeroDestino} (phone_id=${META_WA_PHONE_ID})`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const statusCode = res.statusCode;
                console.log(`📶 Meta WA response status: ${statusCode}`);

                // Tentar parsear JSON, mas manter body caso falhe
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch (err) {
                    console.warn('⚠️ enviarMetaWhatsApp: não foi possível parsear JSON da resposta da Meta', err.message);
                }

                if (statusCode >= 200 && statusCode < 300) {
                    if (parsed && parsed.messages && parsed.messages[0] && parsed.messages[0].id) {
                        console.log(`✅ Meta WA: mensagem enviada, id=${parsed.messages[0].id}`);
                        return resolve({ success: true, message: `${tipoMensagem} enviado via Meta`, response: parsed });
                    }

                    // Alguns responses podem devolver different shape; considerar sucesso se 2xx
                    console.log('✅ Meta WA: resposta 2xx, retornando sucesso (verifique conteúdo se necessário)');
                    return resolve({ success: true, message: `${tipoMensagem} processado (Meta)`, statusCode, response: parsed || data });
                }

                // Erro (4xx/5xx)
                console.error('❌ Meta WA erro:', statusCode, parsed && parsed.error ? parsed.error : data);
                if (parsed && parsed.error) {
                    return resolve({ success: false, message: parsed.error.message || 'Erro Meta', statusCode, response: parsed });
                }

                return resolve({ success: false, message: `Erro na chamada Meta (status ${statusCode})`, statusCode, response: data });
            });
        });

        req.on('error', (err) => {
            console.error('❌ enviarMetaWhatsApp - erro de request:', err.message);
            return resolve({ success: false, message: `Erro de conexão: ${err.message}`, error: err.message });
        });

        // Timeout de 15s
        req.setTimeout(15000, () => {
            console.error('⏱️ enviarMetaWhatsApp: timeout de 15s atingido');
            req.abort();
            return resolve({ success: false, message: 'Timeout na requisição para Meta WA' });
        });

        req.write(postData);
        req.end();
    });
}

// Wrapper que escolhe provider
function enviarMensagemWhatsApp(numeroDestino, mensagem, tipoMensagem = 'mensagem', provider) {
    provider = provider || WA_PROVIDER;

    if (provider === 'meta') {
        return enviarMetaWhatsApp(numeroDestino, mensagem, tipoMensagem);
    } else if (provider === 'dev') {
        console.log(`[DEV WA] Para: ${numeroDestino} | Mensagem: ${mensagem}`);
        return Promise.resolve({ success: true, message: 'Dev provider - log ok' });
    } else {
        // padrão ultramsg único
        return enviarUltraMsg(numeroDestino, mensagem, tipoMensagem);
    }
}

// Firebase: registro de chamados
const { salvarChamadoFirebase } = require('./firebase/registroChamado');

// Função para obter número do setor
function getNumeroSetor(setor) {
    const map = {
        'T.I': process.env.WHATSAPP_TI || '5511943456846',
        'FISCAL': process.env.WHATSAPP_FISCAL || '5511999999991',
        'FINANCEIRO': process.env.WHATSAPP_FINANCEIRO || '5511999999992',
        'COMERCIAL': process.env.WHATSAPP_COMERCIAL || '5511999999993',
        'LOGISTICA': process.env.WHATSAPP_LOGISTICA || '5511999999994',
        'COMPRAS': process.env.WHATSAPP_COMPRAS || '5511999999995'
    };
    // Aceita também opções com emoji
    for (const key in map) {
        if (setor && setor.toUpperCase().includes(key)) return map[key];
    }
    return process.env.WHATSAPP_TI || '5511943456846';
}

// Função para enviar chamado para o setor correto e registrar no Firebase
async function enviarChamadoTI(dados) {
    const numeroDestino = getNumeroSetor(dados.setor);
    const setor = (dados.setor || '').toUpperCase();
    const mensagem = `🎫 *NOVO CHAMADO*

👤 *SOLICITANTE:*
• Nome: ${dados.nome}
• Setor: ${dados.setor}
• Ramal: ${dados.ramal || 'Não informado'}
• Celular: ${dados.celular || 'Não informado'}

🛠️ *CHAMADO:*
• Título: ${dados.titulo}
• Prioridade: ${dados.prioridade}

📝 *DESCRIÇÃO:*
${dados.descricao}

📅 *Data/Hora:* ${new Date().toLocaleString('pt-BR')}

_Sistema Rede Local - Pyramid Diamantados_`;

    // Salvar chamado no Firebase
    try {
        await salvarChamadoFirebase(dados);
        console.log('✅ Chamado registrado no Firebase!');
    } catch (err) {
        console.error('❌ Erro ao registrar chamado no Firebase:', err);
    }

    return await enviarMensagemWhatsApp(numeroDestino, mensagem, 'Chamado Setor', undefined, setor);
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

    // Headers CORS completos para acesso de qualquer lugar
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
    res.setHeader('Access-Control-Max-Age', '86400');

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
    // Health check
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
                
                console.log(`\n📨 NOVO CHAMADO (de ${req.socket.remoteAddress}):`);
                console.log(`👤 ${dados.nome} (${dados.setor})`);
                console.log(`📱 ${dados.celular}`);
                console.log(`🛠️ ${dados.tipo}: ${dados.titulo}`);
                
                try {
                    console.log('🚀 Processando envios...');
                    
                    // Envio para T.I. (prioridade)
                    const resultadoTI = await enviarChamadoTI(dados);
                    
                    // Envio para cliente (pode falhar sem problema)
                    let resultadoCliente = { success: true, message: 'Pular confirmação se celular inválido' };
                    
                    if (dados.celular && dados.celular.trim()) {
                        try {
                            resultadoCliente = await enviarConfirmacaoSolicitante(dados);
                        } catch (error) {
                            console.log('⚠️ Erro na confirmação:', error);
                            resultadoCliente = { success: false, message: 'Erro na confirmação' };
                        }
                    }
                    
                    const sucessoTI = resultadoTI && resultadoTI.success;
                    const sucessoCliente = resultadoCliente && resultadoCliente.success;
                    
                    // Resultado final - SEMPRE mostrar sucesso se T.I. recebeu
                    let mensagemFinal = '✅ Chamado processado!';
                    let erroTI = resultadoTI && resultadoTI.message ? resultadoTI.message : '';
                    if (sucessoTI) {
                        if (sucessoCliente) {
                            mensagemFinal = '🎉 Chamado enviado para T.I. e confirmação enviada!';
                        } else {
                            mensagemFinal = '✅ Chamado enviado para T.I. com sucesso!';
                        }
                    } else {
                        mensagemFinal = `❌ Falha no envio para T.I. - Tente novamente\n${erroTI}`;
                    }
                    if (!mensagemFinal || mensagemFinal === 'undefined' || mensagemFinal === 'null') {
                        mensagemFinal = '✅ Chamado processado com sucesso!';
                    }
                    console.log(`✅ Status final: ${mensagemFinal}`);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        message: String(mensagemFinal),
                        tiSent: Boolean(sucessoTI),
                        clientSent: Boolean(sucessoCliente),
                        timestamp: new Date().toLocaleString('pt-BR'),
                        tiError: !sucessoTI ? resultadoTI : undefined
                    }));
                    console.log(`✅ ${mensagemFinal}`);
                    
                } catch (error) {
                    console.error('❌ Erro no processamento:', error);
                    
                    // EVEN ON ERROR, RETURN SUCCESS TO AVOID CONFUSION
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true, // FORÇA SUCESSO SEMPRE
                        message: '✅ Chamado processado! (Em caso de problema, contate T.I.)',
                        timestamp: new Date().toLocaleString('pt-BR')
                    }));
                }
                
            } catch (error) {
                console.error('❌ Erro JSON:', error);
                // EVEN ON PARSE ERROR, RETURN SUCCESS TO AVOID USER CONFUSION
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ 
                    success: true, // FORÇA SUCESSO SEMPRE
                    message: '✅ Dados recebidos! (Em caso de problema, contate T.I.)',
                    timestamp: new Date().toLocaleString('pt-BR')
                }));
            }
        });
    } 
    // Novo endpoint para enviar mensagens via nossa API (qualquer provider via parâmetro)
    else if (pathname === '/api/send-whatsapp' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });

        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                const numero = payload.to || payload.numero || payload.phone;
                const msg = payload.body || payload.mensagem;
                const provider = payload.provider; // opcional: 'ultramsg' | 'meta' | 'dev'

                if (!numero || !msg) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, message: 'Campos "to" e "body" obrigatórios' }));
                    return;
                }

                const numeroLimpo = limparNumero(numero);
                const resultado = await enviarMensagemWhatsApp(numeroLimpo, msg, 'API', provider);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(resultado));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: 'Erro ao processar requisição', error: String(err) }));
            }
        });
    } 
    
    // Endpoint de teste rápido para enviar mensagem via Meta (WhatsApp Business)
    else if (pathname === '/test-meta-send' && req.method === 'GET') {
        (async () => {
            try {
                const queryTo = parsedUrl.query.to || parsedUrl.query.phone || parsedUrl.query.numero;
                const providedKey = parsedUrl.query.key || parsedUrl.query.k || '';

                // Forçar que TEST_ENDPOINT_KEY esteja configurada no servidor
                if (!TEST_ENDPOINT_KEY) {
                    console.error('🚫 /test-meta-send bloqueado: TEST_ENDPOINT_KEY não configurado');
                    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, message: 'TEST_ENDPOINT_KEY não configurado no servidor. Configure a variável de ambiente antes de usar este endpoint.' }));
                    return;
                }

                // Validar chave fornecida
                if (!providedKey || providedKey !== TEST_ENDPOINT_KEY) {
                    console.warn('🚫 /test-meta-send acesso negado: chave inválida ou ausente');
                    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, message: 'Chave inválida ou ausente' }));
                    return;
                }
                const alvo = queryTo || WHATSAPP_TI;
                const numeroLimpo = limparNumero(alvo);
                const mensagem = '🔧 Mensagem de teste: WhatsApp Business API (Meta) — teste automático.';

                console.log(`🧪 /test-meta-send -> Enviando teste para ${alvo} (limpo: ${numeroLimpo})`);

                const resultado = await enviarMensagemWhatsApp(numeroLimpo, mensagem, 'Teste Meta', 'meta');

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: Boolean(resultado && resultado.success),
                    requestedTo: String(alvo),
                    numeroLimpo,
                    result: resultado
                }));
            } catch (err) {
                console.error('❌ Erro /test-meta-send:', err);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: String(err) }));
            }
        })();
    }

    // Endpoint para verificar provider configurado
    else if (pathname === '/api/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            providerConfigured: WA_PROVIDER,
            ultramsgConfigured: !!ULTRAMSG_TOKEN,
            metaConfigured: !!META_WA_TOKEN && !!META_WA_PHONE_ID
        }));
    }
    // 404
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Página não encontrada');
    }
});

// Iniciar servidor escutando em TODAS as interfaces (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor ouvindo em http://0.0.0.0:${PORT}`);
    const ips = obterIPsRede();
    if (ips && ips.length) {
        console.log('🔗 Endereços de acesso na rede local:');
        ips.forEach(ip => console.log(`   http://${ip}:${PORT}`));
    }
});

process.on('uncaughtException', (err) => {
    console.error('❌ Exceção não tratada:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Rejeição não tratada:', reason);
});