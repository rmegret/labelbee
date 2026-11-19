#!/usr/bin/env python3
"""Draws the refresh logic as Controller -> Model -> View pages (SVG) and merges them into one PDF with rsvg-convert.

Source of refactor/design/0009-refresh-mvc.pdf, state after slice 6 step 6i (commit 0c1d70cb) and step 7. The rows (P2..P7), the cascade
and issues pages are hand-written from the code (file:line), refresh_baseline.json and design/0009-refresh-triggers.md: update them when a
step migrates a caller (change its row to kind "m" and its call), then regenerate.

Usage (needs plain python and rsvg-convert, both in the labelbeedev env; the SVG pages go to the second directory):
    python refactor/tools/refresh_mvc_pdf.py refactor/design/0009-refresh-mvc.pdf "$TMPDIR/mvc"
"""
import html, subprocess, sys, pathlib

OUT = pathlib.Path(sys.argv[1])
TMP = pathlib.Path(sys.argv[2])
W, H = 1700, 1040
GREEN, ORANGE, GREY, RED = "#2e7d32", "#e65100", "#757575", "#c62828"
FILL = {"on_m": "#c8e6c9", "on_c": "#ffe0b2", "part": "#fff9c4"}
MODEL_FILL = {"events": "#bbdefb", "none": "#eeeeee", "global": "#e1bee7", "outside": "#ffcdd2", "sel": "#b2dfdb"}
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
    s.append(t(912, y - 3, "feedback / write from view", 11, RED))
    for i, (k, lab) in enumerate([("events", "events"), ("sel", "selection"), ("none", "no model change"), ("global", "UI state"), ("outside", "outside events")]):
        s.append(rect(1075 + i * 125, y - 14, 18, 14, MODEL_FILL[k], "#999"))
        s.append(t(1099 + i * 125, y - 3, lab, 10))


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
SEL = dict(chrono="on", overlay="on", form="on", zoom="on", widgets="part")    # refresh.selection()

P2 = [
    dict(action="Click a label button / toggle a label key", fn=["labelToggle  SelectionControl.js:786", "-> storeUnit (writes only)"],
         mkind="events", model=["events.update", "{labels}"], view=UPD, rebuild=False, call="refresh.update()   SelectionControl.js:786",
         note="nothing selected -> newRectForCurrentTag (refresh.rebuild, legacy, to retire)"),
    dict(action="Edit the notes", fn=["onActivityChanged  SelectionControl.js:796"], mkind="events", model=["events.update", "{notes}"],
         view=dict(form="on"), call="refresh.form()   SelectionControl.js:796"),
    dict(action="Type in the labels field", fn=["onLabelsChanged  SelectionControl.js:806"], mkind="events", model=["events.update", "{labels}"],
         view=UPD, rebuild=False, call="refresh.update()   SelectionControl.js:806"),
    dict(action="Drag / resize a box, release", fn=["onObjectModified  OverlayControl.js:3995", "geometry read from the fabric rect"],
         mkind="events", model=["events.update", "{cx, cy, width, height, angle}"], view=dict(chrono="part", overlay="on", form="on"), rebuild=False,
         call="overlayUpdate() + form() [+ chrono() if ROI]   :4006-4008", fb=True,
         note="the rect is the source of the geometry; rect.dragging guard (OverlayControl.js:1376) stops the loop"),
    dict(action="Reset angle / angle from tag", fn=["onClickResetAngle, onClickAngleFromTag  OverlayControl.js:529, 551"],
         mkind="events", model=["events.update", "{angle}"], view=dict(overlay="on", form="on"), rebuild=False, call="overlayUpdate() + form()"),
    dict(action="Choose an alternate tag (zoom view)", fn=["onClickAlternateTag  ZoomView.js:1733", "spreadTagFix  (tag store)"],
         mkind="outside", model=["events.update {tag, id}", "+ tag store edited outside events"], view=UPD, rebuild=False,
         call="refresh.update()   ZoomView.js:1733", note="tag fixes bypass events: the audit cannot see them (DEBT-826, Q34)"),
    dict(action="Rotate the tag (zoom view)", fn=["rotateTag  ZoomView.js:1769", "spreadTagFix  (tag store)"], mkind="outside",
         model=["events.update {tag}", "+ tag store edited outside events"], view=UPD, rebuild=False, call="refresh.update()   ZoomView.js:1769",
         note="same: tag store written outside events (DEBT-826)"),
    dict(action="Edit the parts (zoom view)", fn=["syncToTracks  ZoomView.js:417"], mkind="events", model=["events.update", "{parts}"],
         view=dict(form="on", zoom="on"), call="refresh.form() + refresh.zoom()   ZoomView.js:417-418"),
]

