# Refactor plan

Status legend: [ ] todo, [~] in progress, [x] done

## Phase 0: Setup
- [x] Create branch `refactor`
- [x] CLAUDE.md + `refactor/` skeleton + shared `.claude/settings.json`

## Phase 1: Analysis
Static read only (grep/read, nothing executed). Items marked "(unverified)" in
`analysis/` still need a runtime or usage check.
- [x] Backend inventory (blueprints, models, API) -> `analysis/02-backend.md`
- [x] Frontend module inventory and dependency graph -> `analysis/03-frontend-structure.md`
- [x] Global state / coupling hot spots (OverlayControl, ZoomView, AnnotationIO, ChronoControl) -> `analysis/03`, `04`, `05`
- [x] Dead / legacy code candidates -> `analysis/06-smells-and-risks.md` (6.4; verify before deleting)
- [x] Architecture analysis -> `analysis/README.md` + `analysis/01-architecture.md`
- [ ] Maintainer review of `analysis/07-questions-and-proposals.md` (answers to Q2, Q4, Q5, Q8, Q11, Q12 needed to start Phase 2)

### Phase 1b: Analysis hardening (process fixes from the retrospective)
- [x] Add "Analysis rules" to `CLAUDE.md`
- [x] Give every finding in `analysis/06` a unique ID (Arch/Leg/Back/Doc added)
- [ ] Tag every finding with evidence `[read]` / `[ran]` / `[inferred]`
- [ ] Verify H items (S1-S4, C1) by running code; needs permission to run (Q11). Separate step.
- [ ] Move questions out of `analysis/07` to `refactor/QUESTIONS.md`; target architecture
      and step list to draft ADRs / Phase 3-4 (keep `analysis/` descriptive only)
- [ ] Split `analysis/` stage files over the 150-line budget (05 is 295)

## Phase 2: Safety net
- [ ] Backend pytest smoke tests (fix runner config)
- [ ] Sample fixture dataset (video + tracks/tags JSON)
- [ ] Characterization tests for pure JS logic (Node runner)
- [ ] Playwright end-to-end scenarios (optional)
- [ ] `tests/CHECKLIST.md` for manual checks

## Phase 3: Target design
- [ ] ADRs in `design/` (candidates: `analysis/07-questions-and-proposals.md`, section C)

## Phase 4: Incremental refactor
- [ ] TBD from design (draft step list: `analysis/07-questions-and-proposals.md`, section C)

## Decisions log
(link ADRs here)
