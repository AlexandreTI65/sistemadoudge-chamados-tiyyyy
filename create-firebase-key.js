const fs = require('fs');
const path = require('path');

const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!base64) {
  console.error('FIREBASE_SERVICE_ACCOUNT_BASE64 não definida!');
  process.exit(1);
}

const json = Buffer.from(base64, 'base64').toString('utf8');
const dir = path.join(__dirname, 'firebase');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
fs.writeFileSync(path.join(dir, 'serviceAccountKey.json'), json);
console.log('Arquivo serviceAccountKey.json criado com sucesso!');
