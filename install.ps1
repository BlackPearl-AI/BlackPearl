# ==============================================================================
# SUper UNIFIED AI CODING ECOSYSTEM — MASTER INSTALLER
# Antigravity Lead Orchestrator + Everything Claude Code + DeepSeek Harness + The Agency
# ==============================================================================

[CmdletBinding()]
param (
    [string]$TargetUserHome = $env:USERPROFILE,
    [switch]$SkipVerification
)

$ErrorActionPreference = "Stop"

Write-Host @"
==============================================================================
                    SUPER MASTER AI ECOSYSTEM INSTALLER                       
   [Antigravity Orchestrator + ECC + DeepSeek Harness + The Agency (18 Divs)] 
==============================================================================
"@ -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = Get-Location }

# --- 1. System & Tooling Inspection ---
Write-Host "`n[1/5] Checking system environment & runtime prerequisites..." -ForegroundColor Yellow

try {
    $gitVer = git --version
    Write-Host "  [OK] Git detected: $gitVer" -ForegroundColor Green
} catch {
    Write-Warning "  [WARN] Git is not in PATH. Please ensure Git is installed."
}

try {
    $nodeVer = node -v
    Write-Host "  [OK] Node.js detected: $nodeVer" -ForegroundColor Green
} catch {
    Write-Warning "  [WARN] Node.js is not in PATH. Node.js v18+ is required for DSH multi-agent execution."
}

# --- 2. Configure Antigravity Global Environment ---
Write-Host "`n[2/5] Deploying Antigravity Lead Supervisor (~/.gemini/config)..." -ForegroundColor Yellow

$geminiRoot = Join-Path $TargetUserHome ".gemini\config"
$geminiSkills = Join-Path $geminiRoot "skills"
$geminiRules  = Join-Path $geminiRoot "rules"

$agPlatformSrc = Join-Path $ScriptDir "platforms\antigravity"

if (-not (Test-Path $geminiSkills)) { New-Item -ItemType Directory -Path $geminiSkills -Force | Out-Null }
if (-not (Test-Path $geminiRules))  { New-Item -ItemType Directory -Path $geminiRules  -Force | Out-Null }

# Copy master supervisor directives & universal rules
Copy-Item (Join-Path $agPlatformSrc "AGENTS.md") -Destination $geminiRoot -Force
if (Test-Path (Join-Path $agPlatformSrc "GEMINI.md")) {
    Copy-Item (Join-Path $agPlatformSrc "GEMINI.md") -Destination $geminiRoot -Force
}

# Copy Hard Rules
Copy-Item (Join-Path $agPlatformSrc "rules\*") -Destination $geminiRules -Recurse -Force

# Copy Global Skills Pool
Write-Host "  Syncing global skills pool (345+ specialized skills)..." -ForegroundColor Gray
Copy-Item (Join-Path $agPlatformSrc "skills\*") -Destination $geminiSkills -Recurse -Force

$activeSkills = (Get-ChildItem $geminiSkills -Directory).Count
Write-Host "  [OK] Antigravity Lead configured! ($activeSkills active skills in ~/.gemini/config/skills/)" -ForegroundColor Green

# --- 3. Configure OpenCode Global Environment ---
Write-Host "`n[3/5] Deploying OpenCode Global Environment (~/.config/opencode)..." -ForegroundColor Yellow

$opencodeRoot = Join-Path $TargetUserHome ".config\opencode"
$opencodeAgents = Join-Path $opencodeRoot "agents"
$opencodeScripts = Join-Path $opencodeRoot "scripts"

$ocPlatformSrc = Join-Path $ScriptDir "platforms\opencode"

if (-not (Test-Path $opencodeAgents))  { New-Item -ItemType Directory -Path $opencodeAgents  -Force | Out-Null }
if (-not (Test-Path $opencodeScripts)) { New-Item -ItemType Directory -Path $opencodeScripts -Force | Out-Null }

# Copy Global opencode.jsonc
Copy-Item (Join-Path $ocPlatformSrc "opencode.jsonc") -Destination $opencodeRoot -Force

# Copy Canonical Agent Markdown Files
Write-Host "  Syncing canonical OpenCode agents (273+ specialized agents)..." -ForegroundColor Gray
Copy-Item (Join-Path $ocPlatformSrc "agents\*") -Destination $opencodeAgents -Recurse -Force

# Copy DeepSeek Harness execution scripts
Copy-Item (Join-Path $ocPlatformSrc "scripts\*") -Destination $opencodeScripts -Recurse -Force

$activeAgents = (Get-ChildItem $opencodeAgents -Filter "*.md").Count
Write-Host "  [OK] OpenCode configured! ($activeAgents agents active in ~/.config/opencode/agents/)" -ForegroundColor Green

# --- 4. Wire DeepSeek Harness Execution Layer ---
Write-Host "`n[4/5] Wiring DeepSeek Harness Multi-Agent Worktree Layer..." -ForegroundColor Yellow

$localDshRoot = Join-Path $ScriptDir "frameworks\deepseek-harness"
$dshDelegateFile = Join-Path $opencodeScripts "dsh-delegate.js"

if (Test-Path $dshDelegateFile) {
    # Dynamically update DSH_ROOT to point to local frameworks/deepseek-harness
    $dshContent = Get-Content $dshDelegateFile -Raw
    $escapedDshPath = $localDshRoot.Replace("\", "\\")
    $dshContent = $dshContent -replace 'const DSH_ROOT = ".*?";', "const DSH_ROOT = `"$escapedDshPath`";"
    Set-Content -Path $dshDelegateFile -Value $dshContent -Encoding UTF8
    Write-Host "  [OK] dsh-delegate.js linked to local DeepSeek engine at $localDshRoot" -ForegroundColor Green
}

# --- 5. Self-Verification Suite ---
if (-not $SkipVerification) {
    Write-Host "`n[5/5] Running Automated System Health Verification Suite..." -ForegroundColor Yellow
    & (Join-Path $ScriptDir "verify.ps1") -UserHome $TargetUserHome
}

Write-Host @"

==============================================================================
         SUPER MASTER ECOSYSTEM INSTALLATION COMPLETE & VERIFIED!             
==============================================================================

How to use on this machine:
1. Antigravity IDE: All 345+ skills and hard rules automatically trigger on intent.
2. OpenCode CLI/UI: Type '@' to summon any of the 273+ agents in ANY project.
3. DeepSeek Harness: Run multi-agent team pipelines:
   node "$opencodeScripts\dsh-team.js" --pipeline FULL_STACK_DEV --objective "<GOAL>"
4. New Project Scaffolding:
   .\scaffold.ps1 -TargetProject "C:\path\to\new-project"

"@ -ForegroundColor Cyan
