"""Item E1 of tests/CHECKLIST.md: the console must stay clean. Every test already checks it at teardown (conftest.py `ui`);
these tests prove that the watcher itself notices what it is supposed to notice."""


def test_e1_an_uncaught_error_is_noticed(ui):
    ui.open()
    ui.js("setTimeout(() => { throw new Error('boom-uncaught') })")
    ui.page.wait_for_timeout(300)
    assert any("boom-uncaught" in e for e in ui.unexpected_errors())
    ui.allow("boom-uncaught")                      # declared: the teardown check must now pass
    assert ui.unexpected_errors() == []


def test_e1_a_console_error_is_noticed(ui):
    ui.open()
    ui.js("console.error('boom-console')")
    assert any("boom-console" in e for e in ui.unexpected_errors())
    ui.allow("boom-console")


def test_e1_an_unhandled_promise_rejection_is_noticed(ui):
    ui.open()
    ui.js("(() => { Promise.reject(new Error('boom-promise')); })()")      # not returned: Playwright would await it
    ui.page.wait_for_timeout(300)
    assert any("boom-promise" in e for e in ui.unexpected_errors())
    ui.allow("boom-promise")


def test_e1_an_unexpected_404_is_noticed_but_the_known_ones_are_not(ui):
    ui.open()
    ui.js("fetch('/no-such-file.txt')")
    ui.page.wait_for_timeout(300)
    assert any("/no-such-file.txt" in e for e in ui.unexpected_errors())
    assert not any("tag25h5" in e for e in ui.unexpected_errors())     # the tag family files the dev webapp does not have
    ui.allow(r"no-such-file")


def test_e1_a_clean_run_has_no_errors(ui, sample_dir):
    ui.open()
    ui.load_events(sample_dir / "events_v2.json")
    ui.wait_tracks()
    assert ui.unexpected_errors() == []
