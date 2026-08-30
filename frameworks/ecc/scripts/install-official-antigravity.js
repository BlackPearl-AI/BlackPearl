const fs = require('fs');
const path = require('path');

const srcRoot = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency/integrations/antigravity';
const geminiSkillsDir = 'C:/Users/victo/.gemini/config/skills';
const agentsSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.agents/skills';
const eccSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/skills';

// Also read the opencode canonical agents
const ocSrcDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency/integrations/opencode/agents';
const eccPromptsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/prompts/agents';
const eccAgentsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/agents';
const opencodeJsonPath = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/opencode.json';
const opencodeData = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));

const agentDirs = fs.readdirSync(srcRoot).filter(f => {
  return fs.statSync(path.join(srcRoot, f)).isDirectory();
});

console.log('Copying', agentDirs.length, 'official Antigravity agent skill packages...');

let copied = 0, newInOpencode = 0;

agentDirs.forEach(agentSlug => {
  const srcAgentDir = path.join(srcRoot, agentSlug);
  const skillSrc = path.join(srcAgentDir, 'SKILL.md');
  
  if (!fs.existsSync(skillSrc)) {
    console.log('  [SKIP - no SKILL.md]', agentSlug);
    return;
  }

  const skillContent = fs.readFileSync(skillSrc, 'utf8');

  // 1. Antigravity global skills (~/.gemini/config/skills/)
  const geminiTarget = path.join(geminiSkillsDir, agentSlug);
  if (!fs.existsSync(geminiTarget)) fs.mkdirSync(geminiTarget, { recursive: true });
  fs.writeFileSync(path.join(geminiTarget, 'SKILL.md'), skillContent);

  // 2. ECC .agents/skills/
  const agentsTarget = path.join(agentsSkillsDir, agentSlug);
  if (!fs.existsSync(agentsTarget)) fs.mkdirSync(agentsTarget, { recursive: true });
  fs.writeFileSync(path.join(agentsTarget, 'SKILL.md'), skillContent);

  // 3. ECC skills/
  const eccTarget = path.join(eccSkillsDir, agentSlug);
  if (!fs.existsSync(eccTarget)) fs.mkdirSync(eccTarget, { recursive: true });
  fs.writeFileSync(path.join(eccTarget, 'SKILL.md'), skillContent);

  // 4. Copy any additional files in the agent dir (like examples/, scripts/ etc)
  const extraFiles = fs.readdirSync(srcAgentDir).filter(f => f !== 'SKILL.md');
  extraFiles.forEach(ef => {
    const efSrc = path.join(srcAgentDir, ef);
    if (fs.statSync(efSrc).isDirectory()) {
      const efDest = path.join(geminiTarget, ef);
      if (!fs.existsSync(efDest)) fs.mkdirSync(efDest, { recursive: true });
    } else {
      fs.copyFileSync(efSrc, path.join(geminiTarget, ef));
    }
  });

  copied++;
});

// Also sync from opencode canonical agents
const ocFiles = fs.readdirSync(ocSrcDir).filter(f => f.endsWith('.md'));
ocFiles.forEach(f => {
  const slug = 'agency-' + f.replace('.md', '');
  const content = fs.readFileSync(path.join(ocSrcDir, f), 'utf8');
  const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  
  fs.writeFileSync(path.join(eccAgentsDir, slug + '.md'), content);
  fs.writeFileSync(path.join(eccPromptsDir, slug + '.txt'), body);
  
  // Update opencode.json with canonical description
  let desc = 'The Agency specialist';
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const dm = fmMatch[1].match(/description:\s*(.+)/);
    if (dm) desc = dm[1].trim().replace(/^['"]|['"]$/g, '');
  }
  
  const isWrite = ['engineer','developer','builder','designer','scripter','creator','architect'].some(w => slug.includes(w));
  if (!opencodeData.agent[slug]) {
    opencodeData.agent[slug] = {
      description: desc.slice(0,200),
      mode: 'subagent',
      prompt: '{file:prompts/agents/' + slug + '.txt}',
      tools: { read: true, write: isWrite, edit: isWrite, bash: true }
    };
    newInOpencode++;
  } else {
    opencodeData.agent[slug].description = desc.slice(0,200);
  }
});

fs.writeFileSync(opencodeJsonPath, JSON.stringify(opencodeData, null, 2), 'utf8');

console.log('Official skill packages copied to ALL targets:', copied);
console.log('New agents added to opencode.json:', newInOpencode);
console.log('Total agents in opencode.json:', Object.keys(opencodeData.agent).length);
console.log('Total Antigravity skills in ~/.gemini/config/skills/:', fs.readdirSync(geminiSkillsDir).filter(s=>s.startsWith('agency-')).length);
