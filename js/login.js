const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const errorMsg = document.getElementById("errorMessage");
const successMsg = document.getElementById("successMessage");

function showTab(tab) {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((t) => t.classList.remove("active"));

  if (tab === "login") {
    tabs[0].classList.add("active");
    loginForm.style.display = "block";
    registerForm.style.display = "none";
  } else {
    tabs[1].classList.add("active");
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  }

  hideMessages();
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.style.display = "block";
  successMsg.style.display = "none";
}

function showSuccess(message) {
  successMsg.textContent = message;
  successMsg.style.display = "block";
  errorMsg.style.display = "none";
}

function hideMessages() {
  errorMsg.style.display = "none";
  successMsg.style.display = "none";
}

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "index.html";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessages();

  const btn = loginForm.querySelector(".btn-submit");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
  btn.disabled = true;

  try {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    await api.login(email, password);

    showSuccess("¡Bienvenido! Redirigiendo...");
    setTimeout(() => {
      window.location.href = getRedirectUrl();
    }, 1000);
  } catch (error) {
    showError(error.message || "Error al iniciar sesión");
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessages();

  const btn = registerForm.querySelector(".btn-submit");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando cuenta...';
  btn.disabled = true;

  try {
    const userData = {
      email: document.getElementById("registerEmail").value,
      password: document.getElementById("registerPassword").value,
      fullName: document.getElementById("registerName").value,
      phone: document.getElementById("registerPhone").value,
    };

    await api.register(userData);

    showSuccess("¡Cuenta creada! Redirigiendo...");
    setTimeout(() => {
      window.location.href = getRedirectUrl();
    }, 1000);
  } catch (error) {
    showError(error.message || "Error al crear cuenta");
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

if (api && api.isAuthenticated && api.isAuthenticated()) {
  window.location.href = getRedirectUrl();
}
