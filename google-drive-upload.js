// google-drive-upload.js
// Faz upload de arquivo para uma pasta do Google Drive usando OAuth2

const fs = require('fs');
const { google } = require('googleapis');

// Carregue suas credenciais do Google Cloud (OAuth2)
const CREDENTIALS_PATH = './google-drive-credentials.json';
const TOKEN_PATH = './google-drive-token.json';

async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return oAuth2Client;
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/drive.file'] });
    console.log('Authorize this app by visiting this url:', authUrl);
    // Prompt interativo para colar o código
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve, reject) => {
      rl.question('Cole o código de autorização aqui: ', async (code) => {
        rl.close();
        try {
          const { tokens } = await oAuth2Client.getToken(code.trim());
          oAuth2Client.setCredentials(tokens);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          console.log('Token salvo com sucesso em', TOKEN_PATH);
          resolve(oAuth2Client);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

async function uploadFileToDrive(fileBuffer, fileName, mimeType, folderId) {
  const auth = await authenticate();
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = { name: fileName };
  if (folderId) fileMetadata.parents = [folderId];
  const { Readable } = require('stream');
  const media = { mimeType, body: Readable.from(fileBuffer) };
  const res = await drive.files.create({ resource: fileMetadata, media, fields: 'id,webViewLink,webContentLink' });

  // Tornar o arquivo público (qualquer pessoa com o link pode visualizar)
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Buscar novamente os links públicos
  const file = await drive.files.get({
    fileId: res.data.id,
    fields: 'id,webViewLink,webContentLink'
  });
  return file.data;
}

module.exports = { uploadFileToDrive };

// Permitir geração de token ao rodar diretamente
if (require.main === module) {
  (async () => {
    try {
      await authenticate();
      console.log('Token de autenticação do Google Drive gerado e salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao autenticar com o Google Drive:', err.message);
    }
  })();
}
