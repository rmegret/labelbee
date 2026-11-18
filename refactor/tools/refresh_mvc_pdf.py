#!/usr/bin/env python3
"""Draws the refresh logic as Controller -> Model -> View pages (SVG) and merges them into one PDF with rsvg-convert.

Source of refactor/design/0009-refresh-mvc.pdf, state at commit 05aa0da7 (slice 6 step 4e-1). The rows (P2..P6) and the cascade page are
hand-written from the code (file:line), refresh_baseline.json and design/0009-refresh-triggers.md: update them when a step migrates a caller
(change its row to kind "m" and its call), then regenerate.

Usage (needs plain python and rsvg-convert, both in the labelbeedev env; the SVG pages go to the second directory):
    python refactor/tools/refresh_mvc_pdf.py refactor/design/0009-refresh-mvc.pdf "$TMPDIR/mvc"
"""
import html, subprocess, sys, pathlib

OUT = pathlib.Path(sys.argv[1])
TMP = pathlib.Path(sys.argv[2])
W, H = 1700, 1040
GREEN, ORANGE, GREY, RED = "#2e7d32", "#e65100", "#757575", "#c62828"
FILL = {"on_m": "#c8e6c9", "on_c": "#ffe0b2", "part": "#fff9c4"}
MODEL_FILL = {"events": "#bbdefb", "none": "#eeeeee", "global": "#e1bee7", "outside": "#ffcdd2"}
e = html.escape


def t(x, y, s, size=12, fill="#222", weight="normal", mono=False, anchor="start"):
    fam = "DejaVu Sans Mono, monospace" if mono else "DejaVu Sans, sans-serif"
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" '
            f'font-family="{fam}" text-anchor="{anchor}">{e(s)}</text>')


def rect(x, y, w, h, fill="#fff", stroke="#999", sw=1, dash=None, rx=6):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'


def arrow(x1, y1, x2, y2, color="#555", sw=1.6):
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}" '
            f'marker-end="url(#ah{"r" if color == RED else ""})"/>')


DEFS = ('<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#555"/></marker>'
        f'<marker id="ahr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="{RED}"/></marker></defs>')

CHIPS = ["Chrono", "Overlay", "Form", "Zoom", "Widgets"]


def chip(i, state, label, kind, y):
    x = 1060 + i * 122
    if state == "on":
        return rect(x, y, 116, 30, FILL["on_m" if kind == "m" else "on_c"], GREEN if kind == "m" else ORANGE, 1.4) + t(x + 58, y + 20, label, 12, "#222", "bold", anchor="middle")
    if state == "part":
        return rect(x, y, 116, 30, FILL["part"], "#9e9d24", 1.4, "4,3") + t(x + 58, y + 20, label, 12, "#555", anchor="middle")
    if state == "miss":
        return rect(x, y, 116, 30, "#fff", RED, 1.6, "4,3") + t(x + 58, y + 20, label + " ✗", 12, RED, "bold", anchor="middle")
    return rect(x, y, 116, 30, "#fafafa", "#ddd", 1) + t(x + 58, y + 20, label, 12, "#bbb", anchor="middle")


def header(title, sub, idx, total):
    s = [f'<rect width="{W}" height="{H}" fill="#fff"/>', DEFS]
    s.append(t(30, 38, title, 24, "#111", "bold"))
    s.append(t(30, 62, sub, 13, "#555"))
    s.append(t(W - 30, 38, f"{idx}/{total}", 13, "#888", anchor="end"))
    for x, w, name, sub2 in [(30, 560, "CONTROLLER", "which user action calls which function"), (640, 370, "MODEL", "what is written (events / globals / other)"),
                            (1060, 610, "VIEW", "what is refreshed, and by which call")]:
        s.append(rect(x, 82, w, 34, "#263238", "#263238"))
        s.append(t(x + 12, 104, name, 14, "#fff", "bold"))
        s.append(t(x + w - 10, 104, sub2, 11, "#cfd8dc", anchor="end"))
    return s


