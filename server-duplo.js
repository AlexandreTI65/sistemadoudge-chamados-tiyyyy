const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
require('dotenv').config();

const PORT = 3000;

// Configurações corretas da UltraMsg
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || 'ynquqp53ffqmu94z';
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || 'instance145584';
const WHATSAPP_TI = '5511993225739'; // WhatsApp da T.I.

// Função para limpar número de telefone
function limparNumero(numero) {
    if (!numero) return '';
    
    // Remove tudo que não for número
    let limpo = numero.replace(/\D/g, '');
    
    // Se começar com 0, remove
    if (limpo.startsWith('0')) {
        limpo = limpo.substring(1);
    }
    
    // Se não tiver código do país, adiciona 55
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

        console.log(`📡 Enviando ${tipoMensagem} via UltraMsg API...`);
        console.log('🔗 URL:', `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`);
        console.log('📱 Para:', numeroDestino);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📱 Resposta ${tipoMensagem}:`, data);
                console.log('📊 Status Code:', res.statusCode);
                
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
                        console.log(`✅ ${tipoMensagem} processado`);
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

    return await enviarMensagemWhatsApp(WHATSAPP_TI, mensagem, 'CHAMADO PARA T.I.');
}

// Função para enviar confirmação para solicitante
async function enviarConfirmacaoSolicitante(dados) {
    const numeroLimpo = limparNumero(dados.celular);
    
    if (!numeroLimpo) {
        return {
            success: false,
            message: 'Número de celular inválido'
        };
    }

    const mensagem = `✅ *SOLICITAÇÃO RECEBIDA COM SUCESSO!*

Olá *${dados.nome}*! 👋

Sua solicitação de suporte foi *RECEBIDA* pela equipe de T.I. da Pyramid Diamantados.

📋 *RESUMO DA SOLICITAÇÃO:*
• Título: ${dados.titulo}
• Tipo: ${dados.tipo}
• Prioridade: ${dados.prioridade}
• Protocolo: #${Date.now().toString().slice(-6)}

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
            metodoEnvio: 'ULTRAMSG_API_DUPLO'
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
                
                console.log('\n📨 NOVO CHAMADO RECEBIDO:');
                console.log('='  .repeat(70));
                console.log(`👤 Nome: ${dados.nome}`);
                console.log(`🏢 Setor: ${dados.setor}`);
                console.log(`📞 Ramal: ${dados.ramal || 'Não informado'}`);
                console.log(`📱 Celular: ${dados.celular || 'Não informado'}`);
                console.log(`🛠️  Tipo: ${dados.tipo}`);
                console.log(`📋 Título: ${dados.titulo}`);
                console.log(`⚠️  Prioridade: ${dados.prioridade}`);
                console.log(`📝 Descrição: ${dados.descricao}`);
                console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
                console.log(`📱 T.I.: ${WHATSAPP_TI}`);
                console.log(`📱 Cliente: ${limparNumero(dados.celular)}`);
                console.log('='  .repeat(70));
                
                // Salvar backup
                const salvou = salvarChamado(dados);
                
                // Enviar para T.I. e confirmação para cliente
                try {
                    console.log('\n🚀 INICIANDO ENVIOS...');
                    
                    // Envio 1: Chamado para T.I.
                    const resultadoTI = await enviarChamadoTI(dados);
                    
                    // Envio 2: Confirmação para cliente
                    const resultadoCliente = await enviarConfirmacaoSolicitante(dados);
                    
                    // Resposta final
                    const sucessoTI = resultadoTI.success;
                    const sucessoCliente = resultadoCliente.success;
                    
                    let mensagemFinal = '';
                    if (sucessoTI && sucessoCliente) {
                        mensagemFinal = '🎉 Chamado enviado para T.I. E confirmação enviada para você!';
                    } else if (sucessoTI) {
                        mensagemFinal = '✅ Chamado enviado para T.I. (erro na confirmação)';
                    } else if (sucessoCliente) {
                        mensagemFinal = '⚠️ Confirmação enviada, mas erro no envio para T.I.';
                    } else {
                        mensagemFinal = '❌ Erro nos envios';
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: sucessoTI || sucessoCliente,
                        message: mensagemFinal,
                        backup: salvou ? '💾 Backup salvo' : '⚠️ Erro no backup',
                        detalhes: {
                            envioTI: resultadoTI,
                            confirmacaoCliente: resultadoCliente
                        },
                        timestamp: new Date().toLocaleString('pt-BR')
                    }));
                    
                    console.log(`\n✅ PROCESSO FINALIZADO: ${mensagemFinal}`);
                    console.log(`📊 T.I.: ${sucessoTI ? 'SUCESSO' : 'ERRO'}`);
                    console.log(`📊 Cliente: ${sucessoCliente ? 'SUCESSO' : 'ERRO'}`);
                    
                } catch (error) {
                    console.error('❌ Erro geral no envio:', error);
                    
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: '❌ Erro ao processar chamado',
                        backup: salvou ? '💾 Backup salvo' : '⚠️ Erro no backup',
                        error: error.message
                    }));
                }
                
            } catch (error) {
                console.error('❌ Erro ao processar JSON:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: '❌ Erro no formato dos dados',
                    error: error.message
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
    console.log('='  .repeat(80));
    console.log(`📱 T.I. WhatsApp: +55${WHATSAPP_TI}`);
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log(`🏢 Instance: ${ULTRAMSG_INSTANCE}`);
    console.log(`🔑 Token: ${ULTRAMSG_TOKEN.substring(0, 8)}...${ULTRAMSG_TOKEN.slice(-4)}`);
    console.log('💾 Backup automático: ATIVO');
    console.log('📡 Método: UltraMsg API Duplo');
    console.log('🎯 Funcionalidades:');
    console.log('   • Envio para T.I.: ✅');
    console.log('   • Confirmação para cliente: ✅');
    console.log('   • Limpeza automática de números: ✅');
    console.log('='  .repeat(80));
    console.log('🎉 SISTEMA DUPLO FUNCIONANDO!');
    console.log('📨 Chamados vão para T.I. + Confirmações para clientes!');
    console.log('\n✨ TESTE AGORA O SISTEMA!\n');
});

server.on('error', (err) => {
    console.error('❌ Erro no servidor:', err);
});

console.log('🔄 Iniciando sistema com envio duplo...');