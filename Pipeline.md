# Multi-Agent Development Pipeline
## Designed by Rajeev Agrawal

*Created: 2026-03-26*

This document defines a reusable multi-agent pipeline for building software through structured debate, automated testing, and review gates. It is project-agnostic — each project provides its own requirements, design constraints, and testing infrastructure. The project's handoff document maps generic roles described here to project-specific files and configuration.

---

## 1. Pipeline Overview

Five phases. Phases 1–4 run for initial development. Phase 5 runs for post-approval enhancements and bug fixes.

```
Phase 1: Planning (3 iterations of debate + convergence)
Phase 2: Initial Coding (Coder A + Coder B + Coder C debate)
Phase 3: Testing Loop (max 3 iterations)
Phase 4: Review Loop (Senior Engineer → Test Reviewer, max 3 iterations)
Phase 5: Enhancements (owner-driven, strict regression)
```

---

## 2. Required Project Inputs

Before the pipeline can run, the project must provide:

| Input | Description |
|-------|-------------|
| **Requirements document** | Full product requirements specification |
| **Design constraints document** | Binding architectural constraints that no agent may violate |
| **Code standards document** | Coding standards, naming conventions, testing rules |
| **Senior reviewer persona** | Methodology file defining the senior engineer reviewer's approach, what to hunt for, verdict scale, output format |
| **Test reviewer persona** | Methodology file defining the test reviewer's approach, what to hunt for, verdict scale, output format |
| **Testing infrastructure** | How to deploy code, run tests, and collect results (project-specific) |

---

## 3. Agent Roles

### Planning Agents (Phase 1)

| Agent | Responsibility |
|-------|---------------|
| **Functionality Agent** | Decomposes requirements into implementation tasks |
| **Performance Agent** | Defines performance budgets and optimization strategies |
| **Test Planning Agent** | Specifies test cases and coverage requirements |
| **Integration Coordinator** | Identifies conflicts between agents, facilitates resolution, verifies convergence |

### Coding Agents (Phases 2–5)

| Agent | Responsibility |
|-------|---------------|
| **Coder A** | Writes and fixes production code |
| **Coder B** | Reviews Coder A code and rewrites sections|
| **Coder C** | Writes and fixes test code |

Coders communicate exclusively through a shared `DEBATE.md` file — no direct interaction. They take turns writing positions, challenges, and resolutions. When both agree, one writes the final code.

### Testing Phase (Phases 3–5)

In this phase a script is used to run the test cases defined in tests.md and create test_results.md_

The testing uses project-specific deployment and test execution infrastructure (defined in the project handoff document).

### Review Agents (Phases 4–5)

| Agent | Responsibility |
|-------|---------------|
| **Senior Engineer Reviewer** | Reviews code quality, architecture, error handling, performance |
| **Test Reviewer** | Reviews test quality, coverage, assertions, isolation. **FINAL AUTHORITY** on pipeline progression. |

Review flow is **sequential**: Senior Engineer reviews first, then Test Reviewer receives the senior's output and makes the final call.

---

## 4. Phase 1: Planning

Three iterations of structured debate to produce implementation-ready specifications.

```
Iteration 1:
  3 Planning Agents (parallel):
    - Functionality Agent → TASKS_FUNCTIONALITY.md
    - Performance Agent  → TASKS_PERFORMANCE.md
    - Test Planning Agent         → TESTS.md
        ↓
  Integration Coordinator → CONFLICTS.md

Iteration 2:
  3 Agents respond to conflicts:
    - FUNCTIONALITY_RESPONSE.md
    - PERFORMANCE_RESPONSE.md
    - TEST_RESPONSE.md
        ↓
  Integration Coordinator → SYNTHESIS.md
  (+ project owner input if any conflict requires a product decision)

Iteration 3:
  3 Agents refine:
    - TASKS_FUNCTIONALITY_v2.md
    - TASKS_PERFORMANCE_v2.md
    - TESTS_v2.md
        ↓
  Integration Coordinator → CONVERGENCE_STATUS.md

Final merge:
  → TASKS.md (merged implementation specification)
  → TESTS.md (merged test specification)
  → CONSENSUS_REPORT.md
  → FUNCTIONALITY_SIGNOFF.md, PERFORMANCE_SIGNOFF.md, TEST_SIGNOFF.md
```

