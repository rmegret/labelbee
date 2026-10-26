# Refactor plan

Status legend: [ ] todo, [~] in progress, [x] done

## Phase 0: Setup
- [x] Create branch `refactor`
- [x] CLAUDE.md + `refactor/` skeleton + shared `.claude/settings.json`

## Phase 1: Analysis
- [ ] Backend inventory (blueprints, models, API)
- [ ] Frontend module inventory and dependency graph
- [ ] Global state / coupling hot spots (OverlayControl, ZoomView, AnnotationIO, ChronoControl)
- [ ] Dead / legacy code candidates
- [ ] Write `analysis/architecture.md`

## Phase 2: Safety net
- [ ] Backend pytest smoke tests (fix runner config)
- [ ] Sample fixture dataset (video + tracks/tags JSON)
- [ ] Characterization tests for pure JS logic (Node runner)
- [ ] Playwright end-to-end scenarios (optional)
- [ ] `tests/CHECKLIST.md` for manual checks

## Phase 3: Target design
- [ ] ADRs in `design/`

## Phase 4: Incremental refactor
- [ ] TBD from design

## Decisions log
(link ADRs here)
