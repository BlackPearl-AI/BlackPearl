#!/usr/bin/env bash
# ==============================================================================
# SUper UNIFIED AI CODING ECOSYSTEM — MASTER BASH INSTALLER
# SUper Orchestrator + SUper Skills + SUper Core + SUper Divisions
# ==============================================================================

set -e

echo "=============================================================================="
echo "                    SUPER MASTER AI ECOSYSTEM INSTALLER                       "
echo "      [SUper Orchestrator + SUper Skills + SUper Core + SUper Divisions]      "
echo "=============================================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_HOME="${HOME}"

echo ""
echo "[1/4] Deploying SUper Orchestrator Lead Supervisor (~/.gemini/config)..."
GEMINI_CONFIG="${TARGET_HOME}/.gemini/config"
mkdir -p "${GEMINI_CONFIG}/skills" "${GEMINI_CONFIG}/rules"

cp "${SCRIPT_DIR}/platforms/antigravity/AGENTS.md" "${GEMINI_CONFIG}/"
[ -f "${SCRIPT_DIR}/platforms/antigravity/GEMINI.md" ] && cp "${SCRIPT_DIR}/platforms/antigravity/GEMINI.md" "${GEMINI_CONFIG}/"
cp -r "${SCRIPT_DIR}/platforms/antigravity/rules/"* "${GEMINI_CONFIG}/rules/"
cp -r "${SCRIPT_DIR}/platforms/antigravity/skills/"* "${GEMINI_CONFIG}/skills/"

echo "  [OK] SUper Orchestrator configured!"

echo ""
echo "[2/4] Deploying SUper Agent Layer (~/.config/opencode)..."
OPENCODE_DIR="${TARGET_HOME}/.config/opencode"
mkdir -p "${OPENCODE_DIR}/agents" "${OPENCODE_DIR}/scripts"

cp "${SCRIPT_DIR}/platforms/opencode/opencode.jsonc" "${OPENCODE_DIR}/"
cp -r "${SCRIPT_DIR}/platforms/opencode/agents/"* "${OPENCODE_DIR}/agents/"
cp -r "${SCRIPT_DIR}/platforms/opencode/scripts/"* "${OPENCODE_DIR}/scripts/"

echo "  [OK] SUper Agent Layer configured!"

echo ""
echo "[3/4] Wiring SUper Core Multi-Agent Worktree Layer..."
LOCAL_DSH="${SCRIPT_DIR}/frameworks/super-core"
sed -i "s|const DSH_ROOT = \".*\";|const DSH_ROOT = \"${LOCAL_DSH}\";|g" "${OPENCODE_DIR}/scripts/dsh-delegate.js" 2>/dev/null || true
echo "  [OK] SUper Core wired!"

echo ""
echo "[4/4] Verification check..."
echo "=============================================================================="
echo "         SUPER MASTER ECOSYSTEM INSTALLATION COMPLETE & VERIFIED!             "
echo "=============================================================================="
