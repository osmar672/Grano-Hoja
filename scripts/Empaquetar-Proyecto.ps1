[CmdletBinding()]
param(
  [string]$OutputPath = (Join-Path (Get-Location) 'Grano-Hoja-source.zip')
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$output = [System.IO.Path]::GetFullPath($OutputPath)
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("grano-hoja-package-" + [guid]::NewGuid().ToString('N'))
$stage = Join-Path $tempRoot 'Grano-Hoja'
New-Item -ItemType Directory -Path $stage -Force | Out-Null
$excludedDirectories = @('.git', 'node_modules', 'dist', 'coverage', '.vercel', '.vite')
try {
  Get-ChildItem -LiteralPath $root -Force -Recurse -File | ForEach-Object {
    $file = $_
    $relative = [System.IO.Path]::GetRelativePath($root, $file.FullName)
    $parts = $relative -split '[\\/]'
    if ($parts | Where-Object { $excludedDirectories -contains $_ }) { return }
    if ($parts | Where-Object { $_ -eq 'backups' }) { return }
    # Allow only the explicitly named sample templates; skip real .env files everywhere.
    if ($file.Name -match '^\.env($|\.)' -and $file.Name -notin @('.env.example', '.env.production.example', '.env.vercel.example')) { return }
    if ($file.Name -eq '.env' -or ($file.Name -like '.env.*' -and $file.Name -notin @('.env.example', '.env.production.example', '.env.vercel.example'))) { return }
    if ($parts -contains '.git') { return }
    $destination = Join-Path $stage $relative
    New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $destination
  }
  $parent = Split-Path $output -Parent
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  if (Test-Path -LiteralPath $output) { throw 'El archivo de salida ya existe; elige otro OutputPath para no sobrescribirlo.' }
  Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $output -CompressionLevel Optimal
  Write-Output "Paquete creado sin .env reales ni node_modules: $output"
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
