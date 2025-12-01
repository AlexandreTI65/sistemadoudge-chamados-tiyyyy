# Como configurar o upload de anexos para o Google Drive

1. Vá em https://console.cloud.google.com/apis/credentials e crie um novo projeto (ou use um existente).
2. Ative a API do Google Drive para o projeto.
3. Crie uma credencial do tipo "OAuth 2.0 Client ID" (aplicativo de área de trabalho).
4. Baixe o arquivo `credentials.json` e coloque na raiz do projeto como `google-drive-credentials.json`.
5. Execute o script abaixo para gerar o token de acesso:

```bash
node google-drive-upload.js
```

- O script mostrará um link. Acesse, autorize e cole o código de autorização no terminal.
- O token será salvo como `google-drive-token.json`.

6. No backend, use a função `uploadFileToDrive` para salvar anexos no Google Drive.

Se precisar de ajuda para gerar as credenciais ou o token, peça aqui!
