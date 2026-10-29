# Intent of LabelBee

Scope: the *why* (who annotates what, for what purpose). The *what exactly* is for
the per-feature specs (PLAN Phase 1c, not started); the *how it is built* is in
[../analysis/](../analysis/README.md).

Files associated to this task, in the intent/ folder:
```
  capabilities.md        # CAP
  behaviors/             # BEH, grouped by capability file
  entities.md            # ENT
  invariants.md          # INV
  decisions.md           # DEC
  debt.md                # DEBT
  questions.md           # OQ
  seams.md               # SEAM
  README.md              # this conventions doc
  docs/view_*.md         # generated views with working links (committed, do not edit)
  tools/spec_view.py     # generator and checker (stdlib only)
```


## 1. Purpose

The refactor is not only "make the code cleaner". We are writing down **the intent of the app itself**, recovered from the current implementation, as if we were reimplementing Labelbee from scratch with the knowledge the code contains. The refactor then proceeds bit by bit against that spec.

Two goals follow:

- Record **what the app does and why**, separating deliberate design from accidents and technical debt.
- Keep every refactor step **traceable** to the spec items it touches, so that nothing is silently lost or changed.

Regression tests alone were rejected as the starting point: they lock in current behavior, including accidents, and say nothing about the bigger picture.

## 2. Two sides: spec and work

| Side | What it holds | Lifetime | Where it lives |
|---|---|---|---|
| **Spec** | Capabilities, behaviors, entities, invariants, decisions, debt, open questions, seams | Durable. Describes the product and architecture. | Markdown files in the repo (`docs/spec/`) |
| **Work** | Epics, steps, spikes | Ephemeral. Describes changes in flight. | GitHub issues (plus PRs) |

Rule of thumb: if it would still be true after the refactor finishes, it is spec. If it is a unit of effort that closes, it is work.

## 3. Item types

### 3.1 Spec items

| Prefix | Name | Meaning |
|---|---|---|
| `CAP` | Capability | A user-visible thing the app does (for example "annotate bee tracks on video"). Groups behaviors. |
| `BEH` | Behavior | A concrete, testable thing the app does. The unit most tests attach to. |
| `ENT` | Entity | A data concept (Frame, Track, Annotation, Tag, Video, Event) with its fields and meaning. |
| `INV` | Invariant | A property that must always hold (for example frame identity across views). |
| `DEC` | Decision | A design decision with rationale and alternatives considered. |
| `DEBT` | Debt | Known hack or accident in the current code, with the intended replacement. |
| `OQ` | Open question | Something we do not yet know. Must be resolved into a BEH, INV, DEC or DEBT, or dropped. |
| `SEAM` | Seam | A module boundary or interface contract (for example `FrameBackend`). |

Links to files:

| Prefix | File |
|---|---|
| `CAP` | [capabilities.md](capabilities.md) |
| `BEH` | not created yet |
| `ENT` | [entities.md](entities.md) |
| `INV` | [invariants.md](invariants.md) |
| `DEC` | [decisions.md](decisions.md) |
| `DEBT` | not created yet |
| `OQ` | [../QUESTIONS.md](../QUESTIONS.md) (kept at `refactor/` level per `CLAUDE.md`) |
| `SEAM` | not created yet |

### 3.2 Work items

| Prefix | Name | Meaning |
|---|---|---|
| `EPIC` | Epic | A large goal spanning several steps (for example "decouple frame sync"). |
| `STEP` | Step | One reviewable, mergeable refactor increment. Replaces the earlier word "slice". |
| `SPIKE` | Spike | Time-boxed investigation that ends in a decision or a spec update, not in shipped code. |

Naming notes from the discussion:

- Agile terms (epic, spike) were adopted deliberately; they are familiar and map directly onto GitHub issue labels.
- The prefixes are conventional rather than a formal standard. They resemble common requirements-engineering and ADR practice (REQ, ADR, and so on) without being tied to any one tool.