P3 = [
    dict(action="Ctrl-drag a box (create)", fn=["onMouseUp_interactiveRect  OverlayControl.js", "-> submitDraft  SelectionControl.js:462"],
         mkind="events", model=["events.create / commit", "(the draft lives in a fabric rect until validated)"], view=REB,
         call="refresh.rebuild()   SelectionControl.js:462", fb=True, note="draft obs held by a view object, outside the store (ADR 0009, 1e)"),
    dict(action="Ctrl-drag refused (id conflict) or too small", fn=["onMouseDown_interactiveRect  OverlayControl.js:3596, 3609"],
         mkind="none", model=["nothing stored", "the draft is dropped"], view=dict(overlay="on", form="on", widgets="on"), call="refresh.overlayRebuild()"),
    dict(action="Type the id of the new box (Enter)", fn=["onKeyDown_NewIDEdit  labelBee.js:890", "-> storeUnit(.., true) -> submitDraft"],
         mkind="events", model=["events.create / commit"], view=REB, call="refresh.rebuild()   labelBee.js:890"),
    dict(action="Predict mode: click a tag", fn=["onMouseDown_predict  OverlayControl.js:3474", "-> newRectForTag"], mkind="events",
         model=["events.create / commit"], view=REB, call="refresh.rebuild()   OverlayControl.js:3474"),
    dict(action="Toolbar 'new rect for current tag' (LEGACY)", fn=["newRectForCurrentTag  OverlayControl.js:3353"], mkind="events",
         model=["events.create / commit"], view=REB, call="refresh.rebuild()   OverlayControl.js:3353", note="legacy, to retire with the draft rect (ADR 0009, 1e)"),
    dict(action="Pick-frame: Set Start / Set End / swap ids", fn=["doSetSpanStart, doSetSpanEnd, doSwap2  OverlayControl.js:1021-1044"], mkind="events",
         model=["events.update {span} / events.swap"], view=REB, call="refresh.rebuild()   x3"),
    dict(action="Enter the pick-frame mode", fn=["setInteractionMode  OverlayControl.js:222-223"], mkind="events",
         model=["events.update {span}", "default span written at entry (DEBT-825)"],
         view=dict(chrono="on", overlay="part", form="part"), call="hardRefresh() + refresh.chrono() if a span was written", fb=True,
         note="the mode switch still calls hardRefresh directly"),
    dict(action="Modify the span of the selected observation", fn=["modifyCurrentObsSpan  SelectionControl.js:866"], mkind="events",
         model=["events.update", "{span}"], view=dict(chrono="on"), call="refresh.chrono()   SelectionControl.js:866",
         note="mode 'copy' writes a derived span and returns before it (:835-838): no refresh (DEBT-833)"),
]

P4 = [
    dict(action="Delete the selected observation", fn=["deleteEvent  SelectionControl.js:622"], mkind="events", model=["events.delete"], view=REB,
         call="refresh.rebuild()   SelectionControl.js:622"),
    dict(action="Swap two ids (Selected panel)", fn=["swapID_callback / doSwap2  SelectionControl.js:503"], mkind="events", model=["events.swap"], view=REB,
         call="refresh.rebuild()   SelectionControl.js:503"),
    dict(action="Type a new id on the selected box (Enter)", fn=["onKeyDown_IDEdit  labelBee.js:867", "-> storeUnit(.., WrongId.newidTyped)"], mkind="events",
         model=["events: id change"], view=REB, call="refresh.rebuild()   labelBee.js:867"),
    dict(action="New visit", fn=["newVisit  VisitControl.js:94"], mkind="events", model=["events.commit", "{visit, span} + global default_id"], view=REB,
         call="refresh.rebuild()   VisitControl.js:94"),
    dict(action="Set the span of a visit (start / end)", fn=["VisitWidget.setSpanFrame  VisitControl.js:226"], mkind="events", model=["events.update", "{span}"],
         view=REB, call="refresh.rebuild()   VisitControl.js:226", note="was INCOMPLETE (overlay not rebuilt): a span decides which boxes show"),
    dict(kind="c", action="Pick the visited flower", fn=["storeVisitedFlower  VisitControl.js:409"], mkind="events", model=["events.update", "{visit.flowerid}"],
         view=dict(chrono="off", overlay="miss", form="miss", widgets="miss"), call="(no refresh call)   VisitControl.js:410",
         note="INCOMPLETE: nothing shows the new flower until the next refresh; refresh.audit lists it (DEBT-833)"),
    dict(kind="u", action="Undo (unreachable: undo is off, Q33)", fn=["undoAction  SelectionControl.js:646-647"], mkind="events", model=["events.commit", "(undo stack is empty)"], view=LEG,
         call="videoControl.refresh() + refreshChronogram()", note="re-adds the rect by hand; goes with the undo slice"),
]

