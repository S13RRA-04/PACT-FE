param(
  [string]$ProjectName = "cetu-pact-web-staging",
  [string]$Branch = "staging",
  [string]$EnvFile = ".env.staging"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $projectRoot

function Read-DotEnvFile([string]$Path) {
  $values = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#")) {
      return
    }
    $separator = $line.IndexOf("=")
    if ($separator -lt 1) {
      return
    }
    $values[$line.Substring(0, $separator).Trim()] = $line.Substring($separator + 1).Trim().Trim('"').Trim("'")
  }
  return $values
}

function Require-HttpsUrl($Values, [string]$Name) {
  if (-not $Values.ContainsKey($Name) -or [string]::IsNullOrWhiteSpace($Values[$Name])) {
    throw "$Name is required in $EnvFile."
  }
  $uri = $null
  if (-not [System.Uri]::TryCreate($Values[$Name], [System.UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne "https") {
    throw "$Name must be an absolute HTTPS URL."
  }
}

function Invoke-CheckedCommand([string]$Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

function Invoke-CheckedOutput([string]$Command, [string[]]$Arguments) {
  $output = & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
  return $output
}

function Test-PagesProjectExists([string]$Name) {
  $projectsJson = Invoke-CheckedOutput "npx" @("wrangler", "pages", "project", "list", "--json")
  $projects = $projectsJson | ConvertFrom-Json
  foreach ($project in $projects) {
    if ($project.name -eq $Name -or $project."Project Name" -eq $Name) {
      return $true
    }
  }
  foreach ($project in $projects.result) {
    if ($project.name -eq $Name -or $project."Project Name" -eq $Name) {
      return $true
    }
  }
  return $false
}

if (-not (Test-Path $EnvFile)) {
  throw "Missing $EnvFile. Copy .env.staging.example to $EnvFile and set the PACT API staging URL."
}

$envValues = Read-DotEnvFile $EnvFile
Require-HttpsUrl $envValues "VITE_PACT_API_BASE_URL"

foreach ($key in $envValues.Keys) {
  Set-Item -Path "env:$key" -Value $envValues[$key]
}

Invoke-CheckedCommand "npm" @("run", "build:staging")

if (-not (Test-PagesProjectExists $ProjectName)) {
  try {
    Invoke-CheckedCommand "npx" @("wrangler", "pages", "project", "create", $ProjectName, "--production-branch", $Branch)
  } catch {
    if (-not ($_.Exception.Message -match "already exists")) {
      throw
    }
  }
}

Invoke-CheckedCommand "npx" @("wrangler", "pages", "deploy", "dist", "--project-name", $ProjectName, "--branch", $Branch, "--commit-dirty=true")
