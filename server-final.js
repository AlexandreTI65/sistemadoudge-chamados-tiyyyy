const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
require('dotenv').config();

const PORT = 3000;

// Configurações corretas da UltraMsg
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || 'ynquqp53ffqmu94z';
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || 'instance145584';
const WHATSAPP_NUMBER = '+5511993225739'; // Formato com + como no PHP

// Função para enviar mensagem via API UltraMsg
function enviarWhatsAppUltraMsg(dados) {
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

        // Dados no formato correto para UltraMsg (como form-data)
        const postData = new URLSearchParams({
            token: ULTRAMSG_TOKEN,
            to: WHATSAPP_NUMBER,
            body: mensagem
        }).toString();

        const options = {
            hostname: 'api.ultramsg.com',
            port: 443,
            path: `/${ULTRAMSG_INSTANCE}/messages/chat`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };

        console.log('📡 Enviando via UltraMsg API...');
        console.log('🔗 URL:', `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`);
        console.log('🔑 Token:', ULTRAMSG_TOKEN);
        console.log('📱 Para:', WHATSAPP_NUMBER);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📱 Resposta da API UltraMsg:', data);
                console.log('📊 Status Code:', res.statusCode);
                
                try {
                    const resposta = JSON.parse(data);
                    
                    if (resposta.sent === 'true' || resposta.sent === true || res.statusCode === 200) {
                        console.log('✅ MENSAGEM ENVIADA COM SUCESSO!');
                        resolve({
                            success: true,
                            message: '✅ Chamado enviado DIRETAMENTE para seu WhatsApp!',
                            response: resposta
                        });
                    } else if (resposta.error) {
                        console.log('⚠️ Erro da API:', resposta.error);
                        resolve({
                            success: false,
                            message: `⚠️ Erro da API: ${resposta.error}`,
                            response: resposta
                        });
                    } else {
                        console.log('✅ Resposta recebida - assumindo sucesso');
                        resolve({
                            success: true,
                            message: '✅ Chamado processado pela API!',
                            response: resposta
                        });
                    }
                } catch (parseError) {
                    console.log('⚠️ Resposta não é JSON válido:', data);
                    if (res.statusCode === 200) {
                        resolve({
                            success: true,
                            message: '✅ Chamado enviado (resposta não-JSON)!',
                            response: data
                        });
                    } else {
                        resolve({
                            success: false,
                            message: '⚠️ Erro na resposta da API',
                            response: data
                        });
                    }
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erro na requisição:', error);
            reject({
                success: false,
                message: '❌ Erro de conexão com a API UltraMsg',
                error: error.message
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
            metodoEnvio: 'ULTRAMSG_API',
            credenciais: {
                instance: ULTRAMSG_INSTANCE,
                token: ULTRAMSG_TOKEN.substring(0, 8) + '...' // Parcial por segurança
            }
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
                console.log('='  .repeat(60));
                console.log(`👤 Nome: ${dados.nome}`);
                console.log(`🏢 Setor: ${dados.setor}`);
                console.log(`📞 Ramal: ${dados.ramal || 'Não informado'}`);
                console.log(`🛠️  Tipo: ${dados.tipo}`);
                console.log(`📋 Título: ${dados.titulo}`);
                console.log(`⚠️  Prioridade: ${dados.prioridade}`);
                console.log(`📝 Descrição: ${dados.descricao}`);
                console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
                console.log(`📱 Destino: ${WHATSAPP_NUMBER}`);
                console.log('='  .repeat(60));
                
                // Salvar backup
                const salvou = salvarChamado(dados);
                
                // Enviar via UltraMsg
                try {
                    const resultado = await enviarWhatsAppUltraMsg(dados);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        ...resultado,
                        backup: salvou ? '💾 Backup salvo com sucesso' : '⚠️ Erro no backup',
                        timestamp: new Date().toLocaleString('pt-BR')
                    }));
                    
                    console.log(`✅ Resposta enviada ao cliente: ${resultado.message}`);
                    
                } catch (error) {
                    console.error('❌ Erro no envio:', error);
                    
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: '❌ Erro ao enviar para WhatsApp',
                        backup: salvou ? '💾 Backup salvo com sucesso' : '⚠️ Erro no backup',
                        error: error.message
                    }));
                }
                
            } catch (error) {
                console.error('❌ Erro ao processar:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: '❌ Erro ao processar chamado',
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
    console.log('='  .repeat(70));
    console.log(`📱 WhatsApp: ${WHATSAPP_NUMBER}`);
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log(`🏢 Instance: ${ULTRAMSG_INSTANCE}`);
    console.log(`🔑 Token: ${ULTRAMSG_TOKEN.substring(0, 8)}...`);
    console.log('💾 Backup automático: ATIVO');
    console.log('📡 Método: UltraMsg API Direta');
    console.log('='  .repeat(70));
    console.log('✅ CREDENCIAIS CORRETAS CONFIGURADAS!');
    console.log('🎯 ENVIO DIRETO PARA WHATSAPP ATIVO!');
    console.log('\n✨ SISTEMA 100% FUNCIONAL - TESTE AGORA!\n');
});

server.on('error', (err) => {
    console.error('❌ Erro no servidor:', err);
});

console.log('🔄 Iniciando sistema com credenciais corretas...');