def footer(s):
    y = H - 22
    s.append(rect(30, y - 14, 18, 14, FILL["on_m"], GREEN))
    s.append(t(54, y - 3, "refreshed by refresh.*", 11))
    s.append(rect(210, y - 14, 18, 14, FILL["on_c"], ORANGE))
    s.append(t(234, y - 3, "refreshed by custom code", 11))
    s.append(rect(400, y - 14, 18, 14, FILL["part"], "#9e9d24", 1, "3,2"))
    s.append(t(424, y - 3, "conditional / indirect (event cascade)", 11))
    s.append(rect(650, y - 14, 18, 14, "#fff", RED, 1.4, "3,2"))
    s.append(t(674, y - 3, "✗ should be refreshed, is not", 11, RED))
    s.append(f'<line x1="880" y1="{y-7}" x2="905" y2="{y-7}" stroke="{RED}" stroke-width="2" marker-end="url(#ahr)"/>')
    s.append(t(912, y - 3, "write from view / feedback", 11, RED))
    for i, (k, lab) in enumerate([("events", "events"), ("none", "no model change"), ("global", "global / UI state"), ("outside", "model outside events")]):
        s.append(rect(1110 + i * 145, y - 14, 18, 14, MODEL_FILL[k], "#999"))
        s.append(t(1134 + i * 145, y - 3, lab, 10))


def row(s, i, r):
    y = 130 + i * 98
    kind = r.get("kind", "m")             # m: migrated, c: custom, u: unreachable
    col = {"m": GREEN, "c": ORANGE, "u": GREY}[kind]
    s.append(rect(30, y, 560, 70, "#fff" if kind != "u" else "#f5f5f5", col, 2.2))
    s.append(f'<rect x="30" y="{y}" width="7" height="70" rx="3" fill="{col}"/>')
    s.append(t(46, y + 22, r["action"], 13, "#111" if kind != "u" else "#777", "bold"))
    for j, ln in enumerate(r["fn"]):
        s.append(t(46, y + 40 + j * 15, ln, 10.5, "#37474f", mono=True))
    s.append(arrow(590, y + 35, 640, y + 35))
    mk = r["mkind"]
    s.append(rect(640, y, 370, 70, MODEL_FILL[mk], "#888", 1.2, "5,3" if mk == "none" else None))
    s.append(t(652, y + 22, r["model"][0], 13, "#111", "bold"))
    for j, ln in enumerate(r["model"][1:]):
        s.append(t(652, y + 40 + j * 15, ln, 10.5, "#37474f", mono=True))
    s.append(arrow(1010, y + 35, 1060, y + 35))
    v = r["view"]
    for k, name in enumerate(CHIPS):
        st = v.get(name.lower(), "off")
        label = name
        if name == "Overlay" and st in ("on", "part"):
            label = "Overlay ↻" if r.get("rebuild", True) else "Overlay ~"
        s.append(chip(k, st, label, "m" if kind == "m" else "c", y))
    s.append(t(1060, y + 50, r["call"], 11, col if kind != "u" else "#777", "bold", mono=True))
    if r.get("note"):
        s.append(t(1060, y + 66, "⚠ " + r["note"], 10.5, RED))
    if r.get("fb"):
        s.append(f'<line x1="1055" y1="{y+60}" x2="1015" y2="{y+60}" stroke="{RED}" stroke-width="2.2" marker-end="url(#ahr)"/>')


def page(title, sub, rows, idx, total, extra=None):
    s = header(title, sub, idx, total)
    for i, r in enumerate(rows):
        row(s, i, r)
    if extra:
        s += extra
    footer(s)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">' + "".join(s) + "</svg>"


UPD = dict(chrono="on", overlay="on", form="on", zoom="on")
REB = dict(chrono="on", overlay="on", form="on", zoom="on", widgets="on")
LEG = dict(chrono="on", overlay="on", form="on", zoom="part", widgets="on")   # videoControl.refresh + refreshChronogram

