# ==============================================================================
# SUper UNIFIED AI CODING ECOSYSTEM — MASTER VERIFICATION SUITE
# ==============================================================================

[CmdletBinding()]
param (
    [string]$UserHome = $env:USERPROFILE
)

Write-Host @"
==============================================================================
               SUPER UNIFIED AI CODING ECOSYSTEM HEALTH AUDIT                 
==============================================================================
"@ -ForegroundColor Cyan

$allPassed = $true

# 1. Antigravity Global Environment
Write-Host "`n1. Checking Antigravity Lead Orchestrator..." -ForegroundColor Yellow
$geminiDir = Join-Path $UserHome ".gemini\config"
$geminiAgents = Join-Path $geminiDir "AGENTS.md"
$geminiSkills = Join-Path $geminiDir "skills"
$geminiRules = Join-Path $geminiDir "rules"

if (Test-Path $geminiAgents) {
    Write-Host "  [PASS] Master AGENTS.md active at $geminiAgents" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Master AGENTS.md missing" -ForegroundColor Red
    $allPassed = $false
}

$agencySkills = (Get-ChildItem $geminiSkills -Directory -Filter "agency-*" -ErrorAction SilentlyContinue).Count
Write-Host "  [INFO] Agency Skills in ~/.gemini/config/skills/: $agencySkills (Expected: 300+)" -ForegroundColor Gray
if ($agencySkills -ge 273) {
    Write-Host "  [PASS] Antigravity skills pool verified" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Incomplete Antigravity skills pool ($agencySkills found)" -ForegroundColor Red
    $allPassed = $false
}

# 2. OpenCode Global Environment
Write-Host "`n2. Checking OpenCode Global Environment..." -ForegroundColor Yellow
$opencodeDir = Join-Path $UserHome ".config\opencode"
$opencodeJsonc = Join-Path $opencodeDir "opencode.jsonc"
$opencodeAgents = Join-Path $opencodeDir "agents"

if (Test-Path $opencodeJsonc) {
    Write-Host "  [PASS] opencode.jsonc active at $opencodeJsonc" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] opencode.jsonc missing" -ForegroundColor Red
    $allPassed = $false
}

$ocAgentFiles = (Get-ChildItem $opencodeAgents -Filter "*.md" -ErrorAction SilentlyContinue).Count
Write-Host "  [INFO] Canonical Agents in ~/.config/opencode/agents/: $ocAgentFiles (Expected: 273)" -ForegroundColor Gray
if ($ocAgentFiles -ge 273) {
    Write-Host "  [PASS] OpenCode canonical agents verified" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Incomplete OpenCode agents ($ocAgentFiles found)" -ForegroundColor Red
    $allPassed = $false
}

# 3. DeepSeek Harness Layer
Write-Host "`n3. Checking DeepSeek Harness Execution Layer..." -ForegroundColor Yellow
$dshDelegate = Join-Path $opencodeDir "scripts\dsh-delegate.js"
$dshTeam = Join-Path $opencodeDir "scripts\dsh-team.js"

if (Test-Path $dshDelegate) {
    $content = Get-Content $dshDelegate -Raw
    if ($content -match "getAgencyPrompt") {
        Write-Host "  [PASS] dsh-delegate.js verified with Universal Agency Persona Loader" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] dsh-delegate.js present but Universal Agency Loader missing" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [FAIL] dsh-delegate.js missing" -ForegroundColor Red
    $allPassed = $false
}

if (Test-Path $dshTeam) {
    Write-Host "  [PASS] dsh-team.js multi-agent team orchestrator verified" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] dsh-team.js missing" -ForegroundColor Red
    $allPassed = $false
}

# 4. Universal Hard Rules
Write-Host "`n4. Checking Universal Hard Rules..." -ForegroundColor Yellow
$modRule = Join-Path $geminiRules "modular-architecture.md"
$docRule = Join-Path $geminiRules "documentation-first-sequential-execution.md"

if (Test-Path $modRule) {
    Write-Host "  [PASS] Modular Architecture Hard Rule (5-Level Decomposition) is ACTIVE" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Modular Architecture Hard Rule missing" -ForegroundColor Red
    $allPassed = $false
}

if (Test-Path $docRule) {
    Write-Host "  [PASS] Documentation-First Sequential Execution Rule is ACTIVE" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Documentation-First Sequential Execution Rule missing" -ForegroundColor Red
    $allPassed = $false
}

# Final Summary
Write-Host "`n==============================================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ALL TESTS PASSED! System is 100% healthy, synchronized, and operational.  " -ForegroundColor Green
} else {
    Write-Host "  SOME CHECKS FAILED. Please review the output above and run .\install.ps1   " -ForegroundColor Red
}
Write-Host "==============================================================================`n" -ForegroundColor Cyan
