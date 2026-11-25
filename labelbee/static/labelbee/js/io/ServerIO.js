/*
 * io/ServerIO: the requests to the server and nothing else (refactor slice 8 step 14d, ADR 0016). Moved unchanged from
 * the former annotation/ServerIO.js (`ajaxGetJSON`, `getJSONPromise`), plus the two requests that were inline there: the CSV fetch and the
 * POST of a record. Each returns a Promise of the payload, and a failed request rejects with `{jqXHR, textStatus, errorThrown}`
 * (`ajaxGetJSON`, `ajaxPostJSON`) or the jQuery failure (`getJSONPromise`). No format knowledge, no message to the user, no store:
 * the flows of commands/LoadFromServer.js decode the payload, apply it and report.
 *
 * DEBT: globals read at call time: `$`, `d3`.
 */

// Resolves with the JSON of the response; rejects with {jqXHR, textStatus, errorThrown}
export function ajaxGetJSON(url) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      url: url,
      type: "GET",
      contentType: "application/json",
      data: "",
      success: resolve,
      error: function (jqXHR, textStatus, errorThrown) {
        reject({ jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown });
      },
    });
  });
}
export function getJSONPromise(url) {
  return new Promise(function (resolve, reject) {
    $.getJSON(url).done(resolve).fail(reject);
  });
}

// Resolves with the JSON of the response (the record created is `json.data`); rejects like ajaxGetJSON
export function ajaxPostJSON(url, data) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      url: url,
      type: "POST", //passing data as post method
      data: data, //form values OLD : JSON.stringify({ video: getVideoInfo().videoName, data: data })
      dataType: 'json',
      success: resolve,
      error: function (jqXHR, textStatus, errorThrown) {
        reject({ jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown });
      },
    });
  });
}

// Resolves with the rows (objects keyed by the header) of the CSV file at `url`
export function fetchCSVRows(url) {
  return d3.csv(url);
}
