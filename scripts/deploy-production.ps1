param(
  [string]$ProjectName = "cetu-pact-web",
  [string]$Branch = "production",
  [string]$EnvFile = ".env.production"
)

$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "deploy-pages.ps1"
try {
  & $script -Target production -ProjectName $ProjectName -Branch $Branch -EnvFile $EnvFile
} catch {
  Write-Error $_
  exit 1
}
