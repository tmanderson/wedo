# AGENTS.md

Purpose
- Guide for automated agents (Codex, Claude Code, CI bots) to interact with this repository.
- Explains key repo documents and what lives in /designs/, plus agent responsibilities and guardrails.

Repository files (short descriptions)
- prompt_plan.md — The agent‑driven plan; step‑by‑step prompts, expected artifacts, tests, rollback/idempotency notes, and a TODO checklist. This is the canonical workflow driver for agents.
- spec.md — The concise developer/technical specification (Definition of Done, API surfaces, constraints, and acceptance criteria).
- idea.md — Raw brainstorming, notes, and feature/backlog ideas. Use for context; not authoritative.
- idea_one_pager.md — A short one‑page summary of the main idea, audience, value prop, and high‑level flow.
- /designs/ — UI mockups, Figma exports (PDF/SVG/PNG), annotated screenshots, and design tokens. Large source files (e.g., .fig) may be referenced by link; exports and accessible assets live here. Use clear filenames and include a README in /designs/ if multiple versions exist.

Include the following section verbatim:

## Repository docs
- 'ONE_PAGER.md' — Captures Problem, Audience, Platform, Core Flow, MVP Features; Non‑Goals optional. 
- 'DEV_SPEC.md' — Minimal functional and technical specification consistent with prior docs, including a concise **Definition of Done**. 
- 'PROMPT_PLAN.md' — Agent‑Ready Planner with per‑step prompts, expected artifacts, tests, rollback notes, idempotency notes, and a TODO checklist using Markdown checkboxes. This file drives the agent workflow.  
- 'AGENTS.md' — This file. 

### Agent responsibility
- After completing any coding, refactor, or test step, **immediately update the corresponding TODO checklist item in 'prompt_plan.md'**.  
- Use the same Markdown checkbox format ('- [x]') to mark completion.  
- When creating new tasks or subtasks, add them directly under the appropriate section anchor in 'prompt_plan.md'.  
- Always commit changes to 'prompt_plan.md' alongside the code and tests that fulfill them.  
- Do not consider work “done” until the matching checklist item is checked and all related tests are green.
- When a stage (plan step) is complete with green tests, update the README “Release notes” section with any user-facing impact (or explicitly state “No user-facing changes” if applicable).
- Even when automated coverage exists, always suggest a feasible manual test path so the human can exercise the feature end-to-end.
- After a plan step is finished, document its completion state with a short checklist. Include: step name & number, test results, 'prompt_plan.md' status, manual checks performed (mark as complete only after the human confirms they ran to their satisfaction), release notes status, and an inline commit summary string the human can copy & paste.

#### Guardrails for agents
- Make the smallest change that passes tests and improves the code.
- Do not introduce new public APIs without updating 'spec.md' and relevant tests.
- Do not duplicate templates or files to work around issues. Fix the original.
- If a file cannot be opened or content is missing, say so explicitly and stop. Do not guess.
- Respect privacy and logging policy: do not log secrets, prompts, completions, or PII.

#### Deferred-work notation
- When a task is intentionally paused, keep its checkbox unchecked and prepend '(Deferred)' to the TODO label in 'prompt_plan.md', followed by a short reason.  
- Apply the same '(Deferred)' tag to every downstream checklist item that depends on the paused work.
- Remove the tag only after the work resumes; this keeps the outstanding scope visible without implying completion.




#### When the prompt plan is fully satisfied
- Once every Definition of Done task in 'prompt_plan.md' is either checked off or explicitly marked '(Deferred)', the plan is considered **complete**.  
- After that point, you no longer need to update prompt-plan TODOs or reference 'prompt_plan.md', 'spec.md', 'idea_one_pager.md', or other upstream docs to justify changes.  
- All other guardrails, testing requirements, and agent responsibilities in this file continue to apply unchanged.


---

## Testing policy (non‑negotiable)
- Tests **MUST** cover the functionality being implemented.
- **NEVER** ignore the output of the system or the tests — logs and messages often contain **CRITICAL** information.
- **TEST OUTPUT MUST BE PRISTINE TO PASS.**
- If logs are **supposed** to contain errors, capture and test it.
- **NO EXCEPTIONS POLICY:** Under no circumstances should you mark any test type as "not applicable". Every project, regardless of size or complexity, **MUST** have unit tests, integration tests, **AND** end‑to‑end tests. If you believe a test type doesn't apply, you need the human to say exactly **"I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME"**.

### TDD (how we work)
- Write tests **before** implementation.
- Only write enough code to make the failing test pass.
- Refactor continuously while keeping tests green.

**TDD cycle**
1. Write a failing test that defines a desired function or improvement.  
2. Run the test to confirm it fails as expected.  
3. Write minimal code to make the test pass.  
4. Run the test to confirm success.  
5. Refactor while keeping tests green.  
6. Repeat for each new feature or bugfix.

---

## Important checks
- **NEVER** disable functionality to hide a failure. Fix root cause.  
- **NEVER** create duplicate templates or files. Fix the original.  
- **NEVER** claim something is “working” when any functionality is disabled or broken.  
- If you can’t open a file or access something requested, say so. Do not assume contents.  
- **ALWAYS** identify and fix the root cause of template or compilation errors.  
- If git is initialized, ensure a '.gitignore' exists and contains at least:
  
  .env
  .env.local
  .env.*
  
  Ask the human whether additional patterns should be added, and suggest any that you think are important given the project. 

## When to ask for human input
Ask the human if any of the following is true:
- A test type appears “not applicable”. Use the exact phrase request: **"I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME"**.  
- Required anchors conflict or are missing from upstream docs.  
- You need new environment variables or secrets.  
- An external dependency or major architectural change is required.
- Design files are missing, unsupported or oversized


Closing notes for agents
- Always prefer editing the canonical files listed above (prompt_plan.md, spec.md, DEV_SPEC.md / dev spec, idea_one_pager.md, /designs/ contents) rather than creating duplicates.
- Keep commits small, atomic, and include a one-line summary that can be copied into the prompt_plan.md completion checklist.
- If anything expected is missing (file, anchor, or artifact), stop and request the human to provide it — do not proceed by guessing.

If you want me to expand this into stricter templates, a CI checklist, or pre-commit hooks for enforcing prompt_plan updates, say which you'd prefer and I will generate them.