P2 = [
    dict(action="Click a label button / toggle a label key", fn=["labelToggle  SelectionControl.js:828", "-> storeUnit (writes only)"],
         mkind="events", model=["events.update", "{labels}"], view=dict(UPD, ), rebuild=False, call="refresh.update()   SelectionControl.js:866",
         note="nothing selected -> legacy newRectForCurrentTag (own refresh, DEBT)"),
    dict(action="Edit the notes", fn=["onActivityChanged  SelectionControl.js:876"], mkind="events", model=["events.update", "{notes}"],
         view=dict(form="on"), call="refresh.form()   SelectionControl.js:876"),
    dict(action="Type in the labels field", fn=["onLabelsChanged  SelectionControl.js:886"], mkind="events", model=["events.update", "{labels}"],
         view=dict(UPD), rebuild=False, call="refresh.update()   SelectionControl.js:886"),
    dict(action="Drag / resize a box, release", fn=["onObjectModified  OverlayControl.js:3956", "geometry read from the fabric rect"],
         mkind="events", model=["events.update", "{cx, cy, width, height, angle}"], view=dict(chrono="part", overlay="on", form="on"), rebuild=False,
         call="overlayUpdate() + form() [+ chrono() if ROI]   :3967-3969", fb=True,
         note="the rect is the source of the geometry; guard rect.dragging (OverlayControl.js:1376) stops model->rect->model"),
    dict(action="Reset angle / angle from tag", fn=["onClickResetAngle  OverlayControl.js:496", "onClickAngleFromTag  OverlayControl.js:518"],
         mkind="events", model=["events.update", "{angle}"], view=dict(overlay="on", form="on"), rebuild=False, call="overlayUpdate() + form()"),
    dict(action="Choose an alternate tag (zoom view)", fn=["onClickAlternateTag  ZoomView.js:1713", "spreadTagFix  (tag store)"],
         mkind="outside", model=["events.update {tag, id}", "+ tag store edited outside events"], view=dict(UPD), rebuild=False,
         call="refresh.update()   ZoomView.js:1733", note="tag fixes bypass events: the audit cannot see them (DEBT-826, Q34)"),
    dict(action="Rotate the tag (zoom view)", fn=["rotateTag  ZoomView.js:1769", "spreadTagFix  (tag store)"], mkind="outside",
         model=["events.update {tag}", "+ tag store edited outside events"], view=dict(UPD), rebuild=False, call="refresh.update()   ZoomView.js:1769",
         note="same: tag store written outside events (DEBT-826)"),
    dict(action="Edit the parts (zoom view)", fn=["syncToTracks  ZoomView.js:417"], mkind="events", model=["events.update", "{parts}"],
         view=dict(form="on", zoom="on"), call="refresh.form() + refresh.zoom()   ZoomView.js:417-418"),
]

P3 = [
    dict(action="Ctrl-drag a box (create)", fn=["onMouseUp_interactiveRect  OverlayControl.js:3564", "-> submitDraft  SelectionControl.js:484"],
         mkind="events", model=["events.create / commit", "(the draft lives in a fabric rect until validated)"], view=REB,
         call="refresh.rebuild()   SelectionControl.js:484", fb=True, note="draft obs held by a view object, outside the store (decision: ADR 0009, 1e)"),
    dict(action="Ctrl-drag refused (id conflict) or too small", fn=["onMouseUp_interactiveRect  OverlayControl.js:3564, 3577"],
         mkind="none", model=["nothing stored", "the draft is dropped"], view=dict(overlay="on", form="on", widgets="on"), call="refresh.overlayRebuild()"),
    dict(action="Type the id of the new box (Enter)", fn=["onKeyDown_NewIDEdit  labelBee.js:895", "-> storeUnit(.., true) -> submitDraft"],
         mkind="events", model=["events.create / commit"], view=REB, call="refresh.rebuild()   labelBee.js:895"),
    dict(action="Predict mode: click a tag", fn=["onMouseDown_predict  OverlayControl.js:3325", "-> newRectForTag"], mkind="events",
         model=["events.create / commit"], view=REB, call="refresh.rebuild()   OverlayControl.js:3442"),
    dict(action="Toolbar 'new rect for current tag' (LEGACY)", fn=["newRectForCurrentTag  OverlayControl.js:3294"], mkind="events",
         model=["events.create / commit"], view=REB, call="refresh.rebuild()   OverlayControl.js:3321", note="legacy, to retire with the draft rect (ADR 0009, 1e)"),
    dict(action="Pick-frame: Set Start / Set End", fn=["doSetSpanStart / doSetSpanEnd  OverlayControl.js:988, 1011"], mkind="events",
         model=["events.update", "{span}"], view=REB, call="refresh.rebuild()"),
    dict(action="Pick-frame: swap ids over an interval", fn=["doSwap2  OverlayControl.js:995"], mkind="events", model=["events.swap"], view=REB,
         call="refresh.rebuild()"),
    dict(action="Enter the pick-frame mode", fn=["setInteractionMode  OverlayControl.js:223"], mkind="events", model=["events.update", "{span} default span, written at entry (DEBT-825)"],
         view=dict(chrono="on", overlay="part", form="part"), call="refresh.chrono()  (+ the mode's own hardRefresh)", fb=True,
         note="the mode switch still calls hardRefresh directly; in pick-frame it re-selects a bee (selectBeeByID)"),
]

