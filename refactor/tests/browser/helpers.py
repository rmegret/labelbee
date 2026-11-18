"""Helpers of the browser tests: `App` wraps a Playwright page opened on the dev webapp (see conftest.py)."""
import json
import re
import time
from pathlib import Path

# Requests the dev webapp cannot answer and the page makes at every start (not findings)
KNOWN_404 = (
    "/data/tags/tag25h5inv/",  # tag family files: not part of the dev webapp data
)


class App:
    def __init__(self, page, base_url, tmp_path):
        self.page = page
        self.base = base_url
        self.tmp = Path(tmp_path)
        self.console_errors = []   # console.error texts, resource 404s excluded (listed in not_found)
        self.page_errors = []      # uncaught exceptions and unhandled promise rejections
        self.not_found = []        # URLs answered 404
        self.dialogs = []          # native alert/confirm/prompt: (type, message)
        self.dialog_accepts = True  # False: confirm() is answered "Cancel"
        self.prompt_answers = []   # answers given to prompt(), in order
        self.allowed = []          # regexes of errors the test expects (the [fail] items of the checklist)
        self._video_loaded_at = None   # when the page logged onVideoLoaded2 (see settle())
        page.on("console", self._on_console)
        page.on("pageerror", lambda e: self.page_errors.append(str(e)))
        page.on("response", lambda r: self.not_found.append(r.url) if r.status == 404 else None)
        page.on("dialog", self._on_dialog)

    # ---- watchers
    def _on_console(self, msg):
        if msg.text.startswith("onVideoLoaded2"):
            self._video_loaded_at = time.monotonic()
        if msg.type == "error" and not msg.text.startswith("Failed to load resource"):
            self.console_errors.append(msg.text)

    def _on_dialog(self, d):
        self.dialogs.append((d.type, d.message))
        if d.type == "prompt":
            d.accept(self.prompt_answers.pop(0)) if self.prompt_answers else d.dismiss()
        elif self.dialog_accepts:
            d.accept()
        else:
            d.dismiss()

    def allow(self, *patterns):
        """Declare the errors this test provokes on purpose (regexes searched in the error text)."""
        self.allowed.extend(patterns)

    def unexpected_errors(self):
        def ok(text):
            return any(re.search(p, text, re.S) for p in self.allowed)
        found = [f"console.error: {t}" for t in self.console_errors if not ok(t)]
        found += [f"pageerror: {t}" for t in self.page_errors if not ok(t)]
        found += [f"404: {u}" for u in self.not_found if not any(k in u for k in KNOWN_404) and not ok(f"404: {u}")]
        return found

    def assert_clean(self):
        errors = self.unexpected_errors()
        assert not errors, "unexpected errors in the page:\n  " + "\n  ".join(errors)

    # ---- opening
    def open(self, hash="#video_id=1", wait_video=True):
        self.page.goto(f"{self.base}/labelbee/gui{hash}", wait_until="load")
        self.page.wait_for_function("window.AnnotationStore && window.videoControl && window.videoManager")
        if wait_video:
            self.wait_video()
        return self

    def wait_video(self, timeout=15000):
        self.page.wait_for_function("videoControl.video && videoControl.video.readyState >= 2 && videoinfo && videoinfo.nframes", timeout=timeout)

    def js(self, expression, arg=None):
        return self.page.evaluate(expression, arg)

    # ---- the annotation model (what the user cannot read directly)
    def tracks(self):
        return self.js("JSON.parse(JSON.stringify(events.toObject()))")

    def tracks_info(self):
        return self.js("JSON.parse(JSON.stringify(events.info || null))")

    def tags(self):
        return self.js("JSON.parse(JSON.stringify(AnnotationStore.getTags()))")

    def tags_have_dm(self):
        return self.js("AnnotationStore.getTagsHaveDM()")

    def n_observations(self):
        return self.js("Object.values(events.toObject()).reduce((n, f) => n + (f ? Object.keys(f).length : 0), 0)")

    def frame(self):
        return self.js("videoControl.getCurrentFrame()")

    def wait_tracks(self, predicate="n > 0", timeout=5000):
        self.page.wait_for_function(
            "() => { const n = Object.values(events.toObject()).reduce((a, f) => a + (f ? Object.keys(f).length : 0), 0); return (" + predicate + "); }",
            timeout=timeout)

    # ---- loading files through the real file inputs
    def load_events(self, path):
        self.page.set_input_files("#load", str(path))

    def load_tags(self, path):
        self.page.set_input_files("#loadtags", str(path))

    def write(self, name, content):
        p = self.tmp / name
        p.write_text(content if isinstance(content, str) else json.dumps(content))
        return p

    # ---- alerts
    def main_alert(self):
        """Text of the main alert modal when it is open, else None."""
        loc = self.page.locator("#mainAlertDialog")
        if loc.is_visible():
            return self.page.inner_text("#mainAlertDialog .modal-body")
        return None

    def wait_main_alert(self, contains="", timeout=5000):
        self.page.wait_for_selector(f"#mainAlertDialog .modal-body:has-text({json.dumps(contains)})", state="visible", timeout=timeout)
        return self.main_alert()

    def close_main_alert(self):
        """Click the "Close" button of the main alert, as a user does, and wait until it is gone."""
        self.page.click("#mainAlertDialog .modal-footer button")
        self.page.wait_for_selector("#mainAlertDialog", state="hidden")

    # ---- downloads
    def download(self, click_selector=None, js=None, name="download"):
        """Trigger a download by a click (or a js expression) and return the saved file path."""
        with self.page.expect_download() as dl:
            if click_selector:
                self.page.click(click_selector)
            else:
                self.js(js)
        out = self.tmp / (name + "_" + dl.value.suggested_filename)
        dl.value.save_as(str(out))
        return out

    def save_events_v2(self):
        """Click "Save Events (JSON v2)" and return the parsed file (opens the panels that hold the button)."""
        self.open_panel("I/O")
        self.open_subpanel("Local storage")
        return json.loads(self.download(click_selector="#save", name="events").read_text())

    # ---- panels: the right column is a jQuery-UI accordion, most controls are hidden until their panel is open
    def open_panel(self, title):
        """Open a top-level accordion panel ("Annotations", "I/O", "Features", "Zoom", "Options", "Labeling", ...)."""
        header = self.page.locator("#right-side .ui-accordion-header", has_text=title).first
        if header.get_attribute("aria-expanded") != "true":
            header.click()
            self.page.wait_for_function("(h) => h.getAttribute('aria-expanded') === 'true'", arg=header.element_handle())

    def open_subpanel(self, title):
        """Open a collapsible sub-panel ("Events info", "Local storage", "Server storage", "Parts labeling", ...)."""
        label = self.page.locator(".subpanel.collapsible > label", has_text=title).first
        # open the collapsed accordion panels that contain it, outermost first
        for header_id in label.evaluate("""(l) => { const ids = []; for (let e = l; e; e = e.parentElement) {
              if (e.classList && e.classList.contains('ui-accordion-content')) {
                const h = e.previousElementSibling;
                if (h && h.getAttribute('aria-expanded') === 'false') ids.unshift(h.id); } } return ids; }"""):
            self.page.click("#" + header_id)
            self.page.wait_for_function("(id) => document.getElementById(id).getAttribute('aria-expanded') === 'true'", arg=header_id)
        shown = label.evaluate("(l) => !!l.nextElementSibling && getComputedStyle(l.nextElementSibling).display !== 'none'")
        if not shown:
            label.click()
            self.page.wait_for_function("(l) => getComputedStyle(l.nextElementSibling).display !== 'none'", arg=label.element_handle())

    # ---- the overlay (a fabric.js canvas, overlay.canvas1) and the frame
    def settle(self, ms=800):
        """Wait until the refresh that the page schedules 500 ms after a video is loaded has run
        (VideoControl.js onVideoLoaded2: setTimeout(hardRefresh, 500)). It rebuilds the fabric objects, so a click or a drag
        started just before it can hit a box that no longer exists (it made the drag test fail about 1 run in 8)."""
        if self._video_loaded_at is not None:
            left = ms / 1000 - (time.monotonic() - self._video_loaded_at)
            if left > 0:
                self.page.wait_for_timeout(int(left * 1000))

    def box_center(self, obs_id):
        """Client coordinates of the centre of the box of observation `obs_id` in the current frame."""
        pos = self.js("""(id) => {
          const o = overlay.canvas1.getObjects().find(o => o.obs && String(o.obs.ID) === String(id));
          if (!o) return null;
          const r = document.querySelector('.upper-canvas').getBoundingClientRect(), bb = o.getBoundingRect();
          return {x: r.x + bb.left + bb.width / 2, y: r.y + bb.top + bb.height / 2};
        }""", obs_id)
        assert pos, f"no box for id {obs_id} in frame {self.frame()}"
        return pos

    def boxes(self):
        """Ids of the boxes drawn on the current frame."""
        return self.js("overlay.canvas1.getObjects().filter(o => o.obs).map(o => String(o.obs.ID))")

    def click_box(self, obs_id):
        self.settle()
        p = self.box_center(obs_id)
        self.page.mouse.click(p["x"], p["y"])
        self.page.wait_for_function("(id) => String(selection.getId()) === String(id)", arg=str(obs_id))

    def video_to_client(self, x, y):
        """Client coordinates of the point (x, y) of the video (the overlay maps video units to canvas pixels)."""
        return self.js("""([x, y]) => { const p = overlay.videoToCanvasPoint({x, y});
          const r = document.querySelector('.upper-canvas').getBoundingClientRect(); return {x: r.x + p.x, y: r.y + p.y}; }""", [x, y])

    def control(self, obs_id, name):
        """Client coordinates of a fabric control (tl, tr, bl, br, mtr) of the rectangle of observation obs_id."""
        return self.js("""([id, name]) => { const o = overlay.canvas1.getObjects().find(o => o.obs && String(o.obs.ID) === String(id));
          o.setCoords(); const c = o.oCoords[name]; const r = document.querySelector('.upper-canvas').getBoundingClientRect();
          return c ? {x: r.x + c.x, y: r.y + c.y} : null; }""", [obs_id, name])

    def drag(self, a, b, steps=4):
        """Press at client point a, move to b through an intermediate point, release."""
        self.page.mouse.move(a["x"], a["y"])
        self.page.mouse.down()
        self.page.mouse.move((a["x"] + b["x"]) / 2, (a["y"] + b["y"]) / 2, steps=steps)
        self.page.mouse.move(b["x"], b["y"], steps=steps)
        self.page.mouse.up()

    def video_scale(self):
        """Video units per client pixel of the overlay (the video is drawn scaled)."""
        return self.js("overlay.canvasToVideoRect({left: 0, top: 0, width: 1, height: 1}).width")

    def canvas_rect(self):
        return self.js("(() => { const r = document.querySelector('.upper-canvas').getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; })()")

    def shift_click_background(self, fx=0.1, fy=0.9):
        """Shift-click on the background (fractions of the video area): creates a new observation."""
        self.settle()
        r = self.canvas_rect()
        self.page.keyboard.down("Shift")
        self.page.mouse.click(r["x"] + fx * r["w"], r["y"] + fy * r["h"])
        self.page.keyboard.up("Shift")

    def selected_id(self):
        return self.js("selection.getId()")

    def goto_frame(self, n):
        """Type the frame number in the frame box, as a user does, and wait for the video to be there."""
        self.page.fill("#currentFrame", str(n))
        self.page.press("#currentFrame", "Enter")
        self.page.wait_for_function("(n) => videoControl.getCurrentFrame() === n", arg=int(n))
