import sys
import os
import urllib.request
import json

CLI_PATH = r"G:\0000 PY PROGRAM\july\super AIrepo_and_aget\qwen-code-main - Copy\qwen-code-main\packages\cli\src\cli.ts"
OLLAMA_URL = "http://localhost:11434/api/tags"

def check_setup():
    print("====================================================")
    print("   Qwen Code Engine — Local Setup Verification     ")
    print("====================================================\n")

    # 1. Check CLI Entrypoint Path
    if os.path.exists(CLI_PATH):
        print(f"[OK] CLI Entrypoint found: {CLI_PATH}")
    else:
        print(f"[ERROR] CLI Entrypoint NOT found at: {CLI_PATH}")

    # 2. Check Ollama API Status
    try:
        req = urllib.request.Request(OLLAMA_URL)
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("name") for m in data.get("models", [])]
            print(f"[OK] Local Ollama is running. Available models: {models}")
            
            has_qwen = any("qwen" in m.lower() for m in models)
            if has_qwen:
                print("[OK] Qwen model detected in Ollama!")
            else:
                print("[WARNING] Qwen model not found in Ollama. Please run: ollama pull qwen2.5-coder:7b")
    except Exception as e:
        print(f"[WARNING] Could not connect to local Ollama ({OLLAMA_URL}): {e}")
        print("Ensure Ollama service is running locally.")

    print("\nVerification Complete.")

if __name__ == "__main__":
    check_setup()
