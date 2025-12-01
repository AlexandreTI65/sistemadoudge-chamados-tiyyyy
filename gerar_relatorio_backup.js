// Script para gerar Excel dos chamados a partir dos backups locais (chamados_backup)
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// Caminho da pasta de backups
const chamadosDir = path.join(__dirname, 'chamados_backup');
const arquivos = fs.readdirSync(chamadosDir).filter(f => f.endsWith('.json'));
let chamados = [];
for (const arq of arquivos) {
  try {
    const dados = JSON.parse(fs.readFileSync(path.join(chamadosDir, arq), 'utf8'));
    if (Array.isArray(dados)) chamados = chamados.concat(dados);
    else chamados.push(dados);
  } catch {}
}

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
chamados.forEach(c => ws.addRow({
  nome: c.nome || '',
  setor: c.setor || '',
  titulo: c.titulo || c.Título || '',
  status: c.status || '',
  registradoEm: c.registradoEm || c.data || c.timestamp || '',
  descricao: c.descricao || c.Descrição || '',
}));

workbook.xlsx.writeFile('relatorio_chamados.xlsx').then(() => {
  console.log('Relatório gerado: relatorio_chamados.xlsx');
});
