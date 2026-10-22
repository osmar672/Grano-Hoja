$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$rootEnvPath = Join-Path $root '.env'
$rootExample = Join-Path $root '.env.example'
$backendEnvPath = Join-Path $root 'backend/.env'
$backendExample = Join-Path $root 'backend/.env.example'
$utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false

function Get-Value([System.Collections.Generic.List[string]]$Lines, [string]$Name) {
  $pattern = '^' + [regex]::Escape($Name) + '=(.*)$'
  foreach ($line in $Lines) { if ($line -match $pattern) { return $Matches[1].Trim().Trim('"').Trim("'") } }
  return $null
}
function Set-Value([System.Collections.Generic.List[string]]$Lines, [string]$Name, [string]$Value) {
  $pattern = '^' + [regex]::Escape($Name) + '='
  for ($i = 0; $i -lt $Lines.Count; $i++) { if ($Lines[$i] -match $pattern) { $Lines[$i] = "$Name=$Value"; return } }
  $Lines.Add("$Name=$Value")
}
function Is-Placeholder([string]$Value) { return [string]::IsNullOrWhiteSpace($Value) -or $Value -match '^(CAMBIA|REEMPLAZAR|TU_|PEGA_AQUI)' }
function New-RandomHex([int]$Bytes = 48) {
  $data = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($data) } finally { $rng.Dispose() }
  return [BitConverter]::ToString($data).Replace('-', '').ToLowerInvariant()
}
function Read-SecretPlain([string]$Prompt, [int]$MinLength = 12, [int]$MaxLength = 72, [switch]$Complex) {
  while ($true) {
    $secure = Read-Host $Prompt -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    $valid = $plain.Length -ge $MinLength -and [System.Text.Encoding]::UTF8.GetByteCount($plain) -le $MaxLength
    if ($Complex) { $valid = $valid -and $plain -cmatch '[a-z]' -and $plain -cmatch '[A-Z]' -and $plain -match '\d' }
    if ($valid) { return $plain }
    Write-Host "No cumple el criterio: mínimo $MinLength caracteres, máximo $MaxLength bytes$(if($Complex){', y debe incluir minúscula, mayúscula y número'}). Intenta de nuevo." -ForegroundColor Yellow
  }
}

if (-not (Test-Path $rootEnvPath)) { Copy-Item $rootExample $rootEnvPath }
if (-not (Test-Path $backendEnvPath)) { Copy-Item $backendExample $backendEnvPath }
$rootLines = New-Object 'System.Collections.Generic.List[string]'
foreach ($line in (Get-Content -LiteralPath $rootEnvPath)) { $rootLines.Add([string]$line) }
$backendLines = New-Object 'System.Collections.Generic.List[string]'
foreach ($line in (Get-Content -LiteralPath $backendEnvPath)) { $backendLines.Add([string]$line) }

# Generate secrets only when the file still contains the example value.
foreach ($name in @('MYSQL_ROOT_PASSWORD','MYSQL_APP_PASSWORD','N8N_ENCRYPTION_KEY')) {
  $value = Get-Value $rootLines $name
  if (Is-Placeholder $value) { Set-Value $rootLines $name (New-RandomHex 48) }
}
Set-Value $rootLines 'MYSQL_DATABASE' 'grano_hoja'
Set-Value $rootLines 'MYSQL_APP_USER' 'grano_app'
[System.IO.File]::WriteAllLines($rootEnvPath, $rootLines.ToArray(), $utf8NoBom)