### Planning Agent File Requirements

| Agent | Must Read (constraints) | Must Read (input) | Writes |
|-------|------------------------|-------------------|--------|
| Functionality Agent | Design constraints doc, code standards doc | Requirements doc | `TASKS_FUNCTIONALITY.md` |
| Performance Agent | Design constraints doc, code standards doc | Requirements doc | `TASKS_PERFORMANCE.md` |
| Test Planning Agent | Design constraints doc, code standards doc | Requirements doc | `TESTS.md` |
| Integration Coordinator | Design constraints doc, code standards doc | All three agent outputs | `CONFLICTS.md` (iter 1), `SYNTHESIS.md` (iter 2), `CONVERGENCE_STATUS.md` (iter 3) |

In iterations 2–3, each planning agent also reads the Integration Coordinator's output and other agents' documents from the previous iteration.

---

## 5. Phase 2: Initial Coding

```
Coder A + Coder B + Coder C → Debate in shared DEBATE.md
        ↓
When agreed → one writes production code, one reviews code written by first, one writes test code
```

### Coding Agent File Requirements

| Agent | Must Read (constraints) | Must Read (input) | Writes |
|-------|------------------------|-------------------|--------|
| Coder A | Design constraints doc, code standards doc, requirements doc | Final `TASKS.md`, `TESTS.md`, `CONSENSUS_REPORT.md` | `DEBATE.md` (shared), production code, `coder_a_changes.md` |
| Coder B | Design constraints doc, code standards doc, requirements doc | Final `TASKS.md`, `TESTS.md`, `CONSENSUS_REPORT.md`, Coder A's output | `DEBATE.md` (shared), production code changes, `coder_b_changes.md` |
| Coder C | Design constraints doc, code standards doc, requirements doc | Final `TASKS.md`, `TESTS.md`, `CONSENSUS_REPORT.md`, Coder A's output, Coder B's output | `DEBATE.md` (shared), test code, `coder_c_changes.md` |

---

## 6. Phase 3: Testing Loop

Max 3 iterations. Tests must all pass before proceeding to Phase 4.

```
┌──────────────────────────────────────────┐
│                                          │
│  Testing Script                           │
│  (deploy, run tests, output:             │
│   test_results.md)                       │
│      ↓                                   │
│  ALL TESTS PASS? ──yes──→ Phase 4        │
│      │                                   │
│      no                                  │
│      ↓                                   │
│  Coder A + Coder B + Coder C debate fixes          │
│  (scoped to failing tests only)          │
│      ↓                                   │
│  (loop back to Testing Agent)            │
│                                          │
└──────────────────────────────────────────┘
```

### Testing Script Requirements

Should read tests.md, design constraints doc, deploy the code and then run the tests from tests.md to create test_results.md

### Coder Constraint in This Phase

Only fix code that causes failing tests. No other changes.

---

## 7. Phase 4: Review Loop

Max 3 iterations. Both reviewers must approve before proceeding to Phase 5.

```
┌──────────────────────────────────────────────┐
│                                              │
│  Senior Engineer Reviewer                    │
│  (reads: reviewer persona file,              │
│   test_results.md, production + test code)   │
│  output: senior_review.md                    │
│      ↓                                       │
│  Test Reviewer (FINAL AUTHORITY)             │
│  (reads: reviewer persona file,              │
│   senior_review.md, test_results.md,         │
│   production + test code)                    │
│  output: test_review.md                      │
│      ↓                                       │
│  APPROVED? ──yes──→ Phase 5                  │
│      │                                       │
│      no (specific findings only)             │
│      ↓                                       │
│  Coder A + Coder B + Coder C debate fixes              │
│  (scoped to reviewer findings only)          │
│      ↓                                       │
│  Testing Agent (must pass again)             │
│      ↓                                       │
│  (loop back to Senior Engineer Reviewer)     │
│                                              │
└──────────────────────────────────────────────┘
```

### Review Agent File Requirements

