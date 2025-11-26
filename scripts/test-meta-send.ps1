<#
script: test-meta-send.ps1
Descrição: Envia uma requisição GET para o endpoint /test-meta-send do servidor local.
Uso:
  .\test-meta-send.ps1 -To 11993225739 -Key MinhaChaveSecreta123
Se existir um arquivo .env na raiz do projeto, o script tentará ler TEST_ENDPOINT_KEY automaticamente.
#>

param(
    [string]$To = '11993225739',
    [string]$Key
)

# URL do servidor (ajuste se necessário)
$serverUrl = 'http://localhost:3000'

# Tentar carregar TEST_ENDPOINT_KEY do arquivo .env (projeto raiz)
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptRoot '..\.env'
$envKeyFromFile = $null
if (Test-Path $envFile) {
    try {
        $lines = Get-Content $envFile -ErrorAction Stop
        foreach ($line in $lines) {
            if ($line -match '^[\s#]*TEST_ENDPOINT_KEY\s*=\s*(.+)') {
                $envKeyFromFile = $matches[1].Trim()
                break
            }
        }
    } catch {
        Write-Warning ("Não foi possível ler {0}: {1}" -f $envFile, $_.Exception.Message)
    }
}

if (-not $Key -and $envKeyFromFile) {
    $Key = $envKeyFromFile
}

if (-not $Key) {
    Write-Host 'Atenção: nenhuma chave fornecida e TEST_ENDPOINT_KEY não encontrada em .env.' -ForegroundColor Yellow
    Write-Host 'Forneça a chave com -Key ou configure TEST_ENDPOINT_KEY no .env' -ForegroundColor Yellow
    exit 2
}

$encodedTo = [Uri]::EscapeDataString($To)
$encodedKey = [Uri]::EscapeDataString($Key)
$uri = "$serverUrl/test-meta-send?to=$encodedTo&key=$encodedKey"

Write-Host "Enviando GET -> $uri" -ForegroundColor Cyan
try {
    $resp = Invoke-RestMethod -Uri $uri -Method Get -ErrorAction Stop
    Write-Host "Resposta:" -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $body = $_.Exception.Response.GetResponseStream() | 
                    New-Object System.IO.StreamReader | 
                    ForEach-Object { $_.ReadToEnd() }
            Write-Host "Corpo da resposta:" -ForegroundColor Yellow
            Write-Host $body
        } catch {}
    }
    exit 1
}
