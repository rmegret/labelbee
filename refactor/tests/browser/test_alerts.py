"""The main alert modal (`mainAlert` in AnnotationIO.js, used by every load error). Finding F3 of README.md, fixed."""


def test_f3_an_alert_opened_while_the_previous_one_fades_out_still_appears(ui):
    """Bootstrap 3 lost a modal shown while the previous one was still hiding: its pending hide ran after the new show,
    hid it again and left the backdrop. The page now waits for the end of the hide."""
    ui.open()
    ui.mod("core/Alerts.js", "M.mainAlert('first')")
    ui.page.wait_for_selector("#mainAlertDialog", state="visible")
    ui.page.click("#mainAlertDialog .modal-footer button")          # the real Close button
    ui.mod("core/Alerts.js", "M.mainAlert('second')")                                    # right away, the first one is still fading out
    assert "second" in ui.wait_main_alert("second")
    ui.close_main_alert()
    ui.page.wait_for_function("document.querySelectorAll('.modal-backdrop').length === 0")   # no stuck backdrop


def test_f3_alerts_in_quick_succession_all_get_their_turn(ui):
    ui.open()
    for n in range(4):
        ui.mod("core/Alerts.js", "M.mainAlert('alert %d')" % n)
        assert ("alert %d" % n) in ui.wait_main_alert("alert %d" % n)
        ui.page.click("#mainAlertDialog .modal-footer button")      # close and go straight on to the next one
    ui.mod("core/Alerts.js", "M.mainAlert('last')")
    assert "last" in ui.wait_main_alert("last")
    ui.close_main_alert()
    ui.page.wait_for_function("document.querySelectorAll('.modal-backdrop').length === 0")


def test_a_second_alert_while_one_is_open_replaces_its_text(ui):
    """Unchanged behaviour: there is one modal, so a second message replaces the first while it is shown."""
    ui.open()
    ui.mod("core/Alerts.js", "(M.mainAlert('one'), M.mainAlert('two'))")
    text = ui.wait_main_alert("two")
    assert "one" not in text
    ui.close_main_alert()
