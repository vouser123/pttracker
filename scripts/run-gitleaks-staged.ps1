$ErrorActionPreference = 'Stop'

# scripts/run-gitleaks-staged.ps1 — scan the Git index snapshot for secrets with a repo-pinned Gitleaks config.

$repoRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $repoRoot '.gitleaks-strict.toml'
$toolRoot = 'C:\Users\cindi\OneDrive\Documents\PT_Backup\tools\gitleaks'
$version = '8.30.1'
$downloadUrl = "https://github.com/gitleaks/gitleaks/releases/download/v$version/gitleaks_${version}_windows_x64.zip"
$versionRoot = Join-Path $toolRoot $version
$exePath = Join-Path $versionRoot 'gitleaks.exe'
$tempRoot = $null

function Ensure-Gitleaks {
  if (Test-Path $exePath) {
    return
  }

  New-Item -ItemType Directory -Path $versionRoot -Force | Out-Null
  $zipPath = Join-Path $versionRoot "gitleaks_${version}_windows_x64.zip"
  Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
  Expand-Archive -Path $zipPath -DestinationPath $versionRoot -Force
  Remove-Item $zipPath -Force
}

function Get-IndexedPaths {
  $lines = git diff --cached --name-only --diff-filter=ACMR
  if (-not $lines) {
    return @()
  }

  return @($lines | Where-Object { $_ -and $_.Trim().Length -gt 0 })
}

function Export-GitIndexSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Destination
  )

  git checkout-index --all --force --prefix="$Destination\" | Out-Null
}

try {
  $indexedPaths = Get-IndexedPaths
  if ($indexedPaths.Count -eq 0) {
    exit 0
  }

  Ensure-Gitleaks

  $tempRoot = Join-Path $env:TEMP "pttracker-gitleaks-$([guid]::NewGuid().ToString('N'))"
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  Export-GitIndexSnapshot -Destination $tempRoot

  & $exePath dir $tempRoot --config $configPath --no-banner --no-color --redact --exit-code 1
  if ($LASTEXITCODE -ne 0) {
    throw "Gitleaks detected a potential secret in the commit snapshot."
  }
}
finally {
  if ($tempRoot -and (Test-Path $tempRoot)) {
    Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
