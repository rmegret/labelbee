/*jshint esversion: 6, asi: true */
import { url_for } from '../core/Utils.js'

// The login of the page: the login dialog, the log out, and `whoami` (the user info of the navigation bar, which enables the buttons that
// need the server). ES module (refactor slice 8 step 13b, ADR 0015), moved from AnnotationIO.js.
// The state of the user belongs to this module: `getUserData()` (the answer of `/auth/whoami`) and `getUserId()` (set when authenticated,
// kept after a log out as before), read by video/VideoList.js and commands/SaveToServer.js. Nothing is on `window`: the buttons of the
// navigation bar are built by `whoami` and handled by `initLogin` (delegated click on `#whoami`).
// Page globals read at call time: `url_for`.

let userData = { is_authenticated: false }
let userId // undefined until a user is authenticated
let loginDialog // LoginDialog, built by initLogin

export function getUserData() { return userData }
export function getUserId() { return userId }

// Builds the login dialog, handles the buttons of #whoami and refreshes the user status. Called by `init()` of labelBee.js.
export function initLogin() {
  loginDialog = new LoginDialog();
  // How the buttons of #whoami work: `whoami()` rebuilds them as HTML strings at each answer of the server, each tagged with an
  // attribute such as `data-login-action="logout"` (a custom `data-*` attribute: only the prefix is HTML, the name and the values
  // are ours; `this.dataset.loginAction` reads it). Instead of an inline `onclick`, which would need a global function, one
  // listener on the permanent #whoami catches the clicks of whatever button is inside it now (jQuery delegation: the selector
  // `[data-login-action]` is matched at click time, so the rebuilt buttons keep working) and calls the function named by the tag.
  $("#whoami").on("click", "[data-login-action]", function () {
    const actions = { whoami, login: try_login, logout: try_logout };
    actions[this.dataset.loginAction]();
  });
  whoami(); // Refresh user status
}

function ajaxlogin(email, password) {
  var url = url_for("/api/v1/auth/login");

  //console.log(url)
  console.log("ajaxlogin, email=", email);

  $.ajax({
    url: url, //server url
    type: "POST", //passing data as post method
    //contentType: 'application/json', // returning data as json
    data: { email: email, password: password }, //form values
    success: function (json) {
      console.log("ajaxlogin: json=", json);
      if (json.status == "SUCCESS") {
        whoami();
        loginDialog.closeDialog();
      } else {
        console.log("ajaxlogin: ERROR json=", json);
        loginDialog.message("ERROR: " + json.message);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log("ajaxlogin: ERROR ", textStatus, errorThrown, jqXHR);
      loginDialog.message(
        "ERROR: " + textStatus + " " + errorThrown + " " + jqXHR.responseText
      );
    },
  });
}

function ajaxlogout(email, password) {
  var url = url_for("/api/v1/auth/logout");

  //console.log(url)

  $.ajax({
    url: url, //server url
    type: "POST", //passing data as post method
    success: function (json) {
      console.log("ajaxlogout: json=", json);
      if (json.status == "SUCCESS") {
        whoami();
      } else {
        console.log("ajaxlogout: ERROR json=", json);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log("ajaxlogout: ERROR ", textStatus, errorThrown, jqXHR);
    },
  });
}

function LoginDialog() {
  this.div = $("#dialog-login");

  this.openDialog = function () {
    let div = this.div;

    console.log("LoginDialog.openDialog");

    loginDialog.message("");
    div.dialog("open");
  };
  this.initDialog = function () {
    let that = this;
    let div = this.div;

    div.dialog({
      autoOpen: false,
      title: "Login",
      modal: true,
      width: 335,
      buttons: {
        Ok: function () {
          var email = div.find('input[id="email"]').val();
          var password = div.find('input[id="password"]').val();
          var tmp = $(this);
          ajaxlogin(email, password, function () {
            console.log("test");
            tmp.dialog("close");
          });
        },
        Cancel: function () {
          $(this).dialog("close");
        },
      },
      open: function () {
        $("body").css("overflow", "hidden");
      },
      close: function () {
        $("body").css("overflow", "auto");
      },
    });
  };
  this.closeDialog = function () {
    this.div.dialog("close");
  };
  this.message = function (html) {
    this.div.find("#message").html(html);
  };

  this.initDialog();
}

function try_login() {
  console.log("try_login: Open Login Dialog");
  loginDialog.openDialog();
}

function try_logout() {
  if (confirm("Confirm log out?")) {
    ajaxlogout();
  } else {
    console.log("User canceled log out");
  }
}

function whoami() {
  $.getJSON(url_for("/api/v1/auth/whoami"), function (data) {
    console.log("whoami: data=", data);
    userData = data;
  })
    .done(function (data) {
      //$('#whoami').html(JSON.stringify(data))
      if (data.is_authenticated) {
        $("#whoami").html(
          '<button data-login-action="whoami" type="button" class="btn btn-black btn-xs" title="Refresh user info"><span class="glyphicon glyphicon-refresh small"></span></button>'+
          " Logged as " +
            data.first_name +
            ' <button data-login-action="logout" type="button" class="btn btn-black btn-xs" title="Log out current user">Log out</button>'
        );
        userId = data.id
        $(".require-server").toggleClass("disabled", false);
      } else {
        $("#whoami").html(
          '<button data-login-action="login" type="button" class="btn btn-success btn-xs" title="Log in">Log in</button>'
        );
        $(".require-server").toggleClass("disabled", true);
      }
    })
    .fail(function (data) {
      console.log("whoami: ERROR", data);
      $("#whoami").html(
        '<button data-login-action="whoami" type="button" class="btn btn-black btn-xs" title="Refresh user info"><span class="glyphicon glyphicon-refresh small"></span></button>'+
        " No connection " +
          '<button data-login-action="login" type="button" class="btn btn-success btn-xs" title="Log in">Log in</button>'
      );
      $(".require-server").toggleClass("disabled", true);
    });
}
