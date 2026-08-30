const fs = require('fs');
const path = require('path');

const agRoot = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency';
const canonicalDir = path.join(agRoot, 'integrations/opencode/agents');
const canonicalFiles = fs.readdirSync(canonicalDir).filter(f => f.endsWith('.md'));

const eccSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/skills';
const geminiSkillsDir = 'C:/Users/victo/.gemini/config/skills';
const agentsSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.agents/skills';
const eccAgentsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/agents';
const eccPromptsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/prompts/agents';
const opencodeJsonPath = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/opencode.json';

const opencodeData = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));

let added = 0;
let skipped = 0;

canonicalFiles.forEach(file => {
  const slug = 'agency-' + file.replace('.md', '');
  const canonicalContent = fs.readFileSync(path.join(canonicalDir, file), 'utf8');
  
  // Parse frontmatter
  let name = slug;
  let description = 'The Agency specialist agent';
  let division = 'specialized';
  const fmMatch = canonicalContent.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/name:\s*(.+)/);
    const descMatch = fm.match(/description:\s*(.+)/);
    const divMatch = fm.match(/division:\s*(.+)/);
    if (nameMatch) name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
    if (descMatch) description = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
    if (divMatch) division = divMatch[1].trim().replace(/^['"]|['"]$/g, '');
  }
  
  const bodyContent = canonicalContent.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  
  // Build full SKILL.md
  const skillContent = '---\nname: ' + slug + '\ndescription: "' + description.replace(/"/g, '\\"') + '"\nmetadata:\n  origin: TheAgency\n  division: ' + division + '\n---\n\n# ' + name.toUpperCase() + ' — The Agency\n> **ECC Hard Rules Active**: Strictly enforce Modular Architecture (5-Level Decomposition) and Documentation-First Sequential Execution.\n\n---\n\n' + bodyContent;

  // 1. ECC skills
  const eccTarget = path.join(eccSkillsDir, slug);
  if (!fs.existsSync(eccTarget)) fs.mkdirSync(eccTarget, { recursive: true });
  fs.writeFileSync(path.join(eccTarget, 'SKILL.md'), skillContent);

  // 2. Antigravity global skills
  const geminiTarget = path.join(geminiSkillsDir, slug);
  if (!fs.existsSync(geminiTarget)) fs.mkdirSync(geminiTarget, { recursive: true });
  fs.writeFileSync(path.join(geminiTarget, 'SKILL.md'), skillContent);

  // 3. .agents/skills
  const agentsTarget = path.join(agentsSkillsDir, slug);
  if (!fs.existsSync(agentsTarget)) fs.mkdirSync(agentsTarget, { recursive: true });
  fs.writeFileSync(path.join(agentsTarget, 'SKILL.md'), skillContent);

  // 4. OpenCode agent file (use canonical content directly)
  fs.writeFileSync(path.join(eccAgentsDir, slug + '.md'), canonicalContent);
  
  // 5. OpenCode prompts
  fs.writeFileSync(path.join(eccPromptsDir, slug + '.txt'), bodyContent);

  // 6. Register in opencode.json
  const isWrite = ['engineer','developer','builder','designer','scripter','creator','architect'].some(w => slug.includes(w));
  if (!opencodeData.agent[slug]) {
    opencodeData.agent[slug] = {
      description: description.slice(0, 200),
      mode: 'subagent',
      prompt: '{file:prompts/agents/' + slug + '.txt}',
      tools: { read: true, write: isWrite, edit: isWrite, bash: true }
    };
    added++;
  } else {
    // Update existing with better data from canonical
    opencodeData.agent[slug].description = description.slice(0, 200);
    skipped++;
  }
});

fs.writeFileSync(opencodeJsonPath, JSON.stringify(opencodeData, null, 2), 'utf8');
console.log('Done! Added:', added, '| Updated existing:', skipped, '| Total agents in opencode.json:', Object.keys(opencodeData.agent).length);
