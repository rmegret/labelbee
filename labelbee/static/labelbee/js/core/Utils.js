/*
 * Utils: small helpers with no state of their own (refactor slice 8 step 3, ADR 0015). Moved as is from labelBee.js;
 * no behavior change. `url_for` and `htmlCheckmark` are installed as globals by labelbeeBridge.js for the classic
 * scripts that still call them; `pathJoin` has no caller left.
 *
 * DEBT: `url_for` reads the page's global `http_script_name` (set by `init()` in labelBee.js), at call time.
 */

export function htmlCheckmark(flag) {
  let checkStr = "<span class='gray'>?</span>";
  if (typeof flag != "undefined") {
    if (flag == "requested") checkStr = "<span>&#x231a;</span>";
    else if (flag) checkStr = "<span class='green'>&#x2713;</span>";
    else checkStr = "<span class='red'>&times;</span>";
  }
  return checkStr;
}

export var pathJoin = function (pathArr) {
  return pathArr
    .map(function (path) {
      if (path[0] === "/") {
        path = path.slice(1);
      }
      if (path[path.length - 1] === "/") {
        path = path.slice(0, path.length - 1);
      }
      return path;
    })
    .join("/");
};

export function url_for(path) {
  if (path[0] == "/") path = path.slice(1);
  let route = http_script_name + path;
  return route;
}
