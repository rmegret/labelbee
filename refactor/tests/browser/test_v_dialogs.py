"""The server dialogs of dialogs/ (slice 8 step 13c): the "from /data" picker on the sample_gurabo folder, the advanced list of
annotation files of the database (FromServerDialog), and the label-list dialog (LabelListFromServerDialog). Simple tests: each
dialog opens, lists what the dev webapp serves, and its main action works. The loading of CSV files is covered by test_k."""
import json


def open_picker(ui, folder):
    ui.open_subpanel("Server storage")
    ui.page.click("a[onclick*='pickEventsCSVDialog']")
    ui.page.wait_for_selector(".modal.in")
    ui.page.click(".modal.in button:has-text('%s/')" % folder)
    ui.page.wait_for_selector(".modal.in .file-row")


def test_v1_picker_lists_the_files_of_sample_gurabo(ui):
    ui.open()
    open_picker(ui, "sample_gurabo")
    names = ui.page.locator(".modal.in .file-row").all_inner_texts()
    for suffix in (".events.csv", ".detections.csv"):
        assert any(n.startswith("sample_gurabo.cfr.mp4" + suffix) for n in names), (suffix, names)


def test_v2_picker_navigates_into_a_folder_and_closes(ui):
    ui.open()
    ui.open_subpanel("Server storage")
    ui.page.click("a[onclick*='pickEventsCSVDialog']")
    ui.page.wait_for_selector(".modal.in")
    folders = ui.page.locator(".modal.in button:has-text('/')").all_inner_texts()
    assert "sample_gurabo/" in folders and "sample/" in folders, folders
    ui.page.click(".modal.in button:has-text('sample_gurabo/')")
    ui.page.wait_for_selector(".modal.in .file-row")
    ui.page.click(".modal.in .modal-footer button:has-text('Close')")
    ui.page.wait_for_selector(".modal.in", state="detached")
    assert ui.n_observations() == 0      # closed: nothing loaded


def test_v3_advanced_list_shows_the_annotations_of_the_database(ui):
    ui.allow(r"sort_(both|asc|desc)\.png")     # DataTables sort icons: images/ is not served by the dev webapp
    ui.open()
    ui.js("fromServerDialog.openRecentLoadingDialog('event')")
    ui.page.wait_for_selector("#from-server-dialog", state="visible")
    ui.js("fromServerDialog.showAdvancedLoadingDialog(false)")
    ui.page.wait_for_selector("#from-server-dialog #TagOrEventFileListFromServer tbody tr")
    text = ui.page.inner_text("#from-server-dialog")
    assert "events_v2.json" in text and "Advanced event loading menu" in text
    ui.page.click("#from-server-dialog button:has-text('Load #4')")
    ui.page.wait_for_function("Object.keys(events.toObject()).length > 0")
    assert ui.n_observations() == 13
    assert "Events loaded." in ui.page.inner_text("#from-server-dialog .modal-message")


def test_v4_advanced_list_switches_to_tags(ui):
    ui.allow(r"sort_(both|asc|desc)\.png")
    ui.open()
    ui.js("fromServerDialog.openRecentLoadingDialog('event')")
    ui.page.wait_for_selector("#from-server-dialog", state="visible")
    ui.js("fromServerDialog.showAdvancedLoadingDialog(false)")
    ui.page.wait_for_selector("#from-server-dialog #TagOrEventFileListFromServer tbody tr")
    ui.page.select_option("#from-server-dialog #DropdownElement", "tag")
    ui.page.wait_for_function("fromServerDialog.data_type == 'tag'")
    assert "Advanced tag loading menu" in ui.page.inner_text("#from-server-dialog")


LABELS = {"labelButtonsArray": [
    {"label": "gurabo-a", "description": "first label of the sample"},
    {"label": "gurabo-b", "description": "second label of the sample"},
]}


def test_v5_label_list_dialog_lists_navigates_and_loads(ui):
    # the dev webapp has no /rest/config/labellist/: the routes are answered by the test
    def answer(route):
        url = route.request.url.split("?")[0]
        if url.endswith("labels.json"):
            body = LABELS
        elif url.endswith("/sub"):
            body = {"files": [{"filename": "inner.json", "uri": "/rest/config/labellist/inner.json"}], "dirs": []}
        else:
            body = {"files": [{"filename": "labels.json", "uri": "/rest/config/labellist/labels.json"}],
                    "dirs": [{"filename": "sub/", "uri": "/rest/config/labellist/sub"}]}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(body))
    ui.page.route("**/rest/config/labellist/**", answer)
    ui.open()
    ui.js("labelListFromServerDialog.openDialog()")
    dialog = "#dialog-labellist-from-server"
    ui.page.wait_for_selector(dialog + " button:has-text('labels.json')")
    ui.page.click(dialog + " button:has-text('sub/')")
    ui.page.wait_for_selector(dialog + " button:has-text('inner.json')")
    ui.js("labelListFromServerDialog.updateDialog()")
    ui.page.click(dialog + " button:has-text('labels.json')")
    ui.page.wait_for_function("labelButtonsArray.length == 2 && labelButtonsArray[0].label == 'gurabo-a'")
    ui.page.wait_for_selector(dialog, state="hidden")