## 4. ID rules

- Format: `PREFIX-NNN`, zero-padded to three digits (`BEH-014`). Four digits only if a prefix exceeds 999.
- **Flat, except capabilities**: IDs do not encode hierarchy. Membership in a capability is the `capability` attribute, not part of the ID. This keeps IDs stable when items move between groups.
  - Exception, `CAP` only (like a library classification): the 8 capability groups are `CAP-100`, `CAP-200`, … `CAP-800`; their leaves are `CAP-Gnn`, where `G` is the group number at creation (`CAP-101` is the first leaf of group 1, `CAP-215` the 15th of group 2), up to 99 leaves per group.
  - The `capability` attribute stays the source of truth. A leaf moved to another group keeps its ID, so the first digit only says where it was created.
- **Never reused, never renumbered.** A retired item keeps its ID with `status: superseded` or `dropped`, and `superseded_by` points to the replacement.
- IDs are assigned in sequence per prefix. Collisions are caught by the checker.
- Every item has a short **title**; the ID is the handle, the title is for humans.
- Reference items in prose, issues, PR descriptions, commit messages, and test names by ID (`BEH-014`).
- Groups are referenced by capability ID (`CAP-300`), or by saying "all items with `capability: CAP-300`".

## 5. Attributes

Core attributes on spec items:

| Attribute | Values | Meaning |
|---|---|---|
| `id` | `BEH-014` | Stable identifier |
| `title` | free text | Short human label |
| `capability` | `CAP-nnn` | Owning capability (BEH, ENT, INV mostly) |
| `origin` | `essential`, `intentional`, `accident`, `debt` | Why it exists in the current app (see below) |
| `confidence` | `verified`, `inferred` | Whether we confirmed it by running or testing, or inferred it from reading code |
| `status` | `draft`, `active`, `superseded`, `dropped` **(proposed)** | Lifecycle of the spec item |
| `refs` | list of code paths or symbols | Where it lives in the current code |
| `links` | list of IDs | Related spec items |
| `tests` | list of test ids or paths | Tests covering it |
| `discovered_in` | `STEP-nnn` / `SPIKE-nnn` | Work item during which this item was found |
| `affected_by` | list of `STEP-nnn` | Steps that touched it |

How attributes are written in the files (section 6): `id` and `title` are the heading,
`capability` is `- **Group:**`, `refs` is `- **Code:**`, `links` is `- **Links:**`, `tests` is
`- **Tests:**`; the others use `- **Origin:**`, `- **Confidence:**`, `- **Status:**` only when
they differ from the file-level defaults stated at the top of the file.

Meaning of `origin`:

- **essential**: the app is not Labelbee without it.
- **intentional**: a deliberate design choice that could reasonably have gone another way.
- **accident**: behavior that emerged from implementation, not chosen. Candidate for change, but check users first.
- **debt**: a known hack or workaround. Pair with a `DEBT-nnn` item stating the intended fix.

Additional attributes:

- `decided_by` / `alternatives` on `DEC`.
- `replacement` on `DEBT`.

## 6. File layout and format

Markdown files, one file per type or per capability, listed at the top of this README.

Format: plain Markdown, no YAML. One heading per item, **description first**, then a short bullet list of attributes (`Group`, `Code`, `Links`, ...). IDs are written as plain IDs and code as file and symbol names, never as links or line numbers, so the source stays easy to edit (by people and by Claude) and does not go stale when code moves.

Two files per spec file: `capabilities.md` is the source, `docs/view_capabilities.md` is the view for reading. The view is generated by `python3 -I tools/spec_view.py --all` (committed; `--check` fails when it is out of date or a symbol is not found in the code). The generator:

- turns every ID into a link (with the item title as hover text);
- shows each code file with its path from the project root, linked by a path relative to the view;
- keeps symbol names as plain names and warns when one is not found in its file (prefix a name with `~` for a general name of a block, such as `~Parts labeling panel`, which is not looked up);
- replaces `<!-- toc -->` with a table of contents.

