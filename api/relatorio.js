// Endpoint para geração de relatório de chamados em Excel, com autenticação por senha
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// Função utilitária para filtrar chamados
function filtrarChamados(chamados, filtros) {
  return chamados.filter((c) => {
    if (filtros.setor && c.setor && c.setor.toUpperCase() !== filtros.setor.toUpperCase()) return false;
    if (filtros.status && c.status && c.status.toUpperCase() !== filtros.status.toUpperCase()) return false;
    if (filtros.data) {
      const dataChamado = new Date(c.registradoEm || c.data || c.timestamp || c.createdAt);
      const dataFiltro = new Date(filtros.data);
      if (
        dataChamado.getFullYear() !== dataFiltro.getFullYear() ||
        dataChamado.getMonth() !== dataFiltro.getMonth() ||
        dataChamado.getDate() !== dataFiltro.getDate()
      ) return false;
    }
    return true;
  });
}

// Handler para /relatorio-chamados
async function relatorioChamadosHandler(req, res) {
  const url = require('url');
  const parsedUrl = url.parse(req.url, true);
  const { setor, status, data, senha } = parsedUrl.query;

  // Senha obrigatória
  if (senha !== '80909292') {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('Acesso não autorizado.');
    return;
  }

  // Carregar todos os arquivos de chamados_backup
  const chamadosDir = path.join(__dirname, '../chamados_backup');
  const arquivos = fs.readdirSync(chamadosDir).filter(f => f.endsWith('.json'));
  let chamados = [];
  for (const arq of arquivos) {
    try {
      const dados = JSON.parse(fs.readFileSync(path.join(chamadosDir, arq), 'utf8'));
      if (Array.isArray(dados)) chamados = chamados.concat(dados);
      else chamados.push(dados);
    } catch {}
  }

  // Filtrar
  const filtrados = filtrarChamados(chamados, { setor, status, data });

  // Gerar Excel
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Chamados');
  ws.columns = [
    { header: 'Nome', key: 'nome', width: 20 },
    { header: 'Setor', key: 'setor', width: 15 },
    { header: 'Título', key: 'titulo', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Data', key: 'registradoEm', width: 22 },
    { header: 'Descrição', key: 'descricao', width: 40 },
  ];
  filtrados.forEach(c => ws.addRow({
    nome: c.nome || '',
    setor: c.setor || '',
    titulo: c.titulo || c.Título || '',
    status: c.status || '',
    registradoEm: c.registradoEm || c.data || c.timestamp || '',
    descricao: c.descricao || c.Descrição || '',
  }));

  res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="relatorio_chamados.xlsx"'
  });
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { relatorioChamadosHandler };
