const fs = require('fs');
const path = require('path');

const srcDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency/spatial-computing';
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));

const eccSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/skills';
const geminiSkillsDir = 'C:/Users/victo/.gemini/config/skills';
const agentsSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.agents/skills';
const opencodePromptsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/prompts/agents';

files.forEach(file => {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const baseSlug = file.replace('.md', '');
  const skillSlug = 'agency-' + baseSlug;
  
  // Extract description
  let desc = 'The Agency spatial computing specialist';
  const descMatch = content.match(/description:\s*(.*?)(?:\r?\n[a-z_]+:|\r?\n---)/s);
  if (descMatch) {
    desc = descMatch[1].replace(/\r?\n\s*/g, ' ').trim().replace(/^['"]|['"]$/g, '');
  }

  const skillMarkdown = `---
name: ${skillSlug}
description: "${desc.replace(/"/g, '\\"')}"
metadata:
  origin: TheAgency
  division: spatial-computing
---

# Spatial Computing Agent Directive
> **Harmonized with ECC Rules**: Implementations executed by this agent MUST strictly follow the Modular Architecture Hard Rule (5-level decomposition) and Documentation-First Sequential Execution.

---

${content.replace(/^---[\s\S]*?---\s*/, '')}
`;

  // 1. Write to ECC skills
  const eccTarget = path.join(eccSkillsDir, skillSlug);
  if (!fs.existsSync(eccTarget)) fs.mkdirSync(eccTarget, { recursive: true });
  fs.writeFileSync(path.join(eccTarget, 'SKILL.md'), skillMarkdown, 'utf8');

  // 2. Write to Gemini global skills
  const geminiTarget = path.join(geminiSkillsDir, skillSlug);
  if (!fs.existsSync(geminiTarget)) fs.mkdirSync(geminiTarget, { recursive: true });
  fs.writeFileSync(path.join(geminiTarget, 'SKILL.md'), skillMarkdown, 'utf8');

  // 3. Write to .agents/skills
  const agentsTarget = path.join(agentsSkillsDir, skillSlug);
  if (!fs.existsSync(agentsTarget)) fs.mkdirSync(agentsTarget, { recursive: true });
  fs.writeFileSync(path.join(agentsTarget, 'SKILL.md'), skillMarkdown, 'utf8');

  // 4. Write prompt for OpenCode
  if (!fs.existsSync(opencodePromptsDir)) fs.mkdirSync(opencodePromptsDir, { recursive: true });
  fs.writeFileSync(path.join(opencodePromptsDir, `${skillSlug}.txt`), content.replace(/^---[\s\S]*?---\s*/, ''), 'utf8');

  console.log('Processed spatial computing agent:', skillSlug);
});
console.log('All 6 spatial computing agents converted to skills & prompts successfully!');
