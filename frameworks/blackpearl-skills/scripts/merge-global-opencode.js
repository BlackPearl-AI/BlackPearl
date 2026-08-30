const fs = require('fs');
const path = require('path');

// Read global opencode.jsonc (strip // line comments then parse)
const jsonPath = 'C:/Users/victo/.config/opencode/opencode.jsonc';
const raw = fs.readFileSync(jsonPath, 'utf8');
// Strip single-line comments (// ...) — careful not to strip URLs (://)
const stripped = raw.split('\n').map(line => {
  const idx = line.indexOf('//');
  if (idx === -1) return line;
  // Skip if it's inside a string (basic heuristic: odd number of quotes before //)
  const before = line.slice(0, idx);
  const quoteCount = (before.match(/"/g) || []).length;
  if (quoteCount % 2 === 1) return line; // inside a string
  return line.slice(0, idx);
}).join('\n');

const data = JSON.parse(stripped);

const srcDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency/integrations/opencode/agents';
const agentFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));

console.log('Current agents in opencode.jsonc:', Object.keys(data.agent || {}).length);
console.log('Agency agents to merge:', agentFiles.length);

if (!data.agent) data.agent = {};

let added = 0;
agentFiles.forEach(file => {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  
  // Parse frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return;
  
  const fm = fmMatch[1];
  const nameMatch = fm.match(/^name:\s*(.+)/m);
  const descMatch = fm.match(/^description:\s*(.+)/m);
  const modeMatch = fm.match(/^mode:\s*(.+)/m);
  const colorMatch = fm.match(/^color:\s*(.+)/m);
  
  const slug = 'agency-' + file.replace('.md', '');
  const humanName = nameMatch ? nameMatch[1].trim().replace(/^['"]|['"]$/g, '') : slug;
  const description = descMatch ? descMatch[1].trim().replace(/^['"]|['"]$/g, '') : 'The Agency specialist';
  const mode = modeMatch ? modeMatch[1].trim().replace(/^['"]|['"]$/g, '') : 'subagent';
  const color = colorMatch ? colorMatch[1].trim().replace(/^['"]|['"]$/g, '') : '#00ADEF';
  
  // Body is the system prompt
  const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();
  
  const isWrite = ['engineer','developer','builder','designer','scripter','creator'].some(w => slug.includes(w));
  
  if (!data.agent[slug]) {
    data.agent[slug] = {
      description: description.slice(0, 200),
      mode: mode,
      prompt: body.slice(0, 4000),
      tools: {
        read: true,
        write: isWrite,
        edit: isWrite,
        bash: true
      }
    };
    added++;
  }
});

// Write back preserving the file
const output = JSON.stringify(data, null, 2);
fs.copyFileSync(jsonPath, jsonPath + '.backup-agency');
fs.writeFileSync(jsonPath, output, 'utf8');

console.log('New agents added to global opencode.jsonc:', added);
console.log('Total agents in global opencode.jsonc:', Object.keys(data.agent).length);
console.log('Backup saved to:', jsonPath + '.backup-agency');