P4 = [
    dict(kind="c", action="Delete the selected observation", fn=["deleteEvent  SelectionControl.js:700"], mkind="events", model=["events.delete"], view=LEG,
         call="videoControl.refresh() + refreshChronogram()   :700-701"),
    dict(kind="c", action="Swap two ids (Selected panel)", fn=["swapID_callback / doSwap2  SelectionControl.js:535"], mkind="events", model=["events.swap", "(obs_swapID)"], view=LEG,
         call="videoControl.refresh() + refreshChronogram()   :536-537"),
    dict(kind="c", action="Type a new id on the selected box (Enter)", fn=["onKeyDown_IDEdit  labelBee.js:871", "-> changeObservationID"], mkind="events", model=["events: id change", "(changeObservationID)"], view=LEG,
         call="videoControl.refresh() + refreshChronogram()   :871-872", fb=True, note="activeObject.id and defaultSelectedBee are set by the controller on the view/global side"),
    dict(kind="c", action="New visit", fn=["newVisit  VisitControl.js:94"], mkind="events", model=["events.commit", "{visit, span} + global default_id"], view=dict(chrono="on", overlay="on", form="on", widgets="part"),
         call="overlay.hardRefresh() + refreshChronogram() + this.update()", note="no videoControl widget update; the visit widget refreshed by hand"),
    dict(kind="c", action="Set the span of a visit (start / end)", fn=["VisitWidget.setSpanFrame  VisitControl.js:228"], mkind="events", model=["events.update", "{span}"],
         view=dict(chrono="on", overlay="miss", form="miss", widgets="part"), call="this.update() + refreshChronogram()",
         note="INCOMPLETE: a span decides which boxes show, the overlay is not rebuilt"),
    dict(kind="u", action="Undo (unreachable: undo is off, Q33)", fn=["undoAction  SelectionControl.js:711"], mkind="events", model=["events.commit", "(undo stack is empty)"], view=LEG,
         call="videoControl.refresh() + refreshChronogram()   :726-727", note="re-adds the rect by hand; goes with the undo slice"),
]

P5 = [
    dict(kind="c", action="Delete all false-alarm events", fn=["deleteFalsealarmEvents  ZoomView.js:1937"], mkind="events", model=["events.delete x N", "one notification per event, no batch"],
         view=dict(chrono="on", overlay="miss", form="miss", widgets="miss"), call="refreshChronogram()   ZoomView.js:1941", note="INCOMPLETE: a box of the current frame stays on the overlay"),
    dict(kind="c", action="Delete all wrong-id events", fn=["deleteWrongIdEvents  ZoomView.js:1946"], mkind="events", model=["events.delete x N"],
         view=dict(chrono="on", overlay="miss", form="miss", widgets="miss"), call="refreshChronogram()   ZoomView.js:1950", note="INCOMPLETE: same"),
    dict(kind="c", action="Clean obsolete events (low DM, excluded tags)", fn=["cleanObsoleteEvents  ChronoControl.js:2053"], mkind="events", model=["events.delete x N"],
         view=dict(chrono="on", overlay="miss", form="miss", widgets="miss"), call="refreshChronogram()   ChronoControl.js:2053", note="INCOMPLETE: same"),
    dict(kind="c", action="Apply all tag fixes", fn=["bakeAllTagFixes  ZoomView.js:1911"], mkind="outside", model=["tag objects edited in place", "no events notification"],
         view=dict(chrono="on"), call="refreshChronogram()   ZoomView.js:1914", fb=True, note="not a store write: the audit and any notification are blind (DEBT-826, Q34)"),
    dict(kind="c", action="Delete false-alarm tags / undo all tag fixes", fn=["deleteFalsealarmTags  ZoomView.js:1932", "undoAllTagFixes  ZoomView.js:1978"], mkind="outside",
         model=["AnnotationStore.getTags()", "tag store, outside events"], view=dict(chrono="on"), call="refreshChronogram()", note="same: tags live outside events (DEBT-826)"),
    dict(kind="c", action="Open a file, load from the server or CSV", fn=["setTracks, loadEvents, loadEventsFromServerByID,", "eventsFromServer, load*CSV*  AnnotationIO.js"], mkind="events",
         model=["events.load / replace", "+ AnnotationStore (tags, video info)"], view=dict(chrono="on", overlay="on", form="on", widgets="on"),
         call="refreshChronogram() + onFrameChanged()   (step 5)", fb=True, note="server and CSV loaders refresh twice after setTracks (Q36)"),
    dict(kind="c", action="Load / edit the separate tags", fn=["setTags, loadTagsCSVFromServer  AnnotationIO.js"], mkind="outside", model=["AnnotationStore.getTags()"],
         view=dict(chrono="on"), call="refreshChronogram()"),
]

