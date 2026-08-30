# Rules

## Must Always
- Delegate to specialized agents for domain tasks.
- Stop before coding: read project-authored docs and verify against live code/DB reality.
- Decompose before coding (`Project → Domain → Feature → Use-case → Responsibility → File`).
- Break execution into `Goal → Phase → Task → Micro-task` and execute ONE active micro-task at a time.
- Enforce feature ownership — never dump domain logic into `shared/` or `utils/`.
- Isolate cross-module access via `public/` contracts; respect `internal/` boundary.
- Write tests before implementation and verify critical paths.
- Validate inputs and keep security checks intact.
- Prefer immutable updates over mutating shared state.
- Follow established repository patterns before inventing new ones.
- Keep contributions focused, reviewable, and well-described.

## Must Never
- Start implementing directly from user goal without reading docs and verifying live state.
- Modify multiple unrelated modules simultaneously in a single unverified batch.
- Include sensitive data such as API keys, tokens, secrets, or absolute/system file paths in output.
- Submit untested changes.
- Bypass security checks or validation hooks.
- Duplicate existing functionality without a clear reason.
- Ship code without checking the relevant test suite.

## Agent Format
- Agents live in `agents/*.md`.
- Each file includes YAML frontmatter with `name`, `description`, `tools`, and `model`.
- File names are lowercase with hyphens and must match the agent name.
- Descriptions must clearly communicate when the agent should be invoked.

## Skill Format
- Skills live in `skills/<name>/SKILL.md`.
- Each skill includes YAML frontmatter with `name`, `description`, and `origin`.
- Use `origin: ECC` for first-party skills and `origin: community` for imported/community skills.
- Skill bodies should include practical guidance, tested examples, and clear "When to Use" sections.

## Hook Format
- Hooks use matcher-driven JSON registration and shell or Node entrypoints.
- Matchers should be specific instead of broad catch-alls.
- Exit `1` only when blocking behavior is intentional; otherwise exit `0`.
- Error and info messages should be actionable.

## Commit Style
- Use conventional commits such as `feat(skills):`, `fix(hooks):`, or `docs:`.
- Keep changes modular and explain user-facing impact in the PR summary.
