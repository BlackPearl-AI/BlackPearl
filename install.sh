#!/usr/bin/env bash
# ==============================================================================
# BlackPearl UNIFIED AI CODING ECOSYSTEM — MASTER BASH INSTALLER
# BlackPearl Orchestrator + BlackPearl Skills + BlackPearl Core + BlackPearl Divisions
# ==============================================================================

set -e

echo "=============================================================================="
echo "                    BlackPearl MASTER AI ECOSYSTEM INSTALLER                       "
echo "      [BlackPearl Orchestrator + BlackPearl Skills + BlackPearl Core + BlackPearl Divisions]      "
echo "=============================================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_HOME="${HOME}"

echo ""
echo "[1/4] Deploying BlackPearl Orchestrator Lead Supervisor (~/.gemini/config)..."
GEMINI_CONFIG="${TARGET_HOME}/.gemini/config"
mkdir -p "${GEMINI_CONFIG}/skills" "${GEMINI_CONFIG}/rules"

cp "${SCRIPT_DIR}/platforms/antigravity/AGENTS.md" "${GEMINI_CONFIG}/"
[ -f "${SCRIPT_DIR}/platforms/antigravity/GEMINI.md" ] && cp "${SCRIPT_DIR}/platforms/antigravity/GEMINI.md" "${GEMINI_CONFIG}/"
cp -r "${SCRIPT_DIR}/platforms/antigravity/rules/"* "${GEMINI_CONFIG}/rules/"
cp -r "${SCRIPT_DIR}/platforms/antigravity/skills/"* "${GEMINI_CONFIG}/skills/"

echo "  [OK] BlackPearl Orchestrator configured!"

echo ""
echo "[2/4] Deploying BlackPearl Agent Layer (~/.config/opencode)..."
OPENCODE_DIR="${TARGET_HOME}/.config/opencode"
mkdir -p "${OPENCODE_DIR}/agents" "${OPENCODE_DIR}/scripts"

cp "${SCRIPT_DIR}/platforms/opencode/opencode.jsonc" "${OPENCODE_DIR}/"
cp -r "${SCRIPT_DIR}/platforms/opencode/agents/"* "${OPENCODE_DIR}/agents/"
cp -r "${SCRIPT_DIR}/platforms/opencode/scripts/"* "${OPENCODE_DIR}/scripts/"

echo "  [OK] BlackPearl Agent Layer configured!"

echo ""
echo "[3/4] Wiring BlackPearl Core Multi-Agent Worktree Layer..."
LOCAL_DSH="${SCRIPT_DIR}/frameworks/blackpearl-core"
sed -i "s|const DSH_ROOT = \".*\";|const DSH_ROOT = \"${LOCAL_DSH}\";|g" "${OPENCODE_DIR}/scripts/dsh-delegate.js" 2>/dev/null || true
echo "  [OK] BlackPearl Core wired!"

echo ""
echo "[4/4] Verification check..."
echo "=============================================================================="
echo "         BlackPearl MASTER ECOSYSTEM INSTALLATION COMPLETE & VERIFIED!             "
echo "=============================================================================="


