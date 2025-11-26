const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
require('dotenv').config();

const PORT = 3000;

// Função para enviar via WhatsApp Web (método mais simples)
function criarLinkWhatsApp(dados) {
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

    // Codificar mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // URL do WhatsApp Web
    const whatsappURL = `https://wa.me/${numeroTI}?text=${mensagemCodificada}`;
    
    return {
        url: whatsappURL,
        mensagem: mensagem
    };
}

// Função alternativa: salvar em arquivo para backup
function salvarChamado(dados) {
    const timestamp = new Date().toLocaleString('pt-BR').replace(/[/:]/g, '-');
    const nomeArquivo = `chamado_${dados.nome.replace(/\s+/g, '_')}_${timestamp}.txt`;
    
    const conteudo = `CHAMADO DE T.I. - ${timestamp}
===============================================

SOLICITANTE:
Nome: ${dados.nome}
Setor: ${dados.setor}
Ramal: ${dados.ramal || 'Não informado'}

CHAMADO:
Tipo: ${dados.tipo}
Título: ${dados.titulo}
Prioridade: ${dados.prioridade}

DESCRIÇÃO:
${dados.descricao}

Data/Hora: ${new Date().toLocaleString('pt-BR')}
Sistema: Pyramid Diamantados
===============================================`;

    try {
        // Criar pasta de backup se não existir
        const backupDir = path.join(__dirname, 'chamados_backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        // Salvar arquivo
        const caminhoArquivo = path.join(backupDir, nomeArquivo);
        fs.writeFileSync(caminhoArquivo, conteudo, 'utf8');
        
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
        
        req.on('end', () => {
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
                
                // Gerar link do WhatsApp
                const whatsappData = criarLinkWhatsApp(dados);
                
                // Salvar backup local
                const salvou = salvarChamado(dados);
                
                console.log('📱 WhatsApp URL gerada:');
                console.log(whatsappData.url);
                console.log('-------------------');
                
                // Retornar resposta com link e opções
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: '✅ Chamado processado! Abrindo WhatsApp...',
                    whatsappUrl: whatsappData.url,
                    backup: salvou ? 'Chamado salvo em backup local' : 'Erro ao salvar backup'
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
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log('📱 Sistema configurado para WhatsApp: (11) 99322-5739');
    console.log('💾 Backup automático de chamados ativado');
    console.log('✨ Pronto para uso!');
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

console.log('✅ Servidor WhatsApp Simples iniciado!');