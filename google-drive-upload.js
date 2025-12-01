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
    throw new Error('Token de autenticação do Google Drive não encontrado. Siga o link acima para gerar.');
  }
}

async function uploadFileToDrive(fileBuffer, fileName, mimeType, folderId) {
  const auth = await authenticate();
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = { name: fileName };
  if (folderId) fileMetadata.parents = [folderId];
  const media = { mimeType, body: fileBuffer };
  const res = await drive.files.create({ resource: fileMetadata, media, fields: 'id,webViewLink,webContentLink' });
  return res.data;
}

module.exports = { uploadFileToDrive };
