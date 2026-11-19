// NavMenu: the burger menu of the navbar. The group burger + logo + name (#menu-trigger)
// opens/closes the menu (#main-menu: user, log in/out, quit). Layout only.
(function () {
  $(function () {
    var trigger = document.getElementById("menu-trigger");
    var menu = document.getElementById("main-menu");
    if (!trigger || !menu) return;

    function setOpen(open) {
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    }
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(menu.hidden);
    });
    // Close on click outside, and on any control of the menu (log in/out open a dialog),
    // except the user refresh button of #whoami, which keeps the menu open to show the result
    document.addEventListener("click", function (e) {
      if (menu.hidden) return;
      if (menu.contains(e.target) && (!e.target.closest("button, a") || e.target.closest("[title='Refresh user info']"))) return;
      setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { setOpen(false); trigger.focus(); }
    });
  });
})();