P6 = [
    dict(kind="c", action="Chronogram filters and toggles (14 + 3 functions)", fn=["ChronoControl.js:76-480, ChronoControlInteraction.js:456-505"], mkind="global",
         model=["UI flags", "flag_restrictID, showSpans, hide flowers..."], view=dict(chrono="on"), call="refreshChronogram()"),
    dict(kind="c", action="Change the ROI", fn=["ROIChanged  OverlayControl.js:2670"], mkind="global", model=["ROI, tagsSampleFilterROI", "(then recomputed tag parameters)"],
         view=dict(chrono="on", overlay="on", form="on", widgets="on"), call="refreshChronogram() + videoControl.refresh()", note="refreshOverlay would do for the overlay part"),
    dict(kind="c", action="Exclusion boxes, chrono / tag parameters", fn=["excludeRectsChanged  OverlayControl.js:2766", "onTagsParametersChanged  :2994"], mkind="global",
         model=["excludeRects, tag parameters", "derived data recomputed by the controller"], view=dict(chrono="on", overlay="on", form="on", widgets="on"),
         call="refreshChronogram() + videoControl.refresh()"),
    dict(kind="c", action="Pan / zoom the video (drag, wheel)", fn=["onMouseMove_panning, onMouseWheel_*  OverlayControl.js:3817, 3829"], mkind="global",
         model=["canvasTransform"], view=dict(overlay="on", form="on", widgets="on"), call="videoControl.refresh()  on every mouse event",
         note="full rebuild of every rect per mouse move; an overlay update would do"),
    dict(kind="c", action="Show / hide tags and tracks", fn=["onShowTagsChanged, onShowTagsTracksChanged  OverlayControl.js:2535, 2540"], mkind="global",
         model=["showTags, showTagsTracks, ..."], view=dict(overlay="on", form="on", widgets="on"), call="videoControl.refresh()"),
    dict(kind="c", action="Change the track window", fn=["onTrackWindowChanged  OverlayControl.js:2574"], mkind="global", model=["overlay.trackWindow"],
         view=dict(chrono="part", overlay="on", form="on", widgets="on"), call="videoControl.refresh() + trigger trackWindow:change", fb=True,
         note="event fan-out to updateTrackWindowSpan, focusTrackWindow (view -> event -> view)"),
    dict(kind="c", action="Select / deselect a box, click the background", fn=["onMouseDown_selectMultiframe  OverlayControl.js:3602", "onObjectDeselected  :3928, selectBee, deselectBee"],
         mkind="global", model=["defaultSelectedBee (global)", "selection:* events"], view=dict(chrono="part", overlay="on", form="on", zoom="part", widgets="on"),
         call="videoControl.refresh() + tagselection:* events", fb=True, note="a selection rebuilds the overlay and fans out to chrono, zoom, form buttons (step 6)"),
    dict(kind="c", action="Move to another frame (play, seek, chronogram click)", fn=["VideoControl.js:878-885 (onFrameChanged)", "listeners of frame:changed"], mkind="global",
         model=["videoControl.currentFrame"], view=dict(chrono="part", overlay="on", form="on", widgets="on"), call="hardRefresh() then trigger frame:changed", fb=True,
         note="overlay refreshed directly AND by frame:changed listeners (VideoControl.js:884: 'synchronicity issue?')"),
    dict(kind="c", action="Ctrl+R", fn=["onKeyDown  labelBee.js:947"], mkind="none", model=["nothing"], view=dict(overlay="on", form="on", widgets="on"), call="videoControl.refresh()"),
]


