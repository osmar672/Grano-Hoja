# Configura Google OAuth para desarrollo local y sincroniza las variables de MySQL.
# Ejecuta desde la raíz: powershell -ExecutionPolicy Bypass -File .\scripts\configurar-google-local.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$rootEnvPath = Join-Path $root '.env'
$rootEnvExamplePath = Join-Path $root '.env.example'
$backendEnvPath = Join-Path $root 'backend/.env'
$backendEnvExamplePath = Join-Path $root 'backend/.env.example'
$clientId = '96532736729-eafj3lgl17g04g7ubg9cdee3h6qjf15j.apps.googleusercontent.com'
function Get-EnvValueFromLines { param([string[]]$Lines,[string]$Name); $pattern='^'+[regex]::Escape($Name)+'=(.*)$'; foreach($line in $Lines){if($line -match $pattern){return $Matches[1].Trim().Trim('"').Trim("'")}}; return $null }
function Set-EnvValue { param([System.Collections.Generic.List[string]]$Lines,[string]$Name,[string]$Value); $pattern='^'+[regex]::Escape($Name)+'='; for($i=0;$i -lt $Lines.Count;$i++){if($Lines[$i] -match $pattern){$Lines[$i]="$Name=$Value";return}}; $Lines.Add("$Name=$Value") }
if(-not(Test-Path -LiteralPath $rootEnvPath)){Copy-Item $rootEnvExamplePath $rootEnvPath;Write-Host 'Creé .env raíz. Define MYSQL_ROOT_PASSWORD y MYSQL_APP_PASSWORD.' -ForegroundColor Yellow}
if(-not(Test-Path -LiteralPath $backendEnvPath)){Copy-Item $backendEnvExamplePath $backendEnvPath;Write-Host 'Creé backend/.env.' -ForegroundColor Cyan}
$rootLines=@(Get-Content -LiteralPath $rootEnvPath)
$backendLines=New-Object 'System.Collections.Generic.List[string]'; foreach($line in (Get-Content -LiteralPath $backendEnvPath)){$backendLines.Add([string]$line)}
Set-EnvValue $backendLines 'GOOGLE_CLIENT_ID' $clientId
Set-EnvValue $backendLines 'GOOGLE_REDIRECT_URI' 'http://localhost:3001/api/auth/google/callback'
Set-EnvValue $backendLines 'FRONTEND_URL' 'http://localhost:5173'
$dbUser=Get-EnvValueFromLines $rootLines 'MYSQL_APP_USER'; if([string]::IsNullOrWhiteSpace($dbUser)){$dbUser='raiz_app'}
$dbName=Get-EnvValueFromLines $rootLines 'MYSQL_DATABASE'; if([string]::IsNullOrWhiteSpace($dbName)){$dbName='raiz_madera'}
$dbPassword=Get-EnvValueFromLines $rootLines 'MYSQL_APP_PASSWORD'
Set-EnvValue $backendLines 'DB_HOST' '127.0.0.1'; Set-EnvValue $backendLines 'DB_PORT' '3306'; Set-EnvValue $backendLines 'DB_USER' $dbUser; Set-EnvValue $backendLines 'DB_NAME' $dbName
if(-not [string]::IsNullOrWhiteSpace($dbPassword) -and $dbPassword -notmatch 'CAMBIA_'){Set-EnvValue $backendLines 'DB_PASSWORD' $dbPassword} else {Write-Host 'ATENCIÓN: define MYSQL_APP_PASSWORD en .env raíz y vuelve a ejecutar este script.' -ForegroundColor Yellow}
$sessionSecret=Get-EnvValueFromLines $backendLines 'SESSION_SECRET'
if([string]::IsNullOrWhiteSpace($sessionSecret)){$bytes=New-Object byte[] 48;$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create();try{$rng.GetBytes($bytes)}finally{$rng.Dispose()};$sessionSecret=[BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant();Set-EnvValue $backendLines 'SESSION_SECRET' $sessionSecret;Write-Host 'Generé SESSION_SECRET aleatorio.' -ForegroundColor Green}
Write-Host ''
Write-Host 'El Client Secret anteriormente compartido debe considerarse expuesto.' -ForegroundColor Yellow
Write-Host 'Genera uno nuevo en Google Cloud Console. No reutilices el anterior.' -ForegroundColor Yellow
$secureSecret=Read-Host 'Pega el NUEVO Google Client Secret (entrada oculta)' -AsSecureString
if($secureSecret.Length -lt 1){throw 'El Client Secret no puede quedar vacío.'}
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret);try{$plainSecret=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
Set-EnvValue $backendLines 'GOOGLE_CLIENT_SECRET' $plainSecret;$plainSecret=$null
$utf8NoBom=New-Object System.Text.UTF8Encoding -ArgumentList $false
[System.IO.File]::WriteAllLines($backendEnvPath,$backendLines.ToArray(),$utf8NoBom)
Write-Host 'OAuth configurado en backend/.env; el secreto no se imprimió.' -ForegroundColor Green
Write-Host 'Comprueba Google Cloud: origin http://localhost:5173; callback http://localhost:3001/api/auth/google/callback.' -ForegroundColor Cyan
Write-Host 'Sigue docs/GOOGLE_OAUTH_SETUP.md para completar la prueba local.' -ForegroundColor Cyan
