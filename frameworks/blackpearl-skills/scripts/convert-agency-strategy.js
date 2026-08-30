const fs = require('fs');
const path = require('path');

const eccSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/skills';
const geminiSkillsDir = 'C:/Users/victo/.gemini/config/skills';
const agentsSkillsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.agents/skills';
const opencodePromptsDir = 'G:/0000 PY PROGRAM/_AI_TOOLS/ECC/.opencode/prompts/agents';

const strategyRoot = 'G:/0000 PY PROGRAM/_AI_TOOLS/The Agency/strategy';

const strategySkills = [
  {
    slug: 'agency-runbook-startup-mvp',
    file: path.join(strategyRoot, 'runbooks', 'scenario-startup-mvp.md'),
    desc: 'The Agency Startup MVP Runbook: Compressed 4-6 week multi-agent delivery lifecycle from idea to verified live product.',
  },
  {
    slug: 'agency-runbook-enterprise-feature',
    file: path.join(strategyRoot, 'runbooks', 'scenario-enterprise-feature.md'),
    desc: 'The Agency Enterprise Feature Runbook: Rigorous multi-agent development with compliance, security gates, and architecture alignment.',
  },
  {
    slug: 'agency-runbook-incident-response',
    file: path.join(strategyRoot, 'runbooks', 'scenario-incident-response.md'),
    desc: 'The Agency Incident Response Runbook: SRE, DevOps, security, and root cause recovery orchestration.',
  },
  {
    slug: 'agency-runbook-marketing-campaign',
    file: path.join(strategyRoot, 'runbooks', 'scenario-marketing-campaign.md'),
    desc: 'The Agency Marketing Campaign Runbook: Multi-channel growth, copy, paid media, and product launch coordination.',
  },
  {
    slug: 'agency-coordination-handoffs',
    file: path.join(strategyRoot, 'coordination', 'handoff-templates.md'),
    desc: 'The Agency Multi-Agent Handoff & QA Verdict Templates: Standardized agent-to-agent work transfers and quality gate checklists.',
  },
  {
    slug: 'agency-nexus-playbook',
    file: path.join(strategyRoot, 'nexus-strategy.md'),
    desc: 'The Agency NEXUS Strategic Playbook: Comprehensive 7-phase operating model for multi-agent autonomous engineering.',
  }
];

strategySkills.forEach(item => {
  if (fs.existsSync(item.file)) {
    const rawContent = fs.readFileSync(item.file, 'utf8');
    const skillMarkdown = `---
name: ${item.slug}
description: "${item.desc}"
metadata:
  origin: TheAgency
  division: strategy
---

# Strategy & Runbook Note
> **Harmonized with ECC Rules**: All implementations triggered by this runbook MUST strictly obey the Modular Architecture Hard Rule (5-level decomposition) and Documentation-First Sequential Execution (one micro-task at a time).

---

${rawContent}
`;

    // 1. ECC Skills
    const eccTarget = path.join(eccSkillsDir, item.slug);
    if (!fs.existsSync(eccTarget)) fs.mkdirSync(eccTarget, { recursive: true });
    fs.writeFileSync(path.join(eccTarget, 'SKILL.md'), skillMarkdown, 'utf8');

    // 2. Gemini Global Skills
    const geminiTarget = path.join(geminiSkillsDir, item.slug);
    if (!fs.existsSync(geminiTarget)) fs.mkdirSync(geminiTarget, { recursive: true });
    fs.writeFileSync(path.join(geminiTarget, 'SKILL.md'), skillMarkdown, 'utf8');

    // 3. .agents/skills
    const agentsTarget = path.join(agentsSkillsDir, item.slug);
    if (!fs.existsSync(agentsTarget)) fs.mkdirSync(agentsTarget, { recursive: true });
    fs.writeFileSync(path.join(agentsTarget, 'SKILL.md'), skillMarkdown, 'utf8');

    // 4. OpenCode prompt
    if (!fs.existsSync(opencodePromptsDir)) fs.mkdirSync(opencodePromptsDir, { recursive: true });
    fs.writeFileSync(path.join(opencodePromptsDir, `${item.slug}.txt`), rawContent, 'utf8');

    console.log('Processed strategy skill:', item.slug);
  }
});
console.log('All strategy skills generated and synced!');