def box(x, y, w, h, lines, stroke="#555", fill="#fff", size=12, red=False, mono=False):
    s = [rect(x, y, w, h, fill, RED if red else stroke, 2 if red else 1.2)]
    for i, ln in enumerate(lines):
        s.append(t(x + 10, y + 20 + i * 16, ln, size if i else size + 1, RED if red and i else "#111", "bold" if i == 0 else "normal", mono=mono and i > 0))
    return "".join(s)


def cascade_page(idx, total):
    s = header("Impure parts: what one rebuild really triggers", "videoControl.refresh() / overlay.hardRefresh() as read in the code and measured (refresh_baseline.json 'create')", idx, total)
    s[-3:] = []   # no column headers on this page
    s = [x for x in s if "CONTROLLER" not in x and "MODEL" not in x and "VIEW" not in x and "which user action" not in x and "what is written" not in x and "what is refreshed" not in x]
    # remove the three header bars (they are rect + 2 text each): rebuild cleanly
    s = [f'<rect width="{W}" height="{H}" fill="#fff"/>', DEFS, t(30, 38, "Impure parts: what one rebuild really triggers", 24, "#111", "bold"),
         t(30, 62, "videoControl.refresh() and overlay.hardRefresh() as read in the code and measured (refresh_baseline.json, scenario 'create')", 13, "#555"),
         t(W - 30, 38, f"{idx}/{total}", 13, "#888", anchor="end")]
    s.append(box(30, 100, 330, 60, ["videoControl.refresh()", "VideoControl.js:936"], GREEN))
    s.append(arrow(360, 130, 420, 130))
    s.append(box(420, 100, 330, 60, ["updateVideoControlForm", "date, time, frame widgets  (view)"]))
    s.append(arrow(195, 160, 195, 200))
    s.append(box(30, 200, 330, 60, ["overlay.hardRefresh()", "OverlayControl.js:956"], GREEN))
    s.append(arrow(360, 215, 420, 215))
    s.append(box(420, 185, 330, 36, ["redrawVideoFrame  (view)"]))
    s.append(arrow(360, 235, 420, 255))
    s.append(box(420, 240, 330, 36, ["canvas1.clear()  (view)"]))
    s.append(f'<line x1="750" y1="258" x2="820" y2="258" stroke="{RED}" stroke-width="2.4" marker-end="url(#ahr)"/>')
    s.append(box(820, 225, 420, 66, ["selection:cleared -> onObjectDeselected", "OverlayControl.js:3914: a draft rect calls videoControl.refresh()", "re-entry into the rebuild that is running"], red=True, size=11))
    s.append(arrow(195, 260, 195, 330))
    s.append(box(30, 330, 330, 60, ["createRectsFromTracks()", "one fabric rect per obs of the frame  (view)"]))
    s.append(f'<line x1="360" y1="360" x2="420" y2="360" stroke="{RED}" stroke-width="2.4" marker-end="url(#ahr)"/>')
    s.append(box(420, 330, 330, 60, ["selectBeeByID(defaultSelectedBee)", "end of hardRefresh, OverlayControl.js:1075; global read"], red=True, size=11))
    s.append(f'<line x1="750" y1="360" x2="820" y2="360" stroke="{RED}" stroke-width="2.4" marker-end="url(#ahr)"/>')
    s.append(box(820, 310, 420, 100, ["trigger tagselection:created / selection:created", "listeners (SelectionControl.js:13-21, labelBee.js:142):", "updateChronoSelection, updateSelectID, updateFormButtons,", "zoomOverlay.selectionChanged -> refreshZoom"], red=True, size=11))
    s.append(arrow(1240, 360, 1300, 360, RED))
    s.append(box(1300, 330, 370, 60, ["Chrono, Form, Zoom views", "refreshed as a side effect, not by a refresh.* call"], red=True, size=11))
    s.append(arrow(195, 390, 195, 450))
    s.append(box(30, 450, 330, 60, ["second selection pass", "cause not traced to a line yet"], GREY))
    s.append(f'<line x1="360" y1="480" x2="1270" y2="480" stroke="{RED}" stroke-width="1.6" stroke-dasharray="6,4"/>')
    s.append(t(380, 472, "baseline 'create' [ran]: updateForm, updateChronoSelection, refreshZoom x2 run twice inside ONE hardRefresh (pick-frame mode adds its own selectBeeByID, :969)", 11, RED))
    s.append(arrow(195, 510, 195, 560))
    s.append(box(30, 560, 330, 60, ["refreshOverlay()  (update)", "OverlayControl.js:1345, copies obs to rects"]))
    s.append(t(380, 592, "guard: refreshRectFromObs skips a rect with rect.dragging (OverlayControl.js:1376); comment 'Avoid infinite cycle' at :1381", 11, "#37474f"))

    s.append(t(30, 670, "State that lives in a view or a global, read back by controllers", 16, "#111", "bold"))
    rows = [
        ("defaultSelectedBee (global)", "read by createRectsFromTracks, written by selectBee/deselectBee and onKeyDown_IDEdit; a rebuild depends on it"),
        ("draft rect.obs (fabric object)", "holds the new observation until submitDraft; storeUnit writes on the rect, not the store (SelectionControl.js:496-505)"),
        ("flatTracksAll (derived from events)", "recomputed only by refreshChronogram (updateChronoData); modifyCurrentObsSpan reads it (SelectionControl.js:904), so a stale chrono = stale data"),
        ("tag store (AnnotationStore.getTags)", "edited by tag-fix helpers outside events: no notification, invisible to refresh.audit (DEBT-826, Q34)"),
        ("activeObject / rect geometry", "onObjectModified reads the geometry from the fabric rect, then refreshOverlay writes it back (guarded)"),
    ]
    for i, (a, b) in enumerate(rows):
        y = 690 + i * 34
        s.append(rect(30, y, 330, 28, MODEL_FILL["global"], "#888"))
        s.append(t(40, y + 19, a, 12, "#111", "bold"))
        s.append(t(375, y + 19, b, 11.5, "#37474f"))

    s.append(t(30, 890, "Guards that exist today", 16, "#111", "bold"))
    s.append(t(30, 912, "refresh.* drops a call made during a refresh (logged in refresh.log, released on throw) and refresh.audit(events) lists every store write not followed by a refresh.*", 12, "#37474f"))
    s.append(t(30, 930, "call in the same task. Neither covers the direct calls (videoControl.refresh ~21, refreshChronogram ~46, overlay.hardRefresh ~9 call sites, grep) nor writes outside events.", 12, RED))
    footer(s)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">' + "".join(s) + "</svg>"


