const fs = require('fs');
const path = require('path');

const opencodeJsonPath = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/opencode.json';
const opencodeData = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf8'));

const promptsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/prompts/agents';
const promptFiles = fs.readdirSync(promptsDir).filter(f => f.startsWith('agency-') && f.endsWith('.txt'));

console.log('Found', promptFiles.length, 'agency prompt files in .opencode/prompts/agents/');

let addedCount = 0;
promptFiles.forEach(pf => {
  const slug = pf.replace('.txt', '');
  if (!opencodeData.agent[slug]) {
    const content = fs.readFileSync(path.join(promptsDir, pf), 'utf8');
    let desc = 'The Agency specialist agent';
    const lines = content.split('\n');
    for (let line of lines) {
      if (line.toLowerCase().includes('specializ') || line.toLowerCase().includes('expert') || line.toLowerCase().includes('you are')) {
        desc = line.replace(/^[#\s*\->:]+/, '').trim();
        if (desc.length > 150) desc = desc.slice(0, 147) + '...';
        break;
      }
    }
    
    // Determine write vs read tools
    const isWrite = slug.includes('dev') || slug.includes('engineer') || slug.includes('builder') || slug.includes('coder') || slug.includes('scripter') || slug.includes('fixer') || slug.includes('creator') || slug.includes('designer');

    opencodeData.agent[slug] = {
      description: desc,
      mode: 'subagent',
      prompt: '{file:prompts/agents/' + pf + '}',
      tools: {
        read: true,
        write: isWrite,
        edit: isWrite,
        bash: true
      }
    };
    addedCount++;
  }
});

fs.writeFileSync(opencodeJsonPath, JSON.stringify(opencodeData, null, 2), 'utf8');
console.log(`Successfully registered ${addedCount} new Agency agents into opencode.json! Total agents now in opencode.json:`, Object.keys(opencodeData.agent).length);