P5 = [
    dict(action="Delete all false-alarm / wrong-id events", fn=["deleteFalsealarmEvents, deleteWrongIdEvents  ZoomView.js:1941, 1950"], mkind="events",
         model=["events.delete x N", "one notification per event, no batch"], view=REB, call="refresh.rebuild()   ZoomView.js:1941, 1950"),
    dict(action="Clean obsolete events (low DM, excluded tags)", fn=["cleanObsoleteEvents  ChronoControl.js:2049"], mkind="events", model=["events.delete x N"],
         view=REB, call="refresh.rebuild()   ChronoControl.js:2049"),
    dict(kind="c", action="Apply all tag fixes", fn=["bakeAllTagFixes  ZoomView.js:1914"], mkind="outside", model=["tag objects edited in place", "no events notification"],
         view=dict(chrono="on"), call="refreshChronogram()   ZoomView.js:1914", fb=True, note="not a store write: the audit and any notification are blind (DEBT-826, Q34)"),
    dict(kind="c", action="Delete false-alarm tags / undo all tag fixes", fn=["deleteFalsealarmTags  ZoomView.js:1932", "undoAllTagFixes  ZoomView.js:1978"], mkind="outside",
         model=["AnnotationStore.getTags()", "tag store, outside events"], view=dict(chrono="on"), call="refreshChronogram()", note="same: tags live outside events (DEBT-826)"),
    dict(kind="c", action="Open a file, load from the server or CSV", fn=["setTracks, loadEvents, load*CSV*  AnnotationIO.js:362-363, 522-524"], mkind="events",
         model=["events.replace", "+ AnnotationStore (tags, video info)"], view=dict(chrono="on", overlay="on", form="on", widgets="on"),
         call="videoControl.onFrameChanged() + refreshChronogram()", fb=True, note="not on refresh.* yet: onFrameChanged and the chrono refresh run side by side"),
    dict(kind="c", action="Load / edit the separate tags", fn=["setTags, loadTagsCSVFromServer  AnnotationIO.js"], mkind="outside", model=["AnnotationStore.getTags()"],
         view=dict(chrono="on"), call="refreshChronogram()"),
]

