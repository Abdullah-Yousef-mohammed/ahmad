document.addEventListener("submit", function (event) {
  var form = event.target.closest("[data-verify]");
  if (!form) return;
  event.preventDefault();
  var id = String(new FormData(form).get("id") || "").trim();
  if (!id) return;
  window.location.href = "portal.html#verify/" + encodeURIComponent(id);
});
