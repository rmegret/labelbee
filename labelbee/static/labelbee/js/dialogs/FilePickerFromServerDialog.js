/*jshint esversion: 6, asi: true */
// The dialog that picks a file in a directory of the server (`/rest/...` listing, preview, load) (ES module, refactor slice 8 step 13c, ADR 0015), moved unchanged from labelBee.js.
// Used by dialogs/EventsCSVManualFilePicker.js and video/VideoList.js (imports). Page globals read at call time: `url_for`...

export function FilePickerFromServerDialog() {

  //#region INIT, OPEN, CLOSE FilePickerFromServerDialog

  this.dialogName = "FilePickerFromServerDialog";
  this.divId = "#dialog-filepicker-from-server";
  this.route = null;
  this.hideOnSuccess = true;

  var theDialog = this;
  this.div = $(this.divId);
  var div = this.div;
  if (!div.length) {
    console.log(
      "FilePickerFromServerDialog: ERROR, could not find div " + this.divId
    );
  }

  this.initDialog = function (params) {
    // Only internal settings. Nothing stored to DOM dialog
    theDialog.route = params.base_uri;

    // Two mechanisms: either a function to load the file, or a callback to content
    theDialog.loadFileFunction = params.loadFileFunction // gets the URI
    theDialog.fileLoadedCallback = params.fileLoadedCallback; // download, then pass the content

    theDialog.dialogName = params.dialogName
      ? params.dialogName
      : "Pick File from Server";

    if ("hideOnSuccess" in params)
      theDialog.hideOnSuccess = params.hideOnSuccess;
    else theDialog.hideOnSuccess = true;

    // Optional: schema detection of the files (see EventsCSVManualFilePicker in AnnotationIO.js):
    //   categories() -> [{key, label, loadable}], classify(uri) -> {key, label, loadable} or null,
    //   inspect(uri) -> Promise<detection result of CsvSchemas.detectSchema>
    theDialog.schemaProvider = params.schemaProvider ? params.schemaProvider : null;
  };
  
  this.openDialog = function () {
    console.log(
      "FilePickerFromServerDialog: openDialog, dialogName=",
      theDialog.dialogName
    );

    if (!div.length) {
      console.log(
        "FilePickerFromServerDialog: ERROR, could not find div " + this.divId
      );
      return;
    }
    if (!theDialog.route) {
      console.log("FilePickerFromServerDialog: no route defined. abort");
      return;
    }

    // Reset it each time we open it
    div.modal({
      show: false,
      autoOpen: false,
      modal: true,
      open: function () {
        $("body").css("overflow", "auto");
      },
      close: function () {
        $("body").css("overflow", "auto");
      },
    });
    div.find(".modal-dialog").draggable({
      handle: ".modal-header",
    });
    div.find(".modal-content").resizable({
      alsoResize: ".modal-content",
      minHeight: 300,
      minWidth: 300,
    });

    div.find(".modal-title").html(theDialog.dialogName);

    div.find(".dir-uri-btn").off("click").on("click", theDialog.onClickLoad);

    div
      .find(".dir-uri-btn-preview")
      .off("click")
      .on("click", theDialog.onClickPreview);

    theDialog.setupFilter();

    div.find(".modal-body").html("[...]");
    div
      .find(".modal-message")
      .html("<div>Loading file list from server. Please wait...</div>");

    div.modal("show");

    this.updateDialog();
  };

  this.closeDialog = function () {
    div.find(".dir-uri-btn").off("click");
    div.modal("hide");
    //this.route = null
  };

  //#endregion

  // #region UPDATE FilePickerFromServerDialog

  this.updateDialog = function (uri) {
    console.log(
      'FilePickerFromServerDialog: importing file list from URL "' +
      this.route +
      "'..."
    );

    let route = this.route;
    if (!!uri) {
      route = uri;
    }

    var data = { format: "json" };
    $.ajax({
      url: url_for(route),
      type: "GET",
      contentType: "application/json",
      dataType: "json",
      data: data,
      success: function (json) {
        // Get the file list in JSON format

        console.log("FilePickerFromServerDialog: ajax SUCCESS\njson=", json);
        theDialog.json = json;

        if (
          typeof json != "object" ||
          !("files" in json) ||
          !("dirs" in json)
        ) {
          div.find(".modal-body").html("No valid JSON");
          div.find(".modal-message").html("Format error in server response");
          return;
        }

        let listdiv = div.find(".modal-body").html("");

        //let html = ""
        for (let item of json.files) {

          if (theDialog.schemaProvider != null) {
            listdiv.append(theDialog.makeSchemaFileRow(item));
            continue;
          }
          
          // Use direct download uri if defined (faster download)
          // Otherwise, use the uri to the api (less efficient)
          if (item['download_uri'] != null) {
            //let button2 = $("<button class='btn-xs btn-default'>Direct download</button>");
            let button2 = $("<button>" + item["filename"] + " [data]</button>");
            button2.attr("data-uri", item["download_uri"]);
            button2.on("click", theDialog.onClickFile);
            listdiv.append(button2);
          } else {
            let button = $("<button>" + item["filename"] + "[api]</button>");
            button.attr("data-uri", item["uri"]);
            button.on("click", theDialog.onClickFile);
            listdiv.append(button);
          }

          listdiv.append($("<br>"));

          //html += '<button onclick="filePickerFromServerDialog.onClickFile(' + "'" + item['uri'] + "'" + ')">' + item['filename'] + '</button> <br>'
        }

        for (let item of json.dirs) {
          let button = $("<button>" + item["filename"] + "</button>");
          button.attr("data-uri", item["uri"]);
          button.on("click", theDialog.onClickDir);

          listdiv.append(button);
          listdiv.append($("<br>"));

          //html += '<button onclick="filePickerFromServerDialog.onClickDir(' + "'" + item['uri'] + "'" + ')">' + item['filename'] + '</button> <br>'
        }

        div.find(".dir-uri-text").val(route);

        div.find(".modal-message").html("");
        theDialog.applyFilter();

        // Nothing else to do here:
        // The modal #loadTracksFromServerDialog is supposed to be open
        // and filled with links to each Track file
        // Clicking on one of the link will trigger eventsFromServer()
      },
      error: function (data) {
          console.log('ajax received', data)
          typesetAjaxError(
            "FilePickerFromServerDialog: ERROR",
            function (html) {
              div.find(".modal-message").html(html);
            }
          )
        }
    });
  };

  // #endregion

  // #region ACTIONS FilePickerFromServerDialog

  this.onClickDir = function (evt) {
    console.log("FilePickerFromServerDialog: onClickDir " + evt);
    console.log(evt.target);
    const uri = $(evt.target).attr("data-uri");

    console.log("FilePickerFromServerDialog: change directory uri=" + uri);

    theDialog.updateDialog(uri);
  };
  
  this.onClickFile = function (evt) {
    console.log("FilePickerFromServerDialog: onClickFile ", evt);
    console.log(evt.target);
    const uri = $(evt.target).attr("data-uri");

    div.find(".dir-uri-text").val(uri);
    theDialog.previewFile(null);
    if (theDialog.schemaProvider != null) theDialog.validateFile(uri);
    //theDialog.loadFile(uri)
  };

  // #region SCHEMA DETECTION (only with a schemaProvider)

  this.setupFilter = function () {
    const provider = theDialog.schemaProvider;
    const box = div.find(".modal-filter");
    if (provider == null) {
      box.hide();
      return;
    }
    const select = box.find(".file-filter-type");
    const previous = select.val();
    select.empty();
    select.append($("<option>").attr("value", "").text("All files"));
    select.append($("<option>").attr("value", "*loadable").text("Loadable only"));
    for (const cat of provider.categories()) {
      select.append($("<option>").attr("value", cat.key).text(cat.label + (cat.loadable ? "" : " (no loader)")));
    }
    if (previous != null) select.val(previous);
    select.off("change").on("change", theDialog.applyFilter);
    box.show();
  };

  this.applyFilter = function () {
    if (theDialog.schemaProvider == null) return;
    const wanted = div.find(".file-filter-type").val() || "";
    div.find(".file-row").each(function () {
      const row = $(this);
      let show = true;
      if (wanted === "*loadable") show = row.attr("data-loadable") === "true";
      else if (wanted !== "") show = row.attr("data-category") === wanted;
      row.toggle(show);
    });
  };

  this.makeSchemaFileRow = function (item) {
    const uri = item["download_uri"] != null ? item["download_uri"] : item["uri"];
    const cat = theDialog.schemaProvider.classify(item["filename"]);
    const row = $("<div class='file-row'>");
    row.attr("data-category", cat ? cat.key : "");
    row.attr("data-loadable", cat && cat.loadable ? "true" : "false");
    const button = $("<button>").text(item["filename"] + (item["download_uri"] != null ? " [data]" : "[api]"));
    button.attr("data-uri", uri);
    button.on("click", theDialog.onClickFile);
    row.append(button);
    if (cat) {
      row.append($("<span class='file-schema-badge'>").toggleClass("loadable", cat.loadable)
        .attr("data-schema", cat.key)
        .attr("title", cat.loadable ? "Schema from the suffix; loadable" : "Schema from the suffix; no loader yet")
        .text(cat.label));
    }
    return row;
  };

  // Show the detected schema and the column validation of the file in the message area
  this.validateFile = function (uri) {
    const msg = div.find(".modal-message");
    msg.html("Reading header of " + $("<span>").text(uri).html() + "...");
    return theDialog.schemaProvider.inspect(uri).then(function (res) {
      if (div.find(".dir-uri-text").val() !== uri) return res; // another file was clicked meanwhile
      msg.empty().append(theDialog.describeDetection(res));
      return res;
    }).catch(function (e) {
      msg.empty().append($("<div class='file-schema-validation'>").append(
        $("<span class='bad'>").text("Could not read the header: " + e.message)));
      throw e;
    });
  };

  // Table "LabelBee field | CSV columns | rule": how the columns are adapted, the unused ones in the `ignored` row
  this.mappingTableElement = function (rows) {
    const table = $("<table class='file-schema-mapping'>");
    table.append($("<tr>").append($("<th>").text("LabelBee field"), $("<th>").text("CSV columns"), $("<th>").text("Conversion")));
    rows.forEach(function (r) {
      table.append($("<tr>").addClass("map-" + r.status).toggleClass("map-ignored", r.field === "ignored").append(
        $("<td>").text(r.field), $("<td>").text(r.show), $("<td>").text(r.rule)));
    });
    return table;
  };

  this.describeDetection = function (res) {
    const box = $("<div class='file-schema-validation'>");
    const ok = res.canLoad && res.status === "ok";
    box.append($("<div>").append($("<span>").addClass(ok ? "ok" : "bad").text(
      (ok ? "Valid. " : res.canLoad ? "Loadable with a different schema. " : "Not loadable. ") + res.message)));
    if (res.chosen) {
      box.append($("<div>").text("Schema: " + res.chosen.label + " (" + res.chosen.key + ")"
        + (res.chosen.loader ? ", loader '" + res.chosen.loader + "'" : "") + ". " + res.chosen.note));
    }
    box.append($("<div>").text(res.columns.length + " columns"));
    if (res.mapping) box.append(theDialog.mappingTableElement(res.mapping));
    return box;
  };

  // #endregion

  this.onClickLoad = function (evt) {
    console.log("FilePickerFromServerDialog: onClickLoad ", evt);
    const uri = div.find(".dir-uri-text").val();

    theDialog.loadFile(uri);
  };
  this.onClickPreview = function (evt) {
    console.log("FilePickerFromServerDialog: onClickPreview ", evt);
    const uri = div.find(".dir-uri-text").val();

    theDialog.previewFile(uri);
  };
  this.loadFile = function (uri) {
    console.log(
      "FilePickerFromServerDialog: importing file from URL '" + uri + "'..."
    );

    if (this.loadFileFunction != null) {
      this.loadFileFunction(uri)
      return
    }

    div.find(".modal-message").html("Loading file from " + uri + "...");

    $.ajax({
      url: uri,
      type: "GET", //passing data as post method
      contentType: "plain/text",
      error: showAjaxError(
        "FilePickerFromServerDialog.onClickFile: Ajax ERROR"
      ),
      success: function (content) {
        console.log("FilePickerFromServerDialog: GET " + uri + " ajax SUCCESS");
        console.log("content=", content);

        try {
          theDialog.fileLoadedCallback(uri, content);
        } catch (e) {
          console.log(
            "FilePickerFromServerDialog: error parsing file content. See error:",
            e
          );
          return;
        }

        console.log("FilePickerFromServerDialog: file loaded");
        div.find(".modal-message").html("File loaded.");

        if (theDialog.hideOnSuccess) {
          div
            .find(".modal-message")
            .html("FilePickerFromServerDialog: File loaded. Closing.");
          theDialog.closeDialog();
        }
      },
    });
  };
  this.previewFile = function (uri) {
    console.log(
      "FilePickerFromServerDialog: preview file from URL '" + uri + "'..."
    );
    if (uri == null) {
      div.find(".modal-message").html("");
      return;
    }

    div.find(".modal-message").html("Loading file from " + uri + "...");

    $.ajax({
      url: uri,
      type: "GET", //passing data as post method
      contentType: "plain/text",
      error: showAjaxError(
        "FilePickerFromServerDialog.previewFile: Ajax ERROR"
      ),
      success: function (content) {
        console.log("FilePickerFromServerDialog: GET " + uri + " ajax SUCCESS");
        console.log("content=", content);

        console.log("FilePickerFromServerDialog: file loaded");
        div.find(".modal-message").append($("<pre>").text(content));
      },
    });
  };
  // #endregion

  //this.initDialog(params)
}
