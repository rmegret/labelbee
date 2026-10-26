# Stage 1: General architecture

## 1.1 System context

```mermaid
flowchart LR
    user([Annotator / admin<br/>browser]) -->|HTTPS| proxy[Apache / reverse proxy<br/>sets SCRIPT_NAME]
    proxy --> gunicorn[gunicorn<br/>appserver.py : gunicorn_app]
    gunicorn --> flask[Flask app<br/>labelbee.app.create_app]
    flask --> db[(MySQL via PyMySQL<br/>sqlite in local example)]
    flask --> fs[(Data dir on disk<br/>videos, tracks CSV/JSON,<br/>tag images)]
    flask -.->|SMTP, mostly disabled| mail[Mail server]
    user -.->|"direct file URLs<br/>(video range requests)"| fs
```

- `ReverseProxied` middleware (`labelbee/middlewares/reverse_proxy.py`) lets the
  app live under a prefix. The prefix is passed to JS as `http_script_name`
  and re-applied by `url_for()` in `labelBee.js`.
- Two *different* roots for data on disk (see 2.5): `static/data` (download
  blueprint) and `$DATA_DIR` (rawdata API).
- Deployment assets: `gunicorn_*.sh`, `Procfile` (points to nonexistent
  `manage:app`), `Dockerfile` + `docker-compose.yaml` (**MySQL only**, not
  the app), `README_deployment.md`.

## 1.2 Two programs in one repository

```mermaid
flowchart TB
    subgraph SERVER["Server side: Python / Flask  (~1.5k LOC)"]
        direction TB
        APP[app.py<br/>create_app, db, ma, csrf]
        BP_PAGES["Page blueprints (Jinja, server-rendered)<br/>home, auth, admin, gallery, labelbee"]
        BP_API["REST blueprint /api/v1<br/>flask_restful resources"]
        BP_DL["download blueprint /data<br/>range requests"]
        DBL["database/*/api.py<br/>query helpers"]
        MOD[models.py<br/>User Role Video VideoData DataSet + forms]
        APP --> BP_PAGES & BP_API & BP_DL
        BP_PAGES --> DBL
        BP_API --> DBL
        DBL --> MOD
    end
    subgraph CLIENT["Browser side: vanilla JS  (~18k LOC)"]
        direction TB
        PAGE[labelbee_page.html<br/>1.6k lines, ~180 inline onclick]
        MODULES["12 scripts sharing globals<br/>Model, VideoList, VideoControl, OverlayControl,<br/>SelectionControl, AnnotationIO, Chrono*, ZoomView, labelBee"]
        EXT["extern/: jQuery, jQuery UI, fabric.js, d3 v6,<br/>VideoFrame, DataTables, jsgrid, ..."]
        PAGE --> MODULES --> EXT
    end
    BP_PAGES -- renders --> PAGE
    MODULES -- "AJAX: /api/v1/*, /data/*" --> BP_API
    MODULES -- "AJAX / <video src>" --> BP_DL
```

The only server-to-client contract is: (1) the HTML page rendered by
`blueprints/labelbee/labelbee.py` (passes `userid`, `http_script_name`;
`video_url`/`tag_file` are passed but **not used by the JS**), (2) the JSON
under `/api/v1`, (3) raw files under `/data` and `/api/v1/rawdata/`.

## 1.3 Server route map

| Blueprint | Prefix | Role | Auth |
|-----------|--------|------|------|
| `home` | `/` | landing page | public |
| `auth` | `/user`, `/user/profile` | profile (Flask-User supplies login/register) | login |
| `admin` | `/admin`, `/manage_users`, `/admin/version` | user admin | role `admin` |
| `gallery` | `/datasets`, `/add_dataset`, `/delete_dataset`*, `/edit_dataset`*, `/videos`, `/edit_video`*, `/videodata`, `/video_data_details` | HTML CRUD on datasets / videos / annotations | login; `*` = role `admin` |
| `labelbee` | `/labelbee/gui` | **the annotator page** | login |
| `download` | `/data/<path>` | static data with HTTP range | **none seen** (unverified) |
| `api` | `/api/v1/...` | JSON: videos, datasets, annotations, auth, rawdata | per-method `current_user` checks, CSRF-exempt |

## 1.4 Client runtime architecture (as is)

```mermaid
flowchart TB
    subgraph G["Global mutable state (window)"]
        Tracks[(Tracks)]
        Tags[(Tags)]
        videoinfo[(videoinfo)]
        derived[(flatTracks, allIntervals,<br/>tagIntervals, ttags, tagCache)]
        flags[(tagMode, ROI, excludeRects,<br/>showObs..., logging, undoStack ...)]
    end
    subgraph S["Singletons created in init()"]
        VM[videoManager<br/>VideoManager]
        VC[videoControl<br/>VideoControl + VideoCache]
        OV[overlay<br/>OverlayControl]
        CH[chrono<br/>Chronogram + ChronoAxes]
        SEL[selectionControl<br/>plain object used as event bus]
        ZO[zoomOverlay<br/>ZoomOverlay]
        IO[fromServerDialog, loginDialog,<br/>statusWidget, ...]
    end
    VM --> VC
    VC -->|"overlay.hardRefresh() direct call"| OV
    VC -. "frame:changed (jQuery event)" .-> CH
    OV -->|"selectBeeByID() global fn"| SEL
    SEL -. "selection:* events" .-> ZO
    SEL -. "tagselection:* events" .-> CH
    OV <--> Tracks
    OV <--> Tags
    SEL <--> Tracks
    IO --> Tracks & Tags
    ZO <--> Tracks & Tags
    CH --> Tracks & Tags
    CH --> derived
```

Reading guide: **solid** arrows are direct calls through globals, **dotted**
arrows are the jQuery events. There is no central store, no module system,
and no layering: the "model" (`Model.js`, 293 lines) is tiny and everything
else reads/writes `Tracks` and `Tags` directly.

## 1.5 Layers that are *missing* (what the refactor would introduce)

1. A real **model/store** owning `Tracks`/`Tags`/selection with change events.
2. A **service layer** for server I/O (today `$.ajax` calls are spread across
   `AnnotationIO`, `VideoList`, `VideoControl`, `ZoomView`, `labelBee`).
3. **Views** separated from controllers (today canvas drawing, form updates
   and data mutation live in the same functions).
4. A **module system** (ES modules) so dependencies are explicit.
