const fs = require('fs');
const path = require('path');
const agRoot = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency';

const eccSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/skills';
const geminiSkillsDir = 'C:/Users/victo/.gemini/config/skills';
const agentsSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.agents/skills';
const eccAgentsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/agents';
const eccPromptsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/prompts/agents';
const opencodeJsonPath = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/opencode.json';
const opencodeData = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));

// game-development engine subfolders
const gameEngines = ['blender','godot','roblox-studio','unity','unreal-engine'];
const gameRoot = path.join(agRoot, 'game-development');
let added = 0;

const processAgent = (slug, content, division) => {
  const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  let description = 'The Agency ' + division + ' specialist';
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const dm = fmMatch[1].match(/description:\s*(.+)/);
    if (dm) description = dm[1].trim().replace(/^['"]|['"]$/g, '');
  }

  const skillContent = '---\nname: ' + slug + '\ndescription: "' + description.replace(/"/g, '\\"') + '"\nmetadata:\n  origin: TheAgency\n  division: ' + division + '\n---\n\n' + bodyContent;

  [path.join(eccSkillsDir, slug), path.join(geminiSkillsDir, slug), path.join(agentsSkillsDir, slug)].forEach(t => {
    if (!fs.existsSync(t)) fs.mkdirSync(t, { recursive: true });
    fs.writeFileSync(path.join(t, 'SKILL.md'), skillContent);
  });
  fs.writeFileSync(path.join(eccAgentsDir, slug + '.md'), content);
  fs.writeFileSync(path.join(eccPromptsDir, slug + '.txt'), bodyContent);

  const isWrite = ['engineer','developer','builder','designer','scripter','creator','architect'].some(w => slug.includes(w));
  if (!opencodeData.agent[slug]) {
    opencodeData.agent[slug] = {
      description: description.slice(0,200),
      mode: 'subagent',
      prompt: '{file:prompts/agents/' + slug + '.txt}',
      tools: { read: true, write: isWrite, edit: isWrite, bash: true }
    };
    added++;
    console.log('  [NEW]', slug);
  }
};

// 1. Game engine-specific agents
gameEngines.forEach(engine => {
  const dir = path.join(gameRoot, engine);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  console.log('\ngame-development/' + engine + ':');
  files.forEach(f => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const slug = 'agency-' + f.replace('.md','');
    processAgent(slug, content, 'game-development/' + engine);
  });
});

// 2. Strategy runbooks & playbooks
const stratRoot = path.join(agRoot, 'strategy');
['coordination','playbooks','runbooks'].forEach(sub => {
  const dir = path.join(stratRoot, sub);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  console.log('\nstrategy/' + sub + ':');
  files.forEach(f => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const baseName = f.replace('.md','');
    const slug = 'agency-' + (sub === 'runbooks' ? 'runbook-' : sub === 'playbooks' ? '' : 'coord-') + baseName;
    processAgent(slug, content, 'strategy/' + sub);
  });
});

// 3. Examples as workflow skill templates
const examplesRoot = path.join(agRoot, 'examples');
const exFiles = fs.readdirSync(examplesRoot).filter(f => f.endsWith('.md') && f !== 'README.md');
console.log('\nexamples:');
exFiles.forEach(f => {
  const content = fs.readFileSync(path.join(examplesRoot, f), 'utf8');
  const slug = 'agency-example-' + f.replace('.md','');
  processAgent(slug, content, 'examples');
});

fs.writeFileSync(opencodeJsonPath, JSON.stringify(opencodeData, null, 2), 'utf8');
console.log('\nTotal NEW agents added from nested folders:', added);
console.log('Total agents in opencode.json now:', Object.keys(opencodeData.agent).length);
