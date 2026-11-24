/*
 * LocalFile: the browser side of a local file, nothing else (refactor slice 8 step 14d, ADR 0016): read a File as text (`FileReader`),
 * hand a Blob to the user as a download (a hidden link as only DOM). Moved unchanged from commands/LoadFromFile.js (`readFileAsText`)
 * and commands/SaveToFile.js (`saveBlobToFile`, `saveObjToJsonFile`, `saveCSVToFile`). No format knowledge, no message to the user:
 * the callers (LoadFromFile.js, SaveToFile.js, VideoList.js) choose the content, name the file and report the failure.
 * `saveObjToJsonFile` and `saveCSVToFile` are installed as globals by labelbeeBridge.js (VideoList.js).
 */

export function readFileAsText(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (event) {
      resolve(event.target.result);
    };
    reader.onerror = function () {
      reject(reader.error);
    };
    reader.readAsText(file);
  });
}

export function saveBlobToFile(blob, filename) {
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.hidden = true;
  document.body.appendChild(a);
  a.href = url;
  a.download = filename;
  a.click();
  console.log("saveBlobToFile: waiting for user to save to file");
  //window.URL.revokeObjectURL(url);
  console.log("saveBlobToFile: done");

  // New simplified API?
  //saveAs(blob, filename)
}
export function saveObjToJsonFile(obj, filename) {
  var json = JSON.stringify(obj);

  var blob = new Blob([json], {
    type: "text/json",
  });

  saveBlobToFile(blob, filename);
}
export function saveCSVToFile(txt, filename) {
  var blob = new Blob([txt], {
    type: "text/csv",
  });
  saveBlobToFile(blob, filename);
}