P6 = [
    dict(kind="c", action="Chronogram filters and toggles (~16 sites)", fn=["ChronoControl.js:76-476, ChronoControlInteraction.js:453, 478, 504"], mkind="global",
         model=["UI flags", "flag_restrictID, showSpans, hide flowers..."], view=dict(chrono="on"), call="refreshChronogram()"),
    dict(kind="c", action="Change the ROI", fn=["ROIChanged  OverlayControl.js:2702"], mkind="global", model=["ROI, tagsSampleFilterROI", "(then recomputed tag parameters)"],
         view=dict(chrono="on", overlay="on", form="on", widgets="on"), call="refreshChronogram() + videoControl.refresh()", note="refreshOverlay would do for the overlay part"),
    dict(kind="c", action="Exclusion boxes, chrono / tag parameters", fn=["excludeRectsChanged  OverlayControl.js:2798", "onTagsParametersChanged  :3026, :3068"], mkind="global",
         model=["excludeRects, tag parameters", "derived data recomputed by the controller"], view=dict(chrono="on", overlay="on", form="on", widgets="on"),
         call="refreshChronogram() + videoControl.refresh()"),
    dict(kind="c", action="Pan / zoom the video (drag, wheel)", fn=["onMouseDown_panning :3716, :3723  onMouseWheel_Zooming :3850, :3862"], mkind="global",
         model=["canvasTransform"], view=dict(overlay="on", form="on", widgets="on"), call="videoControl.refresh()  on every mouse event",
         note="full rebuild of every rect per mouse move; an overlay update would do (DEBT-836)"),
    dict(kind="c", action="Show / hide tags and tracks", fn=["onShowTagsChanged, onShowTagsTracksChanged  OverlayControl.js:2567, 2572"], mkind="global",
         model=["showTags, showTagsTracks, ..."], view=dict(overlay="on", form="on", widgets="on"), call="videoControl.refresh()"),
    dict(kind="c", action="Change the track window", fn=["onTrackWindowChanged  OverlayControl.js:2606"], mkind="global", model=["overlay.trackWindow"],
         view=dict(chrono="part", overlay="on", form="on", widgets="on"), call="videoControl.refresh() + trigger trackWindow:change", fb=True,
         note="event fan-out to updateTrackWindowSpan, focusTrackWindow (view -> event -> view)"),
    dict(kind="c", action="Move to another frame (play, seek, chronogram click)", fn=["VideoControl.onFrameChanged  VideoControl.js:880-886"], mkind="sel",
         model=["videoControl.currentFrame", "selection.changeFrame(frame)"], view=dict(chrono="part", overlay="on", form="on", zoom="part", widgets="on"),
         call="selection.changeFrame + hardRefresh() + trigger frame:changed", fb=True,
         note="hardRefresh re-activates the selection and shows it once (updateSelectionPanels); 'synchronicity issue?'"),
    dict(action="Ctrl+R, 'show on video' toggle of the zoom view", fn=["onKeyDown  labelBee.js:942", "onToggleButtonShowOnVideo  ZoomView.js:578"], mkind="none",
         model=["nothing"], view=dict(overlay="on", form="on", widgets="on"), call="refresh.overlayRebuild()"),
]

P7 = [
    dict(action="Click a rectangle", fn=["onObjectSelected  OverlayControl.js:3913  (fabric object:selected)", "-> selection.select(frame, id, draft)"], mkind="sel",
         model=["selection.select", "(skipped when selection.is: the echo of setActiveRect)"], view=SEL, rebuild=False,
         call="refresh.selection()   OverlayControl.js:3932", fb=True, note="guard: the echo of a view activating a rect must not refresh again"),
    dict(kind="c", action="Click the background (deselect)", fn=["onMouseDown_selectMultiframe  OverlayControl.js:3619", "-> deselectBee: deactivateAllWithDispatch + selection.clear"], mkind="sel",
         model=["selection.clear"], view=dict(chrono="part", overlay="on", form="on", zoom="part", widgets="on"),
         call="videoControl.refresh()   OverlayControl.js:3684", note="the live path rebuilds; refresh.selection() is only in the dead branch (:3637, DEBT-834)"),
    dict(kind="c", action="Click a track point of another frame / a tag", fn=["selectBeeByIDandFrame  SelectionControl.js:532", "-> selection.select, seekFrame or refresh"], mkind="sel",
         model=["selection.select"], view=dict(chrono="part", overlay="on", form="on", zoom="part", widgets="on"),
         call="videoControl.refresh()   SelectionControl.js:540  (or a seek)", note="same family as above (DEBT-834)"),
    dict(action="Type an id in the ID field (Enter)", fn=["onSelectIDChanged  SelectionControl.js:322"], mkind="sel",
         model=["selection.select"], view=SEL, rebuild=False, call="refresh.selection()   SelectionControl.js:322"),
    dict(action="Click an event in the chronogram", fn=["gotoEvent  ChronoControlInteraction.js:12"], mkind="sel",
         model=["selection.select / changeFrame", "(seek when the frame differs)"], view=SEL, rebuild=False, call="refresh.selection()   ChronoControlInteraction.js:12"),
    dict(action="Next / previous ID", fn=["onClickNextID :445  onClickPrevID :466  onClickNextIDStart :491"], mkind="sel",
         model=["selection.select"], view=SEL, rebuild=False, call="refresh.selection() then refreshChronogram()   :453, 478, 504",
         note="the trailing refreshChronogram() re-runs the chrono part (restrict-ID filters follow the selection)"),
    dict(kind="c", action="Create a box", fn=["submitDraft  SelectionControl.js:462", "-> selection.select(frame, id, draft=true)"], mkind="sel",
         model=["selection.select (draft)", "events.create / commit"], view=REB, call="refresh.rebuild()   SelectionControl.js:462",
         note="fabric activates the new rect first (object:selected -> refresh.selection()), then the rebuild shows it again"),
]


