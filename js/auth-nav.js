/**
 * Script para gestionar autenticación y navegación de usuario
 * Incluye: botón de pedidos, dropdown de usuario, y login
 */

function updateAuthLink() {
  const token = localStorage.getItem("authToken");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const loginLink = document.getElementById("auth-link");
  if (!loginLink) return;

  if (token && user) {
    // Usuario logueado: crear dropdown
    const firstName = user.fullName
      ? user.fullName.split(" ")[0]
      : user.email.split("@")[0];

    // Verificar si es admin (case-insensitive)
    const isAdmin = user.role && user.role.toLowerCase() === "admin";

    loginLink.innerHTML = `
      <div class="user-dropdown">
        <button class="user-button" onclick="toggleUserDropdown(event)">
          <div class="user-avatar">${firstName.charAt(0).toUpperCase()}</div>
          <span>${firstName}</span>
          <i class="fas fa-chevron-down"></i>
        </button>
        <div class="dropdown-menu" id="userDropdownMenu">
          ${
            isAdmin
              ? `
            <a href="admin.html" class="admin-link">
              <i class="fas fa-shield-alt"></i> Panel Admin
            </a>
            <hr>
          `
              : ""
          }
          <a href="#" onclick="closeUserDropdown(); openOrdersSidebar(); return false;">
            <i class="fas fa-receipt"></i> Mis Pedidos
          </a>
          <a href="#" onclick="goToProfile(); return false;">
            <i class="fas fa-user"></i> Mi Perfil
          </a>
          <hr>
          <a href="#" onclick="handleLogout(event)">
            <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
          </a>
        </div>
      </div>
    `;
    loginLink.href = "#";
    // Solo prevenir si el clic es directamente en el link, no en los hijos del dropdown
    loginLink.onclick = (e) => {
      if (e.target === loginLink) {
        e.preventDefault();
      }
    };
  } else {
    // Usuario no logueado: mostrar botón de login
    loginLink.innerHTML = `<i class="fas fa-sign-in-alt"></i> Ingresar`;
    loginLink.href = "login.html";
    loginLink.onclick = null;
  }
}

function toggleUserDropdown(event) {
  event.stopPropagation();
  const menu = document.getElementById("userDropdownMenu");
  if (menu) {
    menu.classList.toggle("active");
  }
}

function closeUserDropdown() {
  const menu = document.getElementById("userDropdownMenu");
  if (menu) {
    menu.classList.remove("active");
  }
}

async function handleLogout(event) {
  event.preventDefault();
  const confirmed = await showConfirm({
    title: "Cerrar Sesión",
    message: "¿Estás seguro de que deseas cerrar sesión?",
    confirmText: "Cerrar Sesión",
    cancelText: "Cancelar",
    type: "warning",
  });
  if (confirmed) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }
}

function goToProfile() {
  console.log("📍 Navigating to perfil.html");
  window.location.href = "perfil.html";
}

// Cerrar dropdown al hacer click fuera
document.addEventListener("click", (event) => {
  const dropdown = document.getElementById("userDropdownMenu");
  if (dropdown && dropdown.classList.contains("active")) {
    // Solo cerrar si el click NO es en el dropdown o en el botón de usuario
    const isClickInsideDropdown = event.target.closest(".dropdown-menu");
    const isClickOnButton = event.target.closest(".user-button");

    if (!isClickInsideDropdown && !isClickOnButton) {
      closeUserDropdown();
    }
  }
});

// Ejecutar al cargar
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    updateAuthLink();
  });
} else {
  updateAuthLink();
}

window.updateAuthLink = updateAuthLink;
window.toggleUserDropdown = toggleUserDropdown;
window.closeUserDropdown = closeUserDropdown;
window.handleLogout = handleLogout;
window.goToProfile = goToProfile;

// Navbar scroll logic (Shared)
window.addEventListener("scroll", () => {
  const nav = document.querySelector("nav");
  if (nav) {
    if (window.scrollY > 20) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }
});
