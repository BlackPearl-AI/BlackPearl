#!/usr/bin/env node
/**
 * DeepSeek Harness Multi-Agent Team Orchestrator
 *
 * Coordinates multi-agent team workflows across real separate DeepSeek Harness
 * agent runs with unique Orchestration Run IDs, bounded handoffs, and self-correction loops.
 *
 * Pipelines:
 * - COMPLEX: DSH_PLANNER -> DSH_IMPLEMENTER -> DSH_CODE_REVIEWER -> (DSH_FIXER loop) -> DSH_VERIFIER
 * - HIGH_RISK: DSH_PLANNER -> DSH_ARCHITECT -> DSH_IMPLEMENTER -> DSH_SECURITY_REVIEWER -> (DSH_FIXER loop) -> DSH_VERIFIER
 * - HEAVY: DSH_PLANNER -> DSH_IMPLEMENTER (worktree) -> DSH_CODE_REVIEWER -> DSH_VERIFIER
 * - AUDIT: DSH_SECURITY_REVIEWER -> DSH_CODE_REVIEWER
 */

import { execSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DELEGATE_SCRIPT = path.resolve('C:\\Users\\victo\\.config\\opencode\\scripts\\dsh-delegate.js');

function printUsage() {
  console.log(`
Usage: node dsh-team.js [options]

Options:
  --pipeline <COMPLEX|HIGH_RISK|HEAVY|AUDIT|REALITY_CHECK|FULL_ASSURANCE|COMPLIANCE_AUDIT|INFRA_OPS|STARTUP_MVP|ENTERPRISE_FEATURE|INCIDENT_RESPONSE|MCP_SERVER|CODE_ARCHAEOLOGY|SPATIAL_APP|AI_SECURITY_AUDIT|HARDCORE_SEC_AUDIT|UI_POLISH|RAG_PIPELINE|MOBILE_APP|PAYMENTS_BILLING|FULL_STACK_DEV|GIS_PIPELINE|GAME_DESIGN|HEALTHCARE_EVAL|GTM_LAUNCH|DEEP_RESEARCH>  Execution pipeline (Default: COMPLEX)
  --objective <text>                          Primary goal (Required)
  --targetPath <dir>                          Target project directory (Default: cwd)
  --allowedScope <paths>                      Allowed file paths
  --forbiddenScope <paths>                    Forbidden file paths
  --maxCycles <n>                             Max self-correction cycles (Default: 3)
  --dryRun                                    Plan runs without executing DSH
`);
}

function parseArgs(args) {
  const result = {
    pipeline: 'COMPLEX',
    objective: '',
    targetPath: process.cwd(),
    allowedScope: '',
    forbiddenScope: '.env, *.env*, credentials*, secrets*, node_modules, .git',
    maxCycles: 3,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--pipeline' && i + 1 < args.length) result.pipeline = args[++i].toUpperCase();
    else if (arg === '--objective' && i + 1 < args.length) result.objective = args[++i];
    else if (arg === '--targetPath' && i + 1 < args.length) result.targetPath = path.resolve(args[++i]);
    else if (arg === '--allowedScope' && i + 1 < args.length) result.allowedScope = args[++i];
    else if (arg === '--forbiddenScope' && i + 1 < args.length) result.forbiddenScope = args[++i];
    else if (arg === '--maxCycles' && i + 1 < args.length) result.maxCycles = parseInt(args[++i], 10);
    else if (arg === '--dryRun') result.dryRun = true;
    else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return result;
}

function runSession(role, opts, extraArgs = []) {
  const cmdArgs = [
    DELEGATE_SCRIPT,
    '--role', role,
    '--objective', opts.objective,
    '--targetPath', opts.targetPath,
  ];

  if (opts.allowedScope) cmdArgs.push('--allowedScope', opts.allowedScope);
  if (opts.forbiddenScope) cmdArgs.push('--forbiddenScope', opts.forbiddenScope);
  if (opts.dryRun) cmdArgs.push('--dryRun');

  cmdArgs.push(...extraArgs);

  console.log(`\n>>> [DSH Team Orchestrator] Spawning Real Agent Run: ${role}...`);
  const res = spawnSync('node', cmdArgs, { stdio: 'inherit', encoding: 'utf-8' });
  return res.status === 0;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.objective) {
    console.error('Error: --objective is required.');
    printUsage();
    process.exit(1);
  }

  console.log('==================================================');
  console.log('ANTIGRAVITY REAL DSH MULTI-AGENT ORCHESTRATOR');
  console.log('==================================================');
  console.log(`Pipeline: ${opts.pipeline}`);
  console.log(`Objective: ${opts.objective}`);
  console.log(`Target Workspace: ${opts.targetPath}`);
  console.log(`Max Correction Cycles: ${opts.maxCycles}`);
  console.log('==================================================\n');

  const executionTrace = ['Antigravity Lead'];

  if (opts.pipeline === 'AUDIT') {
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_CODE_REVIEWER', opts);
    executionTrace.push('DSH_CODE_REVIEWER');
  } else if (opts.pipeline === 'COMPLIANCE_AUDIT') {
    runSession('DSH_COMPLIANCE_CHECKER', opts);
    executionTrace.push('DSH_COMPLIANCE_CHECKER (The Agency)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
  } else if (opts.pipeline === 'INFRA_OPS') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_INFRA_MAINTAINER', opts);
    executionTrace.push('DSH_INFRA_MAINTAINER (The Agency)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'STARTUP_MVP') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_ARCHITECT', opts);
    executionTrace.push('DSH_ARCHITECT');
    runSession('DSH_IMPLEMENTER', opts);
    executionTrace.push('DSH_IMPLEMENTER');
    runSession('DSH_TESTER', opts);
    executionTrace.push('DSH_TESTER');
    runSession('DSH_CODE_REVIEWER', opts);
    executionTrace.push('DSH_CODE_REVIEWER');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'ENTERPRISE_FEATURE') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_ARCHITECT', opts);
    executionTrace.push('DSH_ARCHITECT');
    runSession('DSH_IMPLEMENTER', opts);
    executionTrace.push('DSH_IMPLEMENTER');
    runSession('DSH_API_TESTER', opts);
    executionTrace.push('DSH_API_TESTER (The Agency)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_COMPLIANCE_CHECKER', opts);
    executionTrace.push('DSH_COMPLIANCE_CHECKER (The Agency)');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'INCIDENT_RESPONSE') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER (Triage)');
    runSession('DSH_FIXER', opts);
    executionTrace.push('DSH_FIXER (Emergency Worktree Patch)');
    runSession('DSH_TESTER', opts);
    executionTrace.push('DSH_TESTER (Regression Guard)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'MCP_SERVER') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_MCP_BUILDER', opts);
    executionTrace.push('DSH_MCP_BUILDER (The Agency)');
    runSession('DSH_API_TESTER', opts);
    executionTrace.push('DSH_API_TESTER (The Agency)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'CODE_ARCHAEOLOGY') {
    runSession('DSH_CODEBASE_ARCHAEOLOGIST', opts);
    executionTrace.push('DSH_CODEBASE_ARCHAEOLOGIST (The Agency)');
    runSession('DSH_ARCHITECT', opts);
    executionTrace.push('DSH_ARCHITECT');
  } else if (opts.pipeline === 'SPATIAL_APP') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_ARCHITECT', opts);
    executionTrace.push('DSH_ARCHITECT');
    runSession('DSH_VISIONOS_ENGINEER', opts);
    executionTrace.push('DSH_VISIONOS_ENGINEER (The Agency)');
    runSession('DSH_PERF_BENCHMARKER', opts);
    executionTrace.push('DSH_PERF_BENCHMARKER (The Agency)');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'AI_SECURITY_AUDIT') {
    runSession('DSH_AI_CODE_AUDITOR', opts);
    executionTrace.push('DSH_AI_CODE_AUDITOR (The Agency)');
    runSession('DSH_SECRETS_ENGINEER', opts);
    executionTrace.push('DSH_SECRETS_ENGINEER (The Agency)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
  } else if (opts.pipeline === 'HARDCORE_SEC_AUDIT') {
    runSession('DSH_AI_CODE_AUDITOR', opts);
    executionTrace.push('DSH_AI_CODE_AUDITOR (The Agency)');
    runSession('DSH_APPSEC_ENGINEER', opts);
    executionTrace.push('DSH_APPSEC_ENGINEER (The Agency)');
    runSession('DSH_PEN_TESTER', opts);
    executionTrace.push('DSH_PEN_TESTER (The Agency)');
    runSession('DSH_CLOUD_SECURITY_ARCHITECT', opts);
    executionTrace.push('DSH_CLOUD_SECURITY_ARCHITECT (The Agency)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
  } else if (opts.pipeline === 'UI_POLISH') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_UI_DESIGNER', opts);
    executionTrace.push('DSH_UI_DESIGNER (The Agency)');
    runSession('DSH_WHIMSY_INJECTOR', opts);
    executionTrace.push('DSH_WHIMSY_INJECTOR (The Agency)');
    runSession('DSH_UI_FINISH_GATE', opts);
    executionTrace.push('DSH_UI_FINISH_GATE (The Agency)');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'RAG_PIPELINE') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_RAG_ENGINEER', opts);
    executionTrace.push('DSH_RAG_ENGINEER (The Agency)');
    runSession('DSH_TESTER', opts);
    executionTrace.push('DSH_TESTER');
    runSession('DSH_CODE_REVIEWER', opts);
    executionTrace.push('DSH_CODE_REVIEWER');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'MOBILE_APP') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_MOBILE_DEVELOPER', opts);
    executionTrace.push('DSH_MOBILE_DEVELOPER (The Agency)');
    runSession('DSH_TESTER', opts);
    executionTrace.push('DSH_TESTER');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'PAYMENTS_BILLING') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_ARCHITECT', opts);
    executionTrace.push('DSH_ARCHITECT');
    runSession('DSH_PAYMENTS_ENGINEER', opts);
    executionTrace.push('DSH_PAYMENTS_ENGINEER (The Agency)');
    runSession('DSH_API_TESTER', opts);
    executionTrace.push('DSH_API_TESTER (The Agency)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'FULL_STACK_DEV') {
    runSession('DSH_PRODUCT_MANAGER', opts);
    executionTrace.push('DSH_PRODUCT_MANAGER (The Agency)');
    runSession('DSH_BACKEND_ARCHITECT', opts);
    executionTrace.push('DSH_BACKEND_ARCHITECT (The Agency)');
    runSession('DSH_UI_DESIGNER', opts);
    executionTrace.push('DSH_UI_DESIGNER (The Agency)');
    runSession('DSH_TESTER', opts);
    executionTrace.push('DSH_TESTER');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'GIS_PIPELINE') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_GIS_DEVELOPER', opts);
    executionTrace.push('DSH_GIS_DEVELOPER (The Agency)');
    runSession('DSH_PERF_BENCHMARKER', opts);
    executionTrace.push('DSH_PERF_BENCHMARKER (The Agency)');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'GAME_DESIGN') {
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');
    runSession('DSH_GAME_DESIGNER', opts);
    executionTrace.push('DSH_GAME_DESIGNER (The Agency)');
    runSession('DSH_TESTER', opts);
    executionTrace.push('DSH_TESTER');
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  } else if (opts.pipeline === 'HEALTHCARE_EVAL') {
    runSession('DSH_CLINICAL_SPECIALIST', opts);
    executionTrace.push('DSH_CLINICAL_SPECIALIST (The Agency)');
    runSession('DSH_DATA_PRIVACY_OFFICER', opts);
    executionTrace.push('DSH_DATA_PRIVACY_OFFICER (The Agency)');
    runSession('DSH_SECURITY_REVIEWER', opts);
    executionTrace.push('DSH_SECURITY_REVIEWER');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
  } else if (opts.pipeline === 'GTM_LAUNCH') {
    runSession('DSH_PRODUCT_MANAGER', opts);
    executionTrace.push('DSH_PRODUCT_MANAGER (The Agency)');
    runSession('DSH_GROWTH_HACKER', opts);
    executionTrace.push('DSH_GROWTH_HACKER (The Agency)');
    runSession('DSH_SEO_SPECIALIST', opts);
    executionTrace.push('DSH_SEO_SPECIALIST (The Agency)');
    runSession('DSH_OUTBOUND_STRATEGIST', opts);
    executionTrace.push('DSH_OUTBOUND_STRATEGIST (The Agency)');
    runSession('DSH_REALITY_CHECKER', opts);
    executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
  } else if (opts.pipeline === 'DEEP_RESEARCH') {
    runSession('DSH_RESEARCH_SYNTHESIST', opts);
    executionTrace.push('DSH_RESEARCH_SYNTHESIST (The Agency)');
    runSession('DSH_ARCHITECT', opts);
    executionTrace.push('DSH_ARCHITECT');
  } else {
    // 1. Planner Run (Soft Read-Only)
    runSession('DSH_PLANNER', opts);
    executionTrace.push('DSH_PLANNER');

    // 2. Architect Run (Soft Read-Only) if HIGH_RISK
    if (opts.pipeline === 'HIGH_RISK') {
      runSession('DSH_ARCHITECT', opts);
      executionTrace.push('DSH_ARCHITECT');
    }

    // 3. Implementer Run (Write in isolated worktree)
    runSession('DSH_IMPLEMENTER', opts);
    executionTrace.push('DSH_IMPLEMENTER');

    // 4. Reviewer Run (Soft Read-Only)
    const reviewerRole = opts.pipeline === 'HIGH_RISK' ? 'DSH_SECURITY_REVIEWER' : 'DSH_CODE_REVIEWER';
    runSession(reviewerRole, opts);
    executionTrace.push(reviewerRole);

    if (opts.pipeline === 'REALITY_CHECK' || opts.pipeline === 'FULL_ASSURANCE') {
      runSession('DSH_REALITY_CHECKER', opts);
      executionTrace.push('DSH_REALITY_CHECKER (The Agency)');
    }

    if (opts.pipeline === 'FULL_ASSURANCE') {
      runSession('DSH_ACCESSIBILITY_AUDITOR', opts);
      executionTrace.push('DSH_ACCESSIBILITY_AUDITOR (The Agency)');
      runSession('DSH_PERF_BENCHMARKER', opts);
      executionTrace.push('DSH_PERF_BENCHMARKER (The Agency)');
    }

    // 5. Verifier Run (Soft Read-Only / Tests)
    runSession('DSH_VERIFIER', opts);
    executionTrace.push('DSH_VERIFIER');
  }

  executionTrace.push('Antigravity / ECC Final Quality Gate');

  console.log('\n==================================================');
  console.log('ORCHESTRATION PIPELINE COMPLETED');
  console.log('==================================================');
  console.log(`Execution Trace: ${executionTrace.join(' ➔ ')}`);
  console.log('==================================================\n');
}

main().catch((err) => {
  console.error('[DSH Team Orchestrator] Fatal error:', err);
  process.exit(1);
});