def intro_page(idx, total):
    s = [f'<rect width="{W}" height="{H}" fill="#fff"/>', DEFS, t(30, 44, "LabelBee refresh logic as Controller -> Model -> View", 28, "#111", "bold"),
         t(30, 72, "State at commit 05aa0da7 (slice 6, step 4e-1). Read from the code (file:line), the browser baseline and ADR 0009; nothing here was run again except where marked [ran].", 13, "#555")]
    s.append(t(30, 120, "How to read a page", 18, "#111", "bold"))
    y = 150
    for c, lab in [(GREEN, "Green row: the controller calls refresh.* (explicit API: update, rebuild, form, chrono, zoom, overlayUpdate, overlayRebuild, frame)"),
                   (ORANGE, "Orange row: custom code still calls videoControl.refresh / refreshChronogram / overlay.hardRefresh by hand"),
                   (GREY, "Grey row: unreachable code (undo is off)")]:
        s.append(rect(30, y - 14, 30, 18, "#fff", c, 2.4))
        s.append(t(72, y, lab, 13))
        y += 28
    s.append(t(30, y + 14, "Model column: blue = events store, purple = UI / global state, red = model written outside the events (tag store), grey dashed = no model change.", 13))
    s.append(t(30, y + 38, "View column: five slots, in this order. Filled = refreshed. Dashed yellow = only indirectly (selection or frame events). Red dashed with a cross = should be refreshed and is not.", 13))
    s.append(t(30, y + 62, "Red arrow back from the view to the model, and red text: a feedback or an impurity (write from the view side, event fan-out, state held by a view).", 13, RED))

    s.append(t(30, 370, "What each refresh.* call runs", 18, "#111", "bold"))
    api = [("refresh.update()", dict(chrono="on", overlay="on", form="on", zoom="on"), False, "chrono, overlayUpdate, form, zoom"),
           ("refresh.rebuild()", dict(chrono="on", overlay="on", form="on", zoom="on", widgets="on"), True, "chrono, overlayRebuild, zoom   (a rebuild includes the form and the widgets)"),
           ("refresh.overlayRebuild()", dict(overlay="on", form="on", widgets="on"), True, "videoControl.refresh = updateVideoControlForm + hardRefresh"),
           ("refresh.overlayUpdate()", dict(overlay="on"), False, "overlay.refreshOverlay: rects exist, copy obs into them"),
           ("refresh.form()", dict(form="on"), False, "updateForm: selection form and event tree"),
           ("refresh.chrono()", dict(chrono="on"), False, "refreshChronogram: derived data, chronogram, table"),
           ("refresh.zoom()", dict(zoom="on"), False, "refreshZoom"),
           ("refresh.frame()", dict(overlay="on", form="on", widgets="on"), True, "onFrameChanged")]
    for i, (name, vv, reb, desc) in enumerate(api):
        yy = 392 + i * 42
        s.append(t(30, yy + 20, name, 13, GREEN, "bold", mono=True))
        for k, nm in enumerate(CHIPS):
            xx = 290 + k * 122
            st = vv.get(nm.lower(), "off")
            lab = nm + (" ↻" if nm == "Overlay" and st == "on" and reb else " ~" if nm == "Overlay" and st == "on" else "")
            if st == "on":
                s.append(rect(xx, yy, 116, 30, FILL["on_m"], GREEN, 1.4) + t(xx + 58, yy + 20, lab, 12, "#222", "bold", anchor="middle"))
            else:
                s.append(rect(xx, yy, 116, 30, "#fafafa", "#ddd") + t(xx + 58, yy + 20, nm, 12, "#bbb", anchor="middle"))
        s.append(t(920, yy + 20, desc, 12, "#37474f"))
    s.append(t(30, 745, "Overlay ↻ = rebuild (every rect recreated, bee re-selected, form included); Overlay ~ = update (rects exist, values copied).", 12, "#555"))

    s.append(t(30, 790, "Pages", 18, "#111", "bold"))
    pages = ["2  Migrated: editing one observation (labels, notes, geometry, angle, tags, parts)", "3  Migrated: creating, spans, pick-frame (OverlayControl.js, labelBee.js new id)",
             "4  Custom: delete, swap, id change, visits, undo (SelectionControl.js, labelBee.js, VisitControl.js)", "5  Custom: bulk deletes, tag store, load (ZoomView.js, ChronoControl.js, AnnotationIO.js)",
             "6  Custom: no model change in events, UI parameters, selection, frame change", "7  Impure parts: the cascade inside one rebuild, state held by views"]
    for i, p in enumerate(pages):
        s.append(t(40, 815 + i * 20, p, 13))
    s.append(t(30, 960, "Call sites still custom (grep, approximate, comments excluded): videoControl.refresh() ~21, refreshChronogram() ~46, overlay.hardRefresh() ~9, videoControl.hardRefresh() ~3. refresh.* call sites: 24.", 12, RED))
    footer(s)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">' + "".join(s) + "</svg>"