| Agent | Must Read (constraints) | Must Read (methodology) | Must Read (input) | Writes |
|-------|------------------------|------------------------|-------------------|--------|
| Senior Engineer Reviewer | Design constraints doc, code standards doc, requirements doc | Senior reviewer persona file | Production code, test code, `test_results.md` | `senior_review.md` |
| Test Reviewer | Design constraints doc, code standards doc | Test reviewer persona file | Production code, test code, `test_results.md`, `senior_review.md`, `TESTS.md` | `test_review.md` |

### Constraint Enforcement by Reviewers

- Any finding that contradicts the design constraints document is a **critical** issue.
- Any recommendation that would violate design constraints must be flagged as **NOT IMPLEMENTABLE**.

### Coder Constraint in Rejection Loop

| Agent | Must Read (input) | Writes | Scope Constraint |
|-------|-------------------|--------|-----------------|
| Coder A | `senior_review.md`, `test_review.md`, `test_results.md` | Updated production code, `coder_a_changes.md` | **Only touch code flagged by reviewers** |
| Coder B | `senior_review.md`, `test_review.md`, `test_results.md`,  `coder_a_changes.md`, Updated production code| Coder B updated production code, `coder_a_changes.md` | **Review Coder A touched code, only touch code flagged by reviewers** |
| Coder c | `senior_review.md`, `test_review.md`, `test_results.md`, Coder A's changes, Coder B's changes | Updated test code, `coder_b_changes.md` | **Only touch code flagged by reviewers** |

After fixing, code goes through Testing Script (must pass) before returning to reviewers.

---

## 8. Phase 5: Enhancements

Post-approval phase for owner-driven enhancements and bug fixes. This is a **strict regression cycle** — no code should be touched other than what is specifically requested.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  Owner provides enhancement or bug report                      │
│      ↓                                                         │
│  BRANCHING DECISION                                            │
│  Ask owner: continue in current branch or create new?          │
│      ↓                                                         │
│  If new branch: create branch (increment patch version)        │
│  If same branch: continue on current branch                    │
│      ↓                                                         │
│  UPDATE REQUIREMENTS                                           │
│  Add change request to requirements doc                        │
│  under new section: "## <version> Changes"                     │
│  (or append to existing section if same branch)                │
│      ↓                                                         │
│  SCOPED PLANNING                                               │
│  Functionality Agent → new section in TASKS.md                 │
│  Performance Agent  → new section in TASKS.md (if applicable)  │
│  Test Planning Agent         → new section in TESTS.md                  │
│  (append only — do NOT modify existing sections)               │
│      ↓                                                         │
│  Coder A + Coder B debate fixes                                │
│  STRICT REGRESSION CONSTRAINT:                                 │
│  Only touch code directly related to the                       │
│  specific enhancement or bug. Nothing else.                    │
│      ↓                                                         │
│  Testing Script (all tests must pass)                           │
│      ↓                                                         │
│  Senior Engineer Reviewer → Test Reviewer                      │
│      ↓                                                         │
│  APPROVED? ──yes──→ DONE (or next enhancement)                 │
│      │                                                         │
│      no → Coders fix (scoped) → Test → Review                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Phase 5 Sub-Steps

**Step 1: Branching**
- Always ask the project owner: "Should this be a new branch or continue on the current branch?"
- If new branch: create from the current stable point, increment patch version
- If same branch: continue on the existing branch
- No branch is created without owner confirmation

**Step 2: Requirements Update**
- Add the change request to the requirements document under a new version-specific section
- If the branch already has a section (multiple enhancements on the same branch), append to it
- Never modify existing requirement sections — only add new sections

**Step 3: Scoped Planning**

| Agent | Must Read (input) | Writes | Rule |
|-------|-------------------|--------|------|
| Functionality Agent | Requirements doc (new version section), existing `TASKS.md` | New section in `TASKS.md` | **Append only — do NOT modify existing sections** |
| Performance Agent | Requirements doc (new version section), existing `TASKS.md` | New section in `TASKS.md` (if performance-relevant) | **Append only — do NOT modify existing sections** |
| Test Planning Agent | Requirements doc (new version section), existing `TESTS.md` | New section in `TESTS.md` | **Append only — do NOT modify existing sections** |
| Integration Coordinator | All three agent outputs, existing `TASKS.md` and `TESTS.md` | Conflict check (no separate file unless conflicts found) | Verify no conflicts with existing tasks/tests |