`Code` lists one file per line (nested bullets), or several files on one line separated by `;`.

When showing a markdown example that itself contains a fenced block, wrap it in a **four-backtick outer fence**. Earlier rendering broke when nested fences used the same length.

Example item:

````markdown
## BEH-014: Frame navigation by number

Typing a frame number in the navigation textbox and pressing Enter moves
every view (video, chronogram, overlay) to that frame.

- **Group:** CAP-200
- **Origin:** essential
- **Confidence:** verified
- **Status:** active
- **Code:**
  - `VideoControl.js`: `VideoControl.onFrameTextChanged`, `VideoControl.seekFrame`
- **Links:** INV-001, ENT-003
- **Tests:** `tests/e2e/navigation.spec.js`
- **Discovered in:** SPIKE-001
````

Example work item (GitHub issue body):

````markdown
## STEP-012: Extract FrameBackend seam for the video tag

```yaml
shape: horizontal
epic: EPIC-003
planned_touches:
  - SEAM-001
  - INV-001
  - BEH-014
```

Goal, acceptance criteria, and tests to keep green go here.
````

## 7. Connecting spec to code and to GitHub

- **Tests carry IDs.** A test names the behaviors it covers (name or marker, for example `covers: BEH-014`). The spec item lists the test under `Tests`.
- **Code refs are lightweight.** `Code` in the spec points to files and symbol names. Code comments mention IDs only at seams and non-obvious hacks (`// DEBT-007`), not everywhere.
- **GitHub issues** are created for `EPIC`, `STEP` and `SPIKE` once the spec skeleton exists and the first steps are concrete. Use labels `epic`, `step`, `spike`, plus `vertical`/`horizontal` on steps.
- **PR template** includes two fields: *Spec items touched* and *Spec items planned*. The checker compares them (touched versus planned). A difference is not an error, it is a prompt to update the spec.
- **Commit messages** and PR titles mention the step ID (`STEP-012`).

## 8. How the spec evolves during the refactor

The spec is expected to be wrong at first and to grow as the code is read.

- **New item discovered mid-step**: add it right away with `discovered_in: STEP-nnn` and `confidence: inferred`. Do not defer.
- **A step impacts an item not listed in its plan**: add the step to that item's `affected_by`, then note the miss in the PR (touched versus planned). If the item had no test, add one or flag `OQ`.
- **A decision is reversed**: leave the old `DEC` in place with `status: superseded` and `superseded_by`; add a new `DEC`.
- **An open question is answered**: convert into BEH, INV, DEC or DEBT, and mark the `OQ` as resolved with a pointer.
- **Debt paid**: the `DEBT` item becomes `dropped` with a note of the step that fixed it.
- The spec and the code change **in the same PR**.

## 9. Domain vocabulary (frame-accurate annotation)

These names were agreed during design and should be used consistently.

### 9.1 Frame identity and modes

- **Frame ID**: the identity of a frame. Annotations are stored as a **dict keyed by frame ID**; the key may be a frame number or a frame name, so image-list sources work the same way. The **manifest** defines frame order.
- **Single authority** for the current frame. Every view (video, chronogram, navigation textbox, overlay) renders from the **presentation event**, never from its own local copy.
- **Tokens, latest wins**: every frame request carries a token; stale completions are discarded.
- **`data-frame`** attribute: a read-only debug and test hook mirroring the displayed frame. It has no functional role; the app must not read it.
- Vue notes: use a computed `displayedFrame`; `await nextTick()` before assertions; prefer `shallowRef` for large objects.

### 9.2 Seed invariants

The prior conversation drafted letters `INV-A` to `INV-L` and added two more. Their wording was not preserved verbatim, so **re-derive them as numbered INV items**. The ones that matter most:

