// Relatório Excel
const { relatorioChamadosHandler } = require('./api/relatorio');
// ...restante das dependências...
const http = require('http');
const multer = require('multer');
// const { Storage } = require('@google-cloud/storage');
const path = require('path');
// Configuração do Multer para upload em memória
const upload = multer({ storage: multer.memoryStorage() });

// Google Drive
const { uploadFileToDrive } = require('./google-drive-upload');

// Removido Firebase Storage
const https = require('https');
const fs = require('fs');
const url = require('url');
const querystring = require('querystring');
const os = require('os');

require('dotenv').config();
console.log('DEBUG ENV:', process.env.ULTRAMSG_TOKEN, process.env.ULTRAMSG_INSTANCE);

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

        // UltraMsg: sempre usar /messages/chat, mesmo para grupos
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

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log('✅ UltraMsg: mensagem enviada com sucesso!', parsed);
                        resolve({ success: true, message: 'Mensagem enviada via UltraMsg', response: parsed });
                    } else {
                        console.error('❌ UltraMsg erro:', res.statusCode, parsed);
                        resolve({ success: false, message: parsed.error || 'Erro UltraMsg', statusCode: res.statusCode, response: parsed });
                    }
                } catch (err) {
                    console.error('❌ UltraMsg: erro ao parsear resposta', err, data);
                    resolve({ success: false, message: 'Erro ao parsear resposta UltraMsg', error: err, response: data });
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ UltraMsg - erro de request:', err.message);
            resolve({ success: false, message: `Erro de conexão: ${err.message}`, error: err.message });
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



// Função para obter número do setor
function getNumeroSetor(setor) {
    const map = {
        'T.I': process.env.WHATSAPP_TI || '5511943456846',
        // Se for FISCAL, envia para o grupo
        'FISCAL': process.env.WHATSAPP_GRUPO_FISCAL || process.env.WHATSAPP_FISCAL || '5511937575367',
        'FINANCEIRO': process.env.WHATSAPP_FINANCEIRO || '5511994797594',
        // Se for COMERCIAL, envia para o grupo se existir
        'COMERCIAL': process.env.WHATSAPP_GRUPO_COMERCIAL || process.env.WHATSAPP_COMERCIAL || '5511988272404',
        'LOGISTICA': process.env.WHATSAPP_LOGISTICA || '5511988272607',
        'COMPRAS': process.env.WHATSAPP_COMPRAS || '5511988272541'
    };
    for (const key in map) {
        if (setor && setor.toUpperCase().includes(key)) return map[key];
    }
    return process.env.WHATSAPP_TI || '5511943456846';
}

// Função para enviar chamado para o setor correto (sem Firebase)
async function enviarChamadoTI(dados) {
    const numeroDestino = getNumeroSetor(dados.setor);
    const setor = (dados.setor || '').toUpperCase();
    // mensagem será definida abaixo
    let mensagem = '🎫 *NOVO CHAMADO*\n\n';
    mensagem += '👤 *SOLICITANTE:*\n';
    mensagem += '• Nome: ' + (dados.nome || '') + '\n';
    mensagem += '• Setor: ' + (dados.setor || '') + '\n';
    mensagem += '• Ramal: ' + (dados.ramal || 'Não informado') + '\n';
    mensagem += '• Celular: ' + (dados.celular || 'Não informado') + '\n\n';
    mensagem += '🛠️ *CHAMADO:*\n';
    mensagem += '• Título: ' + (dados.titulo || '') + '\n';
    mensagem += '• Prioridade: ' + (dados.prioridade || '') + '\n\n';
    mensagem += '📝 *DESCRIÇÃO:*\n' + (dados.descricao || '') + '\n';
    if (dados.anexoUrls && Array.isArray(dados.anexoUrls) && dados.anexoUrls.length > 0) {
        mensagem += '\n📎 *Anexos:*\n';
        dados.anexoUrls.forEach((url, idx) => {
            mensagem += `  ${idx+1}. ${url}\n`;
        });
    }
    mensagem += '\n📅 *Data/Hora:* ' + new Date().toLocaleString('pt-BR') + '\n_Sistema Rede Local - Pyramid Diamantados_';

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

    let mensagem = '✅ *SOLICITAÇÃO RECEBIDA COM SUCESSO!*\n\n';
    mensagem += 'Olá *' + (dados.nome || '') + '*! 👋\n\n';
    mensagem += 'Sua solicitação foi *RECEBIDA* pela T.I. da Pyramid Diamantados.\n\n';
    mensagem += '📋 *RESUMO:*\n';
    mensagem += '• Título: ' + (dados.titulo || '') + '\n';
    mensagem += '• Setor: ' + (dados.setor || '') + '\n';
    mensagem += '• Prioridade: ' + (dados.prioridade || '') + '\n';
    mensagem += '• Protocolo: #' + protocolo + '\n\n';
    mensagem += '⏰ *PRÓXIMOS PASSOS:*\n';
    mensagem += '• Nossa equipe analisará sua solicitação\n';
    mensagem += '• Você será contatado em breve\n';
    mensagem += '• Tempo estimado: até 24h\n\n';
    mensagem += '📞 *CONTATO T.I.:*\n';
    mensagem += '• WhatsApp: (11) 99322-5739\n\n';
    mensagem += '🔄 *Status:* Em análise\n\n';
    mensagem += '_Obrigado por utilizar nosso sistema!_\n*Pyramid Diamantados - T.I.*';

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
        // Usar multer para processar múltiplos arquivos
        upload.array('anexo')(req, res, async function (err) {
            if (err) {
                console.error('❌ Erro no upload:', err);
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: 'Erro no upload do arquivo.' }));
                return;
            }

            // Extrair campos do formulário
            // Mapear campos do formulário para nomes esperados
            const dados = {
                nome: req.body.Nome || req.body.nome || '',
                setor: req.body.Setor || req.body.setor || '',
                celular: req.body.Celular || req.body.celular || '',
                ramal: req.body.Ramal || req.body.ramal || '',
                titulo: req.body.Título || req.body.titulo || '',
                prioridade: req.body.Prioridade || req.body.prioridade || '',
                descricao: req.body.Descrição || req.body.descricao || ''
            };
            let anexoUrls = [];
            // Se houver arquivos, fazer upload para Google Drive
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    try {
                        const ext = path.extname(file.originalname) || '.bin';
                        const nomeArquivo = `anexo_${Date.now()}_${Math.floor(Math.random()*10000)}${ext}`;
                        const driveResult = await uploadFileToDrive(
                            Buffer.from(file.buffer),
                            nomeArquivo,
                            file.mimetype,
                            process.env.GDRIVE_FOLDER_ID
                        );
                        const url = driveResult.webViewLink || driveResult.webContentLink;
                        anexoUrls.push(url);
                    } catch (uploadErr) {
                        console.error('❌ Erro ao enviar anexo para Google Drive:', uploadErr);
                    }
                }
                if (anexoUrls.length > 0) {
                    dados.anexoUrls = anexoUrls;
                }
            }

            try {
                console.log(`\n📨 NOVO CHAMADO (de ${req.socket.remoteAddress}):`);
                console.log(`👤 ${dados.nome} (${dados.setor})`);
                console.log(`📱 ${dados.celular}`);
                console.log(`🛠️ ${dados.setor}: ${dados.titulo}`);
                if (anexoUrls && anexoUrls.length > 0) {
                    anexoUrls.forEach((url, idx) => console.log(`📎 Anexo ${idx+1}: ${url}`));
                }

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
                    anexoUrls: dados.anexoUrls || [],
                    timestamp: new Date().toLocaleString('pt-BR'),
                    tiError: !sucessoTI ? resultadoTI : undefined
                }));
                console.log(`✅ ${mensagemFinal}`);
            } catch (error) {
                console.error('❌ Erro no processamento:', error);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    message: '✅ Chamado processado! (Em caso de problema, contate T.I.)',
                    timestamp: new Date().toLocaleString('pt-BR')
                }));
            }
        });
        return;
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
        return;
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

// Iniciar servidor escutando em TODAS as interfaces (0.0.0.0) e porta do Render
server.listen(PORT, '0.0.0.0', () => {
    console.log('Servidor ouvindo em http://0.0.0.0:' + PORT);
    const ips = obterIPsRede();
    if (ips && ips.length) {
        console.log('Endereços de acesso na rede local:');
        ips.forEach(ip => console.log('   http://' + ip + ':' + PORT));
    }
});

process.on('uncaughtException', (err) => {
    console.error('❌ Exceção não tratada:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Rejeição não tratada:', reason);
});