def box(x, y, w, h, lines, stroke="#555", fill="#fff", size=12, red=False, mono=False):
    s = [rect(x, y, w, h, fill, RED if red else stroke, 2 if red else 1.2)]
    for i, ln in enumerate(lines):
        s.append(t(x + 10, y + 20 + i * 16, ln, size if i else size + 1, RED if red and i else "#111", "bold" if i == 0 else "normal", mono=mono and i > 0))
    return "".join(s)


def plain_page(title, sub, idx, total):
    return [f'<rect width="{W}" height="{H}" fill="#fff"/>', DEFS, t(30, 38, title, 24, "#111", "bold"), t(30, 62, sub, 13, "#555"),
            t(W - 30, 38, f"{idx}/{total}", 13, "#888", anchor="end")]


def svg(s):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">' + "".join(s) + "</svg>"


def cascade_page(idx, total):
    s = plain_page("What one rebuild really runs now", "refresh.rebuild() as read in the code (file:line) and measured: refactor/tests/browser/refresh_baseline.json, scenarios create, delete, select", idx, total)
    s.append(box(30, 90, 330, 56, ["refresh.rebuild()", "annotation/Refresh.js: chrono, overlayRebuild, zoom"], GREEN, size=11))
    s.append(arrow(360, 110, 420, 110))
    s.append(box(420, 90, 330, 40, ["refreshChronogram()  (derived data, chronogram, table)"], size=11))
    s.append(arrow(195, 146, 195, 186))
    s.append(box(30, 186, 330, 56, ["videoControl.refresh()", "VideoControl.js:938 = updateVideoControlForm + hardRefresh"], GREEN, size=11))
    s.append(arrow(195, 242, 195, 282))
    s.append(box(30, 282, 330, 56, ["overlay.hardRefresh()", "OverlayControl.js:989"], GREEN, size=11))
    s.append(arrow(360, 300, 420, 300))
    s.append(box(420, 282, 330, 36, ["redrawVideoFrame, canvas1.clear()  (view)"], size=11))
    s.append(f'<line x1="750" y1="300" x2="820" y2="300" stroke="{RED}" stroke-width="2.4" marker-end="url(#ahr)"/>')
    s.append(box(820, 258, 560, 84,["clear() -> fabric discardActiveObject -> onObjectDeselected", "OverlayControl.js:3953: for a draft rect it removes it and calls videoControl.refresh()", "re-entry into the rebuild that is running, invisible to the refresh.* nesting guard", "also: lastActiveRect is not reset for a normal rect; updateDeleteButton() outside any refresh"], red=True, size=10.5))
    s.append(arrow(195, 338, 195, 378))
    s.append(box(30, 378, 330, 56, ["createRectsFromTracks()", "one fabric rect per obs of the frame (view)"], size=11))
    s.append(arrow(195, 434, 195, 474))
    s.append(box(30, 474, 330, 70, ["activate the selection", "setActiveRectID(selection.getId())  (pick-frame: opts.id)", "-> fabric setActiveRect -> object:selected echo"], size=11))
    s.append(arrow(360, 509, 420, 509))
    s.append(box(420, 474, 330, 70, ["onObjectSelected", "selection.is(...) true: the echo changes nothing", "and refreshes nothing (guard, step 6c)"], GREEN, size=11))
    s.append(arrow(195, 544, 195, 584))
    s.append(box(30, 584, 330, 70, ["updateSelectionPanels()", "delete button, form, chrono highlight, ID field,", "form buttons, zoomOverlay.refreshFromSelection"], size=11))
    s.append(arrow(360, 619, 420, 619))
    s.append(box(420, 584, 330, 70, ["zoomOverlay.refreshFromSelection", "calls refreshZoom twice itself (DEBT-712)"], size=11))
    s.append(arrow(195, 654, 195, 694))
    s.append(box(30, 694, 330, 56, ["refreshOverlay()  (update)", "OverlayControl.js:1377, copies obs to rects"], size=11))
    s.append(t(380, 726, "guard: refreshRectFromObs skips a rect with rect.dragging (OverlayControl.js:1376)", 11, "#37474f"))
    s.append(arrow(195, 750, 195, 790))
    s.append(box(30, 790, 330, 40, ["zoomOverlay.refreshZoom()  (step 3 of the rebuild)"], size=11))

    s.append(t(800, 400, "Measured [ran] (refresh_baseline.json)", 15, "#111", "bold"))
    meas = ["select: one selection chain (refresh.selection), refreshZoom x2 inside it",
            "create: TWO selection chains: refresh.selection (onObjectSelected, new rect) then hardRefresh's own (DEBT-832)",
            "delete, swap: updateDeleteButton x3 inside hardRefresh; refreshZoom x2 (selection + rebuild step)",
            "rebuild with a selection: refreshZoom x3 (2 in refreshFromSelection + the rebuild's zoom step)",
            "load, load_csv: onFrameChanged + refreshChronogram side by side, not on refresh.* (Q36)",
            "frame: hardRefresh once, panels once; no chrono refresh (the chronogram reacts to frame:changed)"]
    for i, m in enumerate(meas):
        s.append(t(800, 424 + i * 22, "• " + m, 11.5, "#37474f"))

    s.append(t(30, 870, "Guards that exist today", 16, "#111", "bold"))
    gd = [("refresh.* nesting guard", "a refresh.* call during a refresh is dropped and logged (Refresh.js:28). It does not see videoControl.refresh() or refreshChronogram()."),
          ("refresh.audit(events)", "lists store writes with no refresh.* call in the same task (Refresh.js:67). It watches `events` only, not `selection` and not the tag store."),
          ("selection.is echo guard", "onObjectSelected skips refresh.selection() when the model already holds the target (OverlayControl.js:3925)."),
          ("rect.dragging guard", "refreshRectFromObs does not copy the model into a rect being dragged (OverlayControl.js:1376).")]
    for i, (a, b) in enumerate(gd):
        s.append(t(30, 892 + i * 20, a, 11.5, GREEN, "bold", mono=True))
        s.append(t(300, 892 + i * 20, b, 11.5, "#37474f"))
    footer(s)
    return svg(s)


ISSUES = [
    ("DEBT-830", "onObjectDeselected re-enters a running rebuild", "OverlayControl.js:3953-3970", "[read] code, [inferred] fabric calls it from canvas1.clear()",
     "A draft rect calls videoControl.refresh() while hardRefresh runs; lastActiveRect stays stale for a normal rect; updateDeleteButton() outside a refresh."),
    ("DEBT-831", "A selection write nobody refreshes is silent", "annotation/Refresh.js:67", "[read]",
     "refresh.audit only watches `events`. A writer of `selection` (select, changeFrame, clear) that forgets refresh.selection() is not listed."),
    ("DEBT-832", "Selection chain twice in 'create'; refreshZoom x3", "refactor/tests/browser/refresh_baseline.json", "[ran]",
     "The new rect is activated by fabric (onObjectSelected: refresh.selection()), then submitDraft's rebuild shows the selection again; refreshFromSelection calls refreshZoom twice (DEBT-712)."),
    ("DEBT-833", "Store writes with no refresh", "VisitControl.js:409-411, SelectionControl.js:835-838", "[read]",
     "storeVisitedFlower writes visit.flowerid and refreshes nothing; modifyCurrentObsSpan mode 'copy' writes a derived span and returns first."),
    ("DEBT-834", "Deselect and select-by-frame still rebuild by hand", "OverlayControl.js:3684, SelectionControl.js:540", "[read]",
     "Live path of the background click: deselectBee() + videoControl.refresh(); the refresh.selection() version is in the dead branch (:3637)."),
    ("DEBT-835", "#selectID keeps its text after an explicit deselect", "SelectionControl.js:562", "[read]",
     "updateSelectionPanels skips updateSelectID when the id is null, so the field shows the old id while nothing is selected (kept as before, step 6c)."),
    ("DEBT-836", "Pan / zoom rebuild every rect on every mouse event", "OverlayControl.js:3716, 3723, 3850, 3862", "[read]",
     "videoControl.refresh() per mouse move and wheel tick; the rects exist, only the canvas transform changed."),
    ("DEBT-829", "VisitWidget.open is dead and broken", "VisitControl.js:289-299", "[read]",
     "Nothing calls it; it calls this.getActiveRect() (not a method of VisitWidget, was getActiveObject before 6d) and this.interaction."),
    ("DEBT-837", "Direct calls left in custom code", "grep: videoControl.refresh() ~16, refreshChronogram() ~30, .hardRefresh( ~19", "[read]",
     "UI parameters, chronogram toggles, pan/zoom, tag fixes, loaders: not on refresh.*; each can drift from the sequence of refresh.rebuild()."),
    ("DEBT-828", "refresh.form reads fabric's active rect", "annotation/RefreshBridge.js:12", "[read]",
     "Should read events.get(selection.getKey()); the form depends on the overlay having been activated first."),
]


def issues_page(idx, total):
    s = plain_page("Potential issues found while recording slice 6", "each has a DEBT entry in refactor/intent/debt.md; nothing here was changed by step 7", idx, total)
    for i, (did, title, where, ev, what) in enumerate(ISSUES):
        y = 84 + i * 93
        red = did in ("DEBT-830", "DEBT-831", "DEBT-833")
        s.append(rect(30, y, 1640, 84, "#fff", RED if red else "#999", 1.8 if red else 1.1))
        s.append(t(44, y + 22, did, 13, RED if red else "#111", "bold", mono=True))
        s.append(t(150, y + 22, title, 13.5, "#111", "bold"))
        s.append(t(44, y + 44, where, 11.5, "#37474f", mono=True))
        s.append(t(900, y + 44, ev, 11.5, "#555"))
        s.append(t(44, y + 66, what, 11.5, "#222"))
    s.append(t(30, 1016, "red = a silent failure mode (a write nobody shows, or a re-entry the guards cannot see)", 11, RED))
    return svg(s)


def intro_page(idx, total):
    s = [f'<rect width="{W}" height="{H}" fill="#fff"/>', DEFS, t(30, 44, "LabelBee refresh logic as Controller -> Model -> View", 28, "#111", "bold"),
         t(30, 72, "State after slice 6 steps 6d-6i (commit 0c1d70cb) and step 7. Read from the code (file:line), the browser baseline and ADR 0009; only the baseline counts were run.", 13, "#555")]
    s.append(t(30, 120, "How to read a page", 18, "#111", "bold"))
    y = 150
    for c, lab in [(GREEN, "Green row: the controller calls refresh.* (update, rebuild, form, chrono, zoom, overlayUpdate, overlayRebuild, frame, selection)"),
                   (ORANGE, "Orange row: custom code still calls videoControl.refresh / refreshChronogram / overlay.hardRefresh by hand"),
                   (GREY, "Grey row: unreachable code (undo is off)")]:
        s.append(rect(30, y - 14, 30, 18, "#fff", c, 2.4))
        s.append(t(72, y, lab, 13))
        y += 28
    s.append(t(30, y + 14, "Model column: blue = events store, teal = selection (SelectionModel, global `selection`), purple = UI / global state, red = outside the events (tag store), grey dashed = no change.", 13))
    s.append(t(30, y + 38, "View column: five slots, in this order. Filled = refreshed. Dashed yellow = only indirectly. Red dashed with a cross = should be refreshed and is not.", 13))
    s.append(t(30, y + 62, "Red arrow back from the view to the model, and red text: a feedback or an impurity (write from the view side, event fan-out, state held by a view).", 13, RED))

    s.append(t(30, 370, "What each refresh.* call runs", 18, "#111", "bold"))
    api = [("refresh.update()", dict(chrono="on", overlay="on", form="on", zoom="on"), False, "chrono, overlayUpdate, form, zoom"),
           ("refresh.rebuild()", dict(chrono="on", overlay="on", form="on", zoom="on", widgets="on"), True, "chrono, overlayRebuild, zoom   (a rebuild includes the form, the selection and the widgets)"),
           ("refresh.overlayRebuild()", dict(overlay="on", form="on", widgets="on"), True, "videoControl.refresh = updateVideoControlForm + hardRefresh"),
           ("refresh.overlayUpdate()", dict(overlay="on"), False, "overlay.refreshOverlay: rects exist, copy obs into them"),
           ("refresh.form()", dict(form="on"), False, "updateForm: selection form and event tree"),
           ("refresh.chrono()", dict(chrono="on"), False, "refreshChronogram: derived data, chronogram, table"),
           ("refresh.zoom()", dict(zoom="on"), False, "refreshZoom"),
           ("refresh.frame()", dict(overlay="on", form="on", widgets="on"), True, "onFrameChanged"),
           ("refresh.selection()", dict(chrono="on", overlay="on", form="on", zoom="on"), False, "activateSelection: setActiveRectID(selection.getId()) + updateSelectionPanels; reads the model, writes none")]
    for i, (name, vv, reb, desc) in enumerate(api):
        yy = 392 + i * 38
        s.append(t(30, yy + 20, name, 13, GREEN, "bold", mono=True))
        for k, nm in enumerate(CHIPS):
            xx = 290 + k * 122
            st = vv.get(nm.lower(), "off")
            lab = nm + (" ↻" if nm == "Overlay" and st == "on" and reb else " ~" if nm == "Overlay" and st == "on" else "")
            if st == "on":
                s.append(rect(xx, yy, 116, 30, FILL["on_m"], GREEN, 1.4) + t(xx + 58, yy + 20, lab, 12, "#222", "bold", anchor="middle"))
            else:
                s.append(rect(xx, yy, 116, 30, "#fafafa", "#ddd") + t(xx + 58, yy + 20, nm, 12, "#bbb", anchor="middle"))
        s.append(t(920, yy + 20, desc, 11.5, "#37474f"))
    s.append(t(30, 745, "Overlay ↻ = rebuild (every rect recreated, selection re-activated, form included); Overlay ~ = update (rects exist, values copied).", 12, "#555"))
    s.append(t(30, 764, "Vocabulary (maintainer, 2026-11-18): selected = the model (selection), active = fabric's state owned by the overlay, highlight = the chronogram.", 12, "#555"))

    s.append(t(30, 800, "Pages", 18, "#111", "bold"))
    pages = ["2  Migrated: editing one observation (labels, notes, geometry, angle, tags, parts)", "3  Migrated: creating, spans, pick-frame, span of the selection",
             "4  Delete, swap, id change, visits (migrated); visited flower (no refresh); undo (unreachable)", "5  Bulk deletes (migrated); tag store and load (custom)",
             "6  UI parameters, pan/zoom, frame change (custom); Ctrl+R (migrated)", "7  Selection: the writers of `selection` and what shows it",
             "8  What one rebuild really runs now, measured; the guards", "9  Potential issues found (DEBT-829 to DEBT-837)"]
    for i, p in enumerate(pages):
        s.append(t(40, 824 + i * 19, p, 12.5))
    s.append(t(30, 995, "Call sites (grep, approximate, comments excluded): refresh.* 42; still custom: videoControl.refresh() ~16, refreshChronogram() ~30, .hardRefresh( ~19.", 12, RED))
    footer(s)
    return svg(s)


