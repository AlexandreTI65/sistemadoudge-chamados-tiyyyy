// Módulo para registrar chamados no Firebase
const admin = require('firebase-admin');
const fs = require('fs');

// Carregar credenciais do Firebase (serviceAccountKey.json)
const serviceAccount = require('/etc/secrets/firebase/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://<SEU-PROJETO>.firebaseio.com'
});

const db = admin.firestore();

// Função para salvar chamado
async function salvarChamadoFirebase(dados) {
  const agora = new Date();
  const registro = {
    ...dados,
    registradoEm: agora.toISOString(),
    ano: agora.getFullYear(),
    mes: agora.getMonth() + 1,
    dia: agora.getDate(),
    hora: agora.getHours(),
    minuto: agora.getMinutes(),
    segundo: agora.getSeconds()
  };
  const ref = db.collection('chamados')
    .doc(`${registro.ano}`)
    .collection(`${registro.mes}`)
    .doc(`${registro.dia}`)
    .collection('registros');
  await ref.add(registro);
  return registro;
}

module.exports = { salvarChamadoFirebase };