All planning agents also read the design constraints doc and code standards doc as in Phase 1.

**Step 4: Coding → Testing → Review**
- Same flow as Phases 3–4 but under strict regression constraint
- Coders only touch code related to the tasks from the new section
- All existing tests must continue to pass (regression)


---

## 9. Agent Communication Protocol

All agents communicate through files on disk. No direct interaction between agents.

### File Flow Summary

| Producer | Output File | Consumer |
|----------|------------|----------|
| Functionality Agent | `TASKS_FUNCTIONALITY.md` | Integration Coordinator, other planning agents |
| Performance Agent | `TASKS_PERFORMANCE.md` | Integration Coordinator, other planning agents |
| Test Planning Agent | `TESTS.md` | Integration Coordinator, other planning agents |
| Integration Coordinator | `CONFLICTS.md`, `SYNTHESIS.md`, `CONVERGENCE_STATUS.md` | All planning agents |
| Coder A + Coder B + Coder C | `DEBATE.md`, production code, test code, `coder_a_changes.md`, `coder_b_changes.md`, `coder_c_changes.md`| Testing Agent, Reviewers |
| Testing Script | `test_results.md` | Coders (if failures), Senior Engineer Reviewer |
| Senior Engineer Reviewer | `senior_review.md` | Test Reviewer, Coders (if rejected) |
| Test Reviewer | `test_review.md` | Coders (if rejected), Pipeline (gate) |

### Rules

- All communication is through files — agents never interact directly
- Each agent reads specific input files and writes specific output files
- Constraint files (design constraints, code standards, requirements) are read-only for all agents
- Persona/methodology files are read-only — they define how review agents behave

---

## 10. Reviewer Personas

The pipeline requires two reviewer persona files that define each reviewer's methodology.

### Senior Engineer Reviewer

Defines what the reviewer hunts for:
- Architectural sins, abstraction crimes, code rot
- Error handling disasters, naming atrocities
- Performance bombs, clever code
- Whether the approach is fundamentally sound
- Whether someone can understand the code in 6 months

Verdict scale: REJECT → NEEDS MAJOR WORK → NEEDS MINOR FIXES → APPROVED WITH RESERVATIONS → SHIP IT

Output format: each issue includes category, file:line, problem description, and suggested fix.

### Test Reviewer

Defines what the reviewer hunts for:
- Useless tests (assertions that pass regardless of implementation)
- Flake bombs (race conditions, timing dependencies, shared state)
- Missing assertions (error tests with no error assertions)
- Isolation failures (shared mutable state, global pollution)
- Complexity crimes (100-line setup for 3-line assertion)

Verdict scale: GARBAGE → NEEDS WORK → ACCEPTABLE → ACTUALLY GOOD

Output format: each issue includes category, file:line, test name, problem description, and suggested fix.

---

## 11. Execution Environment

### Agent Invocation Pattern

```bash
CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 cat "$PROMPT_FILE" | claude \
    --print \
    --dangerously-skip-permissions \
    --model claude-opus-4-6 \
    --allowedTools 'Read,Write,Glob,Grep,Bash,Edit'
```

### Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `unset CLAUDECODE` | Required to allow nested claude invocations when run from within a Claude Code session |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000` | Ensures large files (especially test files) can be fully written |

### Parallelization Rules

| Step | Parallelizable? |
|------|----------------|
| Phase 1: Planning agents (same iteration) | Yes — all 3 run in parallel |
| Phase 1: Integration Coordinator | No — waits for all 3 agents |
| Phase 2: Coder A and Coder B and Coder C| No — B depends on A's output, C depends on B's output |
| Phase 3: Testing Script | No — sequential |
| Phase 4: Senior + Test Reviewer | No — sequential (Test Reviewer reads Senior's output) |
| Phase 4: Re-review Senior + Test | No — sequential |

### Iteration Limits

| Phase | Max Iterations | On Exhaustion |
|-------|---------------|---------------|
| Phase 1: Planning | 3 (built into the design) | Must converge or escalate to owner |
| Phase 3: Testing | 3 | Pipeline stops, owner decides next steps |
| Phase 4: Review | 3 | Pipeline stops, owner decides next steps |
| Phase 5: Enhancement review | 3 per enhancement | Pipeline stops, owner decides next steps |