TOTAL = 9
pages = [
    intro_page(1, TOTAL),
    page("Migrated to refresh.*: editing one observation", "storeUnit writes only; each caller refreshes by what it changed (slice 6 step 4d)", P2, 2, TOTAL),
    page("Migrated to refresh.*: create, spans, pick-frame", "OverlayControl.js writers (step 4e-1), submitDraft and the new-id field (step 4d), the span of the selection", P3, 3, TOTAL),
    page("Delete, swap, id change, visits, undo", "migrated in step 4e; the visited flower and undo are not", P4, 4, TOTAL),
    page("Bulk changes, tag store, load", "events deletes migrated (step 4e); the tag store is outside events (DEBT-826, Q34); loaders in step 5 (Q36)", P5, 5, TOTAL),
    page("UI parameters, pan/zoom, frame change", "no change to the events, section 2 of refactor/design/0009-refresh-triggers.md (explicit calls, later)", P6, 6, TOTAL),
    page("Selection: who writes it, what shows it", "SelectionModel (steps 6b-6e): the controller writes `selection`, then refresh.selection() shows it; the model calls no refresh", P7, 7, TOTAL),
    cascade_page(8, TOTAL),
    issues_page(9, TOTAL),
]
TMP.mkdir(parents=True, exist_ok=True)
files = []
for i, s_ in enumerate(pages, 1):
    p = TMP / f"mvc_{i}.svg"
    p.write_text(s_, encoding="utf-8")
    files.append(str(p))
subprocess.run(["rsvg-convert", "-f", "pdf", "-o", str(OUT)] + files, check=True)
print("wrote", OUT)