TOTAL = 7
pages = [
    intro_page(1, TOTAL),
    page("Migrated to refresh.*: editing one observation", "storeUnit writes only; each caller refreshes by what it changed (slice 6 step 4d)", P2, 2, TOTAL),
    page("Migrated to refresh.*: create, spans, pick-frame", "OverlayControl.js writers (step 4e-1), submitDraft and the new-id field (step 4d)", P3, 3, TOTAL),
    page("Custom code: delete, swap, id change, visits, undo", "still videoControl.refresh / refreshChronogram / overlay.hardRefresh by hand (step 4e, next files)", P4, 4, TOTAL),
    page("Custom code: bulk changes, tag store, load", "steps 4e and 5; the tag store is outside events until the tag is an event field (DEBT-826, Q34)", P5, 5, TOTAL),
    page("Custom code: UI parameters, selection, frame change", "no change to the events, section 2 of refactor/design/0009-refresh-triggers.md (explicit calls, later)", P6, 6, TOTAL),
    cascade_page(7, TOTAL),
]
TMP.mkdir(parents=True, exist_ok=True)
files = []
for i, svg in enumerate(pages, 1):
    p = TMP / f"mvc_{i}.svg"
    p.write_text(svg, encoding="utf-8")
    files.append(str(p))
subprocess.run(["rsvg-convert", "-f", "pdf", "-o", str(OUT)] + files, check=True)
print("wrote", OUT)
