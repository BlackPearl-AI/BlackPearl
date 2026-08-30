# ==============================================================================
# BlackPearl PROJECT SCAFFOLDER
# Instantly binds BlackPearl Orchestrator, BlackPearl Skills, and Hard Rules into any project
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$TargetProject
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $TargetProject)) {
    Write-Error "Target project path does not exist: $TargetProject"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = Get-Location }

$templatesDir = Join-Path $ScriptDir "templates"

Write-Host "Scaffolding BlackPearl Suite AI engineering rules into: $TargetProject" -ForegroundColor Cyan

# 1. Scaffold .agents directory
$targetAgents = Join-Path $TargetProject ".agents"
$targetRules = Join-Path $targetAgents "rules"
if (-not (Test-Path $targetRules)) { New-Item -ItemType Directory -Path $targetRules -Force | Out-Null }
Copy-Item (Join-Path $templatesDir ".agents\rules\*") -Destination $targetRules -Recurse -Force
Write-Host "  [OK] Injected .agents/rules/ (Modular Architecture & Doc-First Execution)" -ForegroundColor Green

# 2. Scaffold .opencode directory
$targetOpencode = Join-Path $TargetProject ".opencode"
if (-not (Test-Path $targetOpencode)) { New-Item -ItemType Directory -Path $targetOpencode -Force | Out-Null }
Copy-Item (Join-Path $templatesDir ".opencode\*") -Destination $targetOpencode -Recurse -Force
Write-Host "  [OK] Injected .opencode/ configuration & prompt bindings" -ForegroundColor Green

# 3. Scaffold AGENTS.md
Copy-Item (Join-Path $templatesDir "AGENTS.md") -Destination $TargetProject -Force
Write-Host "  [OK] Injected project AGENTS.md" -ForegroundColor Green

Write-Host "`nProject successfully scaffolded! BlackPearl Suite is fully active in this repository." -ForegroundColor Cyan


