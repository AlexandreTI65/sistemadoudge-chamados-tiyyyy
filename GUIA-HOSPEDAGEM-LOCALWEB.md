# 🚀 GUIA COMPLETO PARA HOSPEDAR NA LOCALWEB

## 📋 Sistema: Chamados T.I. - Pyramid Diamantados

---

## 🎯 **PASSO 1: PREPARAR ARQUIVOS PARA UPLOAD**

### Arquivos que você DEVE fazer upload:

```
📁 Pasta do seu site (via FTP/cPanel):
├── 📄 server.js (arquivo principal)
├── 📄 package.json (dependências)
├── 📄 .env (configurações)
├── 📁 public/
│   └── 📄 index.html (formulário)
└── 📁 logs/ (será criada automaticamente)
```

---

## 🛠️ **PASSO 2: CONFIGURAR HOSPEDAGEM NODE.JS NA LOCALWEB**

### A) Acessar cPanel da LocalWeb:
1. Faça login no cPanel da sua conta LocalWeb
2. Procure por "**Node.js App**" ou "**Aplicações Node.js**"
3. Clique em "Criar Nova Aplicação"

### B) Configurar a aplicação:
- **Versão Node.js**: 14.x ou superior
- **Pasta da aplicação**: `public_html` (ou subpasta)
- **Arquivo de inicialização**: `server.js`
- **URL da aplicação**: seu domínio (ex: `chamados.seudominio.com.br`)

---

## 📁 **PASSO 3: FAZER UPLOAD DOS ARQUIVOS**

### Via cPanel File Manager:
1. Acesse "**Gerenciador de Arquivos**"
2. Navegue até `public_html` (ou pasta da aplicação)
3. Faça upload dos arquivos:
   - ✅ `server.js`
   - ✅ `package.json`
   - ✅ `.env` (renomeie `.env.production` para `.env`)
   - ✅ Pasta `public/` com `index.html` dentro

### Via FTP (FileZilla):
```
Host: ftp.seudominio.com.br
Usuário: seu_usuario_cpanel
Senha: sua_senha_cpanel
Porta: 21

Pasta de destino: /public_html/
```

---

## 🔧 **PASSO 4: INSTALAR DEPENDÊNCIAS**

### No Terminal do cPanel ou SSH:
```bash
cd public_html
npm install
```

**OU via cPanel Node.js App:**
1. Vá em "Node.js App"
2. Encontre sua aplicação
3. Clique em "NPM Install"

---

## ⚙️ **PASSO 5: CONFIGURAR VARIÁVEIS DE AMBIENTE**

### Editar arquivo `.env`:
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

ULTRAMSG_TOKEN=ynquqp53ffqmu94z
ULTRAMSG_INSTANCE=instance145584
WHATSAPP_TI=5511993225739

DEBUG=false
```

---

## 🚀 **PASSO 6: INICIAR A APLICAÇÃO**

### Via cPanel Node.js App:
1. Vá em "Node.js App"
2. Encontre sua aplicação
3. Clique em "**Restart**" ou "**Start**"
4. Status deve ficar "**Running**"

### Via SSH/Terminal:
```bash
cd public_html
npm start
```

---

## 🌐 **PASSO 7: CONFIGURAR DOMÍNIO**

### A) Domínio principal:
- Se quiser usar o domínio principal: `https://seudominio.com.br`
- A aplicação ficará disponível diretamente

### B) Subdomínio:
1. No cPanel, vá em "**Subdomínios**"
2. Crie: `chamados.seudominio.com.br`
3. Aponte para a pasta da aplicação
4. Acesse: `https://chamados.seudominio.com.br`

---

## 🔍 **PASSO 8: TESTAR O SISTEMA**

### URLs para testar:
- **Sistema:** `https://seudominio.com.br`
- **Status:** `https://seudominio.com.br/status`

### Teste completo:
1. ✅ Abrir o formulário
2. ✅ Preencher todos os campos (incluindo celular)
3. ✅ Enviar chamado
4. ✅ Verificar se chegou no WhatsApp T.I.
5. ✅ Verificar se cliente recebeu confirmação

---

## 📱 **CONFIGURAÇÃO ESPECÍFICA LOCALWEB**

### Configurações recomendadas:
- **PHP Version**: Não importa (usamos Node.js)
- **SSL**: Ativar SSL/HTTPS
- **Firewall**: Liberar porta 443 (HTTPS)
- **Node.js Version**: 14.x ou superior

### Comandos úteis SSH:
```bash
# Ver logs da aplicação
tail -f logs/aplicacao.log

# Reiniciar aplicação
pm2 restart server.js

# Ver status
pm2 status
```

---

## 🆘 **SOLUÇÃO DE PROBLEMAS COMUNS**

### ❌ Erro: "Aplicação não inicia"
**Solução:**
1. Verificar se `package.json` está correto
2. Executar `npm install` novamente
3. Verificar permissões dos arquivos (755)

### ❌ Erro: "Cannot find module 'dotenv'"
**Solução:**
```bash
npm install dotenv --save
```

### ❌ Erro: "Port already in use"
**Solução:**
1. No cPanel Node.js App, mudar a porta
2. Ou editar `.env` e alterar PORT=3001

### ❌ Erro: "WhatsApp não recebe mensagens"
**Solução:**
1. Verificar credenciais UltraMsg no `.env`
2. Testar API manualmente
3. Verificar se número está correto

---

## 📞 **SUPORTE LOCALWEB**

### Contatos LocalWeb:
- **Site**: https://www.localweb.com.br
- **Telefone**: 0800 888 2050
- **Chat**: Disponível no painel
- **Documentação Node.js**: No cPanel → Documentação

---

## 🎉 **RESULTADO FINAL**

Após seguir todos os passos:

✅ **Sistema online em**: `https://seudominio.com.br`
✅ **Funcionando 24/7** na LocalWeb
✅ **Envio automático** para WhatsApp T.I.
✅ **Confirmação automática** para clientes
✅ **Backup automático** de todos os chamados
✅ **Interface profissional** e responsiva

---

## 🔐 **SEGURANÇA**

### Recomendações:
- ✅ Usar HTTPS (SSL ativo)
- ✅ Manter `.env` seguro
- ✅ Backup regular dos logs
- ✅ Monitorar acessos suspeitos

---

## 📈 **MONITORAMENTO**

### Para acompanhar o sistema:
1. **Logs**: `https://seudominio.com.br/status`
2. **cPanel**: Monitorar CPU/RAM da aplicação
3. **UltraMsg**: Verificar créditos da API
4. **WhatsApp**: Confirmar recebimento de mensagens

---

## 🎯 **CUSTO ESTIMADO LOCALWEB**

### Planos recomendados:
- **Hospedagem Node.js**: R$ 15-30/mês
- **Domínio**: R$ 40/ano
- **SSL**: Grátis (Let's Encrypt)

**Total aproximado**: R$ 20-35/mês

---

**🎊 SISTEMA PRONTO PARA PRODUÇÃO!**
**📱 Chamados T.I. funcionando 24/7 na web!**