/*
 * Alerts: the main alert modal, the display of a failed load and the AJAX error callbacks (refactor slice 8 steps 6c and 14c,
 * ADR 0015, 0016). `mainAlert` and the AJAX error callbacks moved from annotation/ServerIO.js, `reportLoadError` from
 * commands/Load.js (slice 3, ADR 0005, Q23). Shared by the file and the server loaders and the dialogs; it knows nothing of the
 * data. `mainAlert` and the AJAX error callbacks are installed as globals by labelbeeBridge.js.
 *
 * DEBT: globals read at call time: `$`, `fromServerDialog` (the load error goes to its message area while it is open).
 */

export function mainAlert(text) {
  var modal = $("#mainAlertDialog");
  var bs = modal.data("bs.modal");
  // Bootstrap 3 loses a modal opened while the previous one is still fading out: its pending hide runs after the
  // new show and hides it again, leaving the backdrop. While a hide is in progress, wait for it to finish.
  var hiding = bs && !bs.isShown && (bs.$backdrop || modal.is(":visible"));
  var show = function () {
    $("#mainAlertDialog .modal-body").html(text);
    modal.modal("show");
  };
  if (hiding) {
    modal.one("hidden.bs.modal", show);
  } else {
    show();
  }
}

/* LOAD ERRORS (refactor ADR 0005, Q23): a failed load is told to the user, in the from-server dialog when
 * it is open, else in the main alert, and the rejection goes on to whoever awaits the loader. */
function escapeHTML(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function showLoadError(what, error) {
  console.error(what, error);
  var html = "ERROR " + escapeHTML(what) + "<br>" + escapeHTML((error && error.message) || error);
  if ($("#from-server-dialog").is(":visible")) {
    fromServerDialog.setMessage("red", html);
  } else {
    mainAlert(html);
  }
}
// To be used as the last `.catch` of a loader pipeline
export function reportLoadError(what) {
  return function (error) {
    showLoadError(what, error);
    throw error;
  };
}

/* AJAX ERRORS (moved from annotation/ServerIO.js, slice 8 step 14c, ADR 0016 rule 7): the `error` callbacks of $.ajax. `typesetAjaxError`
 * hands the formatted HTML to a hook, `showAjaxError` shows it in the main alert (or only logs it). */
export function typesetAjaxError(title, hook) {
  var callback = function (jqXHR, textStatus, errorThrown) {
    console.log(
      "AJAX ERROR: " + title,
      jqXHR,
      textStatus,
      errorThrown,
      jqXHR.responseText
    );
    if (hook) {
      var html =
        "<div>" +
        title +
        "<br>Status: " +
        textStatus +
        "<br>Error: " +
        errorThrown +
        "<br>" +
        jqXHR.responseText +
        "</div>";
      hook(html);
    }
  };
  return callback;
}
export function showAjaxError(title, prehook, onlyConsole) {
    var callback = function(jqXHR, textStatus, errorThrown) {
        console.log('AJAX ERROR: '+title, jqXHR, textStatus, errorThrown, jqXHR.responseText)
        if (prehook) {
            prehook(jqXHR, textStatus, errorThrown)
        }
        if (!onlyConsole) {
            mainAlert(title
                    +'<br>Status: '+ textStatus
                    +'<br>Error: '+ errorThrown
                    +'<br>'+ jqXHR.responseText
            )
        }
    }
    return callback
}
