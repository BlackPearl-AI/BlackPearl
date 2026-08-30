const fs = require('fs');
const path = require('path');

const srcDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency/support';
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));

const eccSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/skills';
const geminiSkillsDir = 'C:/Users/victo/.gemini/config/skills';
const agentsSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.agents/skills';
const opencodePromptsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/prompts/agents';

files.forEach(file => {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const baseSlug = file.replace('.md', '').replace(/^support-/, '');
  const skillSlug = 'agency-' + (baseSlug === 'support-responder' ? 'support-responder' : baseSlug);
  
  // Extract description
  let desc = 'The Agency support specialist';
  const descMatch = content.match(/description:\s*(.*?)(?:\r?\n[a-z_]+:|\r?\n---)/s);
  if (descMatch) {
    desc = descMatch[1].replace(/\r?\n\s*/g, ' ').trim().replace(/^['"]|['"]$/g, '');
  }

  const skillMarkdown = `---
name: ${skillSlug}
description: "${desc.replace(/"/g, '\\"')}"
metadata:
  origin: TheAgency
  division: support
---

${content.replace(/^---[\s\S]*?---\s*/, '')}
`;

  // Write to ECC skills
  const eccTarget = path.join(eccSkillsDir, skillSlug);
  if (!fs.existsSync(eccTarget)) fs.mkdirSync(eccTarget, { recursive: true });
  fs.writeFileSync(path.join(eccTarget, 'SKILL.md'), skillMarkdown, 'utf8');

  // Write to Gemini skills
  const geminiTarget = path.join(geminiSkillsDir, skillSlug);
  if (!fs.existsSync(geminiTarget)) fs.mkdirSync(geminiTarget, { recursive: true });
  fs.writeFileSync(path.join(geminiTarget, 'SKILL.md'), skillMarkdown, 'utf8');

  // Write to .agents/skills
  const agentsTarget = path.join(agentsSkillsDir, skillSlug);
  if (!fs.existsSync(agentsTarget)) fs.mkdirSync(agentsTarget, { recursive: true });
  fs.writeFileSync(path.join(agentsTarget, 'SKILL.md'), skillMarkdown, 'utf8');

  // Write prompt for OpenCode
  if (!fs.existsSync(opencodePromptsDir)) fs.mkdirSync(opencodePromptsDir, { recursive: true });
  fs.writeFileSync(path.join(opencodePromptsDir, `${skillSlug}.txt`), content.replace(/^---[\s\S]*?---\s*/, ''), 'utf8');

  console.log('Processed support agent:', skillSlug);
});
console.log('All 6 support agents converted to skills & prompts successfully!');
