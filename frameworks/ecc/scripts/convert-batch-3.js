const fs = require('fs');
const path = require('path');

const root = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency';
const batch3Divisions = ['marketing', 'paid-media', 'sales', 'academic', 'research'];

const eccSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/skills';
const geminiSkillsDir = 'C:/Users/victo/.gemini/config/skills';
const agentsSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.agents/skills';
const opencodePromptsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/prompts/agents';
const opencodeAgentsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/agents';

let totalConverted = 0;

batch3Divisions.forEach(div => {
  const divPath = path.join(root, div);
  const files = fs.readdirSync(divPath).filter(f => f.endsWith('.md'));
  console.log(`Processing ${div} (${files.length} agents)...`);

  files.forEach(file => {
    const content = fs.readFileSync(path.join(divPath, file), 'utf8');
    let baseSlug = file.replace('.md', '');
    if (baseSlug.startsWith(div + '-')) {
      baseSlug = baseSlug.replace(new RegExp('^' + div + '-'), '');
    }
    const skillSlug = 'agency-' + baseSlug;

    // Extract description
    let desc = `The Agency ${div} specialist`;
    const descMatch = content.match(/description:\s*(.*?)(?:\r?\n[a-z_]+:|\r?\n---)/s);
    if (descMatch) {
      desc = descMatch[1].replace(/\r?\n\s*/g, ' ').trim().replace(/^['"]|['"]$/g, '');
    }

    const skillMarkdown = `---
name: ${skillSlug}
description: "${desc.replace(/"/g, '\\"')}"
metadata:
  origin: TheAgency
  division: ${div}
---

# ${div.toUpperCase()} Agent Directive
> **Harmonized with ECC Rules**: Implementations executed by this agent MUST strictly follow the Modular Architecture Hard Rule (5-level decomposition) and Documentation-First Sequential Execution.

---

${content.replace(/^---[\s\S]*?---\s*/, '')}
`;

    // 1. ECC Skills
    const eccTarget = path.join(eccSkillsDir, skillSlug);
    if (!fs.existsSync(eccTarget)) fs.mkdirSync(eccTarget, { recursive: true });
    fs.writeFileSync(path.join(eccTarget, 'SKILL.md'), skillMarkdown, 'utf8');

    // 2. Gemini Global Skills
    const geminiTarget = path.join(geminiSkillsDir, skillSlug);
    if (!fs.existsSync(geminiTarget)) fs.mkdirSync(geminiTarget, { recursive: true });
    fs.writeFileSync(path.join(geminiTarget, 'SKILL.md'), skillMarkdown, 'utf8');

    // 3. .agents/skills
    const agentsTarget = path.join(agentsSkillsDir, skillSlug);
    if (!fs.existsSync(agentsTarget)) fs.mkdirSync(agentsTarget, { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, 'SKILL.md'), skillMarkdown, 'utf8');

    // 4. OpenCode prompt & agent
    fs.writeFileSync(path.join(opencodeAgentsDir, `${skillSlug}.md`), content, 'utf8');
    fs.writeFileSync(path.join(opencodePromptsDir, `${skillSlug}.txt`), content.replace(/^---[\s\S]*?---\s*/, ''), 'utf8');

    totalConverted++;
  });
});

console.log(`\nBatch 3 completed! Converted ${totalConverted} agents across marketing, paid-media, sales, academic, and research.`);