- The displayed frame, the chronogram cursor, the navigation textbox and the overlay source frame all refer to the same frame ID once a presentation has settled.
- Only the presentation event updates dependent views; a seek intent alone does not.
- Out-of-order or stale results never replace a newer one (token check).
- `INV-M` **(proposed number)**: live stream and archive share one frame ID space.
- `INV-N` **(proposed number)**: annotations are stored in raw full-resolution coordinates, independent of the rendition shown.

### 9.3 FrameBackend seam

One interface over four frame sources:

1. HTML `<video>` tag with custom event callbacks
2. JPEG frame cache
3. WebCodecs / MediaCodec decoder
4. Image list (CVAT-style), so Labelbee can annotate images as well as video

Shape:

- Capabilities: `exact`, `syncPeek`, `prefetch`, `pixelsPersist`.
- Methods: `request`, `peek`, `prefetch`, `play`, `pause`.
- Result: `Presented { frame, token, exact, handle }`.
- Verified by a shared **contract test suite** run against every backend, plus a **fake backend** with injectable latency for deterministic tests.

### 9.4 Rendition and Layer

- **Rendition**: one way of getting pixels for a frame. Fields: `frameId`, `source`, `fullres`, `region`, `scale`, `level`, `exact`, `valid`, `bitmap`, `processing`.
  - `processing`: `kind`, `steps`, `aligned`, `dependsOn`, `lossy`, `where`. Raw video has no processing; ML outputs, frame differences, and visualization tricks do.
  - Supports multi-resolution and multi-source (for example server-decoded cropped or subsampled tiles for zoomed views).
- **Layer**: one kind of image-like data attached to a frame. Fields: `name`, `kind`, `semantics` (`categorical`, `scalar`, `vector`, `color`), `channels`, `dtype`, `legend` or `range`, `aligned`, `origin` (`model`, `human`, `sensor`).
  - Examples: raw RGB, masks per element, heatmaps, vector fields, UV maps.
- Streaming: live feed as primary source, stored archive as secondary, with compatible frame IDs (see `INV-M`). Segmented sources (for example DeepStream video blocks) are opened through a manifest.

## 10. Tooling

- Keep the spec as plain markdown with attribute bullets. No external tool is required.
- Write a small **checker script** in Python (standard library only; run with `python3 -I`; `tools/spec_view.py` is its first part) that parses the files and reports:
  1. duplicate IDs
  2. dangling references in `links`, `superseded_by`, `epic`, `planned_touches`
  3. `BEH` items with no `tests` (warning, not error, during the early phase)
  4. `affected_by` steps that do not exist
  5. touched-versus-planned mismatches, read from a PR description
- Run the checker in CI and locally before each PR.
- Alternatives considered, and why we did not start with them: **sphinx-needs** (strong, but needs Sphinx and reStructuredText or MyST), **StrictDoc**, **Doorstop**, **OpenFastTrace**. Any of these can be adopted later because the data is structured; the markdown+YAML format migrates cleanly.

## 11. Suggested first moves in the Claude Code session

1. Create `docs/spec/` with this file as `README.md`, and empty files for each type.
2. Read the code and fill in `CAP` and `ENT` first, then `BEH`. Tag `origin` and `confidence` honestly; prefer `inferred` unless you ran it.
3. Write the frame-sync `INV` items and the `FrameBackend` `SEAM` item from section 9.
4. Record every hack found as `DEBT`, every unknown as `OQ`.
5. Add the checker script and a PR template with *touched* and *planned* fields.
6. Only then open the first `EPIC` and `STEP` issues on GitHub.
7. Characterization tests come per step, attached to the `BEH` and `INV` items the step touches, not as a separate up-front phase.

## 12. Open points

- Final folder layout (one file per type versus per capability) is not settled.
- The `status` value set is a proposal.
- Whether `CAP` items need a numeric ID plus slug is not settled; numeric ID with a title is the default.
- Labelbee feature details so far come from the 2019 paper and the maintainer's statements; the code has not been inventoried yet.
