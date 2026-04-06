const views = document.querySelectorAll(".view");

export function goToView(viewId) {
  views.forEach((view) => view.classList.remove("active"));
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add("active");
  }
}
