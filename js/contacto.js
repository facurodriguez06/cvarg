// Navbar Scroll
window.addEventListener("scroll", function () {
  var navbar = document.getElementById("navbar");
  if (window.scrollY > 50) navbar.classList.add("scrolled");
  else navbar.classList.remove("scrolled");
});

// Menu Mobile
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("active");
  const icon = menuToggle.querySelector("i");
  icon.classList.toggle("fa-bars");
  icon.classList.toggle("fa-times");
});

// Cart Logic - Sincronizado con temp_cart
function updateCartCounter() {
  try {
    let cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
    let total = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
    const badge = document.getElementById("cart-count");
    if (badge) {
      badge.innerText = total;
      badge.style.display = total === 0 ? "none" : "flex";
    }
  } catch (error) {
    console.error("Error updating counter:", error);
  }
}

document.addEventListener("DOMContentLoaded", updateCartCounter);

// --- LÓGICA DEL SLIDER (ORIGINAL) ---
const container = document.getElementById("compContainer");
const layerAfter = document.getElementById("layerAfter");
const handle = document.getElementById("sliderHandle");

window.addEventListener("load", () => {
  layerAfter.style.width = "50%";
  handle.style.left = "50%";
});

const moveSlider = (e) => {
  const rect = container.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  let x = clientX - rect.left;

  if (x < 0) x = 0;
  if (x > rect.width) x = rect.width;

  const percent = (x / rect.width) * 100;
  layerAfter.style.width = `${percent}%`;
  handle.style.left = `${percent}%`;
};

container.addEventListener("mousemove", moveSlider);
container.addEventListener("touchmove", moveSlider);
