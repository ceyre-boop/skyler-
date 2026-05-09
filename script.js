// Stagger in link buttons for a soft, polished entrance effect.
const linkButtons = document.querySelectorAll(".link-btn");

linkButtons.forEach((button, index) => {
  button.style.opacity = "0";
  button.style.transform = "translateY(8px)";

  window.setTimeout(() => {
    button.style.transition =
      "opacity 280ms ease, transform 280ms ease, box-shadow 160ms ease, background 160ms ease";
    button.style.opacity = "1";
    button.style.transform = "";
  }, 60 + index * 40);
});

// Add current year to footer text while preserving the requested credit.
const footerLabel = document.querySelector(".footer small");
if (footerLabel) {
  footerLabel.textContent = `Built by Colin • ${new Date().getFullYear()}`;
}
