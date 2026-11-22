"""The console-only debug globals `Tracks` and `TracksInfo` (annotation/DebugGlobals.js, slice 4 step 5): off by default, switched on
by `?debug_globals` or `installDebugGlobals()`; the console reads them, page code gets an error. `page.evaluate` stands for the
console (an anonymous stack frame). Page code is a script served from a URL: `add_script_tag(content=...)` would not do, Playwright
runs it through its own evaluate and the frames stay anonymous."""

PAGE_READ = "window.__read = (() => { try { return 'OK ' + typeof Tracks } catch (e) { return 'ERR ' + e.message } })()"


def read_from_a_script(ui, name="probe_script.js"):
    """Run PAGE_READ as a script served from a URL (page code) and return what it saw."""
    ui.page.route(f"**/{name}", lambda route: route.fulfill(content_type="application/javascript", body=PAGE_READ))
    ui.page.add_script_tag(url=f"{ui.base}/{name}")
    ui.page.wait_for_function("window.__read !== undefined")
    return ui.js("window.__read")


def test_h1_off_by_default(ui):
    ui.open()
    assert ui.js("typeof Tracks === 'undefined' && typeof TracksInfo === 'undefined'")
    assert ui.js("typeof installDebugGlobals") == "function"


def test_h2_the_query_switches_them_on_the_console_reads_page_code_gets_an_error(ui, sample_dir):
    ui.open(hash="?debug_globals#video_id=1")
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    assert ui.js("Tracks === events.toObject() && TracksInfo === events.info")
    assert ui.js("Object.keys(Tracks).length") == 8                    # the 8 frames of the sample
    read = read_from_a_script(ui)
    assert read.startswith("ERR ") and "console-only debug global" in read and "probe_script.js" in read, read
    assert ui.js("(() => { try { Tracks = {}; return 'assigned' } catch (e) { return e.message } })()").endswith("use events (events.get, events.getFrame, events.forEach)")


def test_h3_installable_from_the_console(ui):
    ui.open()
    assert ui.js("typeof Tracks") == "undefined"
    ui.js("installDebugGlobals()")
    assert ui.js("Array.isArray(Tracks) || typeof Tracks === 'object'")
    assert "console-only debug global" in read_from_a_script(ui)


def test_h4_the_video_cache_is_a_debug_global_too(ui):
    """`videoCache` (the cache of `videoControl`) is registered by labelbeeBridge.js: off by default, console-only once installed."""
    ui.open()
    assert ui.js("typeof videoCache") == "undefined"
    ui.js("installDebugGlobals()")
    assert ui.js("videoCache === videoControl.videoCache")
