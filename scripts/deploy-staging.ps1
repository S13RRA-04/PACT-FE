param(
  [string]$ProjectName = "cetu-pact-web-staging",
  [string]$Branch = "staging",
  [string]$EnvFile = ".env.staging"
)

$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "deploy-pages.ps1"
try {
  & $script -Target staging -ProjectName $ProjectName -Branch $Branch -EnvFile $EnvFile
} catch {
  Write-Error $_
  exit 1
}
