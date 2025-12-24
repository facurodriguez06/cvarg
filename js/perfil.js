// Navbar scroll effect - forzar siempre con fondo
const navbar = document.getElementById("navbar");
if (navbar) {
  navbar.classList.add("scrolled");
}

// Cargar datos del usuario
document.addEventListener("DOMContentLoaded", () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    window.location.href = "login.html?redirect=perfil.html";
    return;
  }

  const user = JSON.parse(userStr);

  // Actualizar header
  document.getElementById("profileName").textContent =
    user.fullName || "Usuario";
  document.getElementById("profileEmail").textContent = user.email || "";

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
    : "U";
  document.getElementById("avatarText").textContent = initials.toUpperCase();

  // Cargar foto si existe
  const profilePhoto = localStorage.getItem("profilePhoto");
  if (profilePhoto) {
    document.getElementById("avatarImage").src = profilePhoto;
    document.getElementById("avatarImage").style.display = "block";
    document.getElementById("avatarText").style.display = "none";
  }

  // Cargar formulario
  document.getElementById("fullName").value = user.fullName || "";
  document.getElementById("email").value = user.email || "";
  document.getElementById("phone").value = user.phone || "";
  document.getElementById("dni").value = user.dni || "";
  document.getElementById("address").value = user.address || "";

  // Cargar estadísticas (mock por ahora)
  loadStats();
  loadRecentOrders();
});

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validar que sea imagen
  if (!file.type.startsWith("image/")) {
    alert("Por favor selecciona un archivo de imagen");
    return;
  }

  // Validar tamaño (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert("La imagen debe ser menor a 2MB");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const imageData = e.target.result;

    // Guardar en localStorage
    localStorage.setItem("profilePhoto", imageData);

    // Mostrar imagen
    document.getElementById("avatarImage").src = imageData;
    document.getElementById("avatarImage").style.display = "block";
    document.getElementById("avatarText").style.display = "none";

    console.log("✅ Profile photo updated");
  };

  reader.readAsDataURL(file);
}

function loadStats() {
  // TODO: Obtener del backend
  document.getElementById("totalOrders").textContent = "3";
  document.getElementById("completedOrders").textContent = "2";
  document.getElementById("totalSpent").textContent = "$25,000";
}

function loadRecentOrders() {
  // TODO: Obtener del backend
  const container = document.getElementById("recentOrders");
  // Por ahora dejamos el mensaje por defecto
}

function enableEdit() {
  const inputs = document.querySelectorAll("#profileForm input");
  inputs.forEach((input) => {
    if (input.id !== "email") {
      // Email no editable
      input.disabled = false;
    }
  });

  document.getElementById("editButtons").style.display = "none";
  document.getElementById("saveButtons").style.display = "block";
}

function cancelEdit() {
  const inputs = document.querySelectorAll("#profileForm input");
  inputs.forEach((input) => (input.disabled = true));

  document.getElementById("editButtons").style.display = "block";
  document.getElementById("saveButtons").style.display = "none";

  // Recargar datos originales
  location.reload();
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const updatedData = {
    fullName: document.getElementById("fullName").value,
    phone: document.getElementById("phone").value,
    dni: document.getElementById("dni").value,
    address: document.getElementById("address").value,
  };

  try {
    // TODO: Guardar en backend
    const user = JSON.parse(localStorage.getItem("user"));
    const updatedUser = { ...user, ...updatedData };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    alert("Perfil actualizado correctamente");

    const inputs = document.querySelectorAll("#profileForm input");
    inputs.forEach((input) => (input.disabled = true));

    document.getElementById("editButtons").style.display = "block";
    document.getElementById("saveButtons").style.display = "none";

    // Actualizar header
    document.getElementById("profileName").textContent = updatedData.fullName;
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Error al actualizar el perfil");
  }
});
