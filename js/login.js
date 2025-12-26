const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const verifyForm = document.getElementById("verifyForm");
const errorMsg = document.getElementById("errorMessage");
const successMsg = document.getElementById("successMessage");

function showTab(tab) {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((t) => t.classList.remove("active"));

  if (tab === "login") {
    tabs[0].classList.add("active");
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    verifyForm.style.display = "none";
  } else {
    tabs[1].classList.add("active");
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    verifyForm.style.display = "none";
  }

  hideMessages();
}

function showVerification(email) {
  loginForm.style.display = "none";
  registerForm.style.display = "none";
  verifyForm.style.display = "block";
  document.getElementById("verifyEmailHidden").value = email;
  document.getElementById("verifyEmailDisplay").textContent = email;
  document.getElementById("verifyCode").value = "";
  document.getElementById("verifyCode").focus();

  // Desactivar tabs
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((t) => t.classList.remove("active"));
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
  const redirect = params.get("redirect") || "index.html";

  if (redirect === "admin") {
    return "admin.html";
  }

  if (!redirect.includes(".")) {
    return redirect + ".html";
  }

  return redirect;
}

// 1. INICIO DE SESIÓN
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
    // Si el error indica que necesita verificación
    if (
      error.message.includes("verificada") ||
      error.message.includes("verificación")
    ) {
      // Intentar obtener el email del error (aunque no siempre viene)
      // Usamos el del input
      const email = document.getElementById("loginEmail").value;
      showError(error.message);
      setTimeout(() => {
        showVerification(email);
        hideMessages();
      }, 2000);
    } else {
      showError(error.message || "Error al iniciar sesión");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

// 2. REGISTRO
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

    const response = await api.register(userData);

    if (response.requiresVerification) {
      showSuccess(response.message);
      setTimeout(() => {
        showVerification(response.email);
        hideMessages(); // Ocultar mensaje de éxito para mostrar el form limpio o dejarlo? Mejor dejarlo un momento.
      }, 1500);
    } else {
      // Fallback para registro local o sin verificación
      showSuccess("¡Cuenta creada! Redirigiendo...");
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, 1000);
    }
  } catch (error) {
    if (error.message.includes("pendiente de verificación")) {
      showError(error.message);
      const email = document.getElementById("registerEmail").value;
      setTimeout(() => {
        showVerification(email);
      }, 2000);
    } else {
      showError(error.message || "Error al crear cuenta");
    }
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

// 3. VERIFICACIÓN DE CÓDIGO
verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessages();

  const btn = verifyForm.querySelector(".btn-submit");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
  btn.disabled = true;

  try {
    const email = document.getElementById("verifyEmailHidden").value;
    const code = document.getElementById("verifyCode").value;

    await api.verifyEmail(email, code);

    showSuccess("¡Cuenta verificada con éxito! Redirigiendo...");
    setTimeout(() => {
      window.location.href = getRedirectUrl();
    }, 1500);
  } catch (error) {
    showError(error.message || "Código incorrecto o expirado");
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

// 4. REENVIAR CÓDIGO
async function resendCode(e) {
  e.preventDefault();
  const email = document.getElementById("verifyEmailHidden").value;
  const link = document.getElementById("resendLink");

  if (!email) return;

  link.style.pointerEvents = "none";
  link.textContent = "Enviando...";

  try {
    await api.resendVerificationCode(email);
    showSuccess("Nuevo código enviado a tu email");
    setTimeout(() => hideMessages(), 3000);
  } catch (error) {
    showError(error.message || "Error al reenviar código");
  } finally {
    link.style.pointerEvents = "auto";
    link.innerHTML =
      '<i class="fas fa-sync-alt"></i> ¿No recibiste el código? Reenviar';
  }
}