$appPassword = Get-Value $rootLines 'MYSQL_APP_PASSWORD'
Set-Value $backendLines 'DB_HOST' '127.0.0.1'
Set-Value $backendLines 'DB_PORT' '3306'
Set-Value $backendLines 'DB_USER' 'grano_app'
Set-Value $backendLines 'DB_NAME' 'grano_hoja'
Set-Value $backendLines 'DB_PASSWORD' $appPassword
Set-Value $backendLines 'DB_SSL' 'false'
Set-Value $backendLines 'N8N_WEBHOOK_URL' 'http://localhost:5678/webhook/grano-hoja/asistente-compras'
Set-Value $backendLines 'N8N_API_BASE_URL' 'http://host.docker.internal:3001'
Set-Value $backendLines 'FRONTEND_URL' 'http://localhost:5173'
Set-Value $backendLines 'GOOGLE_REDIRECT_URI' 'http://localhost:3001/api/auth/google/callback'
Set-Value $backendLines 'GOOGLE_CLIENT_ID' '96532736729-eafj3lgl17g04g7ubg9cdee3h6qjf15j.apps.googleusercontent.com'

foreach ($name in @('SESSION_SECRET','N8N_WEBHOOK_AUTH_TOKEN','N8N_API_SERVICE_TOKEN')) {
  $value = Get-Value $backendLines $name
  if (Is-Placeholder $value) { Set-Value $backendLines $name (New-RandomHex 48) }
}
$webhookToken = Get-Value $backendLines 'N8N_WEBHOOK_AUTH_TOKEN'
$serviceToken = Get-Value $backendLines 'N8N_API_SERVICE_TOKEN'
if ($webhookToken -eq $serviceToken) { Set-Value $backendLines 'N8N_API_SERVICE_TOKEN' (New-RandomHex 48) }

$seedUsers = @(
  @{ Prefix = 'SEED_ADMIN'; Email = 'admin@granoyhoja.local'; Name = 'Administración'; Label = 'contraseña de la cuenta admin' },
  @{ Prefix = 'SEED_MANAGER'; Email = 'encargado@granoyhoja.local'; Name = 'Encargado de tienda'; Label = 'contraseña de la cuenta encargado' },
  @{ Prefix = 'SEED_CASHIER'; Email = 'caja@granoyhoja.local'; Name = 'Personal de caja'; Label = 'contraseña de la cuenta caja' }
)
foreach ($user in $seedUsers) {
  $emailKey = "$($user.Prefix)_EMAIL"
  $nameKey = "$($user.Prefix)_NAME"
  $passwordKey = "$($user.Prefix)_PASSWORD"
  if (Is-Placeholder (Get-Value $backendLines $emailKey)) { Set-Value $backendLines $emailKey $user.Email }
  if (Is-Placeholder (Get-Value $backendLines $nameKey)) { Set-Value $backendLines $nameKey $user.Name }
  if (Is-Placeholder (Get-Value $backendLines $passwordKey)) {
    $password = Read-SecretPlain "Introduce $($user.Label) (no aparecerá en pantalla)" 12 72 -Complex
    Set-Value $backendLines $passwordKey $password
    $password = $null
  }
}

$googleSecret = Get-Value $backendLines 'GOOGLE_CLIENT_SECRET'
if (Is-Placeholder $googleSecret) {
  Write-Host 'El secreto de Google compartido anteriormente debe revocarse. Pega uno NUEVO de Google Cloud; no se mostrará en pantalla.' -ForegroundColor Yellow
  $googleSecret = Read-SecretPlain 'Nuevo Google Client Secret (oculto)' 1 4096
  Set-Value $backendLines 'GOOGLE_CLIENT_SECRET' $googleSecret
  $googleSecret = $null
}
[System.IO.File]::WriteAllLines($backendEnvPath, $backendLines.ToArray(), $utf8NoBom)

Write-Host ''
Write-Host 'Configuración local escrita en .env y backend/.env.' -ForegroundColor Green
Write-Host 'Los secretos no fueron impresos. Conserva estos archivos fuera de Git.' -ForegroundColor Green
Write-Host 'Siguiente: docker compose up -d db n8n; después npm install / npm test en backend y npm run dev.' -ForegroundColor Cyan
Write-Host 'En n8n aún debes crear/seleccionar las credenciales Header Auth y la credencial del modelo de chat; no se pueden exportar con secretos en el workflow JSON.' -ForegroundColor Cyan
