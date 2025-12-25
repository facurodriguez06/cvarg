let currentStep = 1;
const totalSteps = 6;

// DEBUG: Detectar recargas de página
console.log("🔄 formulario.js CARGANDO - Paso inicial:", currentStep);
window.addEventListener("beforeunload", function (e) {
  console.warn("⚠️ PÁGINA INTENTANDO RECARGAR!");
  // Descomentar la siguiente línea para ver confirmación antes de recargar:
  // e.preventDefault(); e.returnValue = '';
});

// =========================================
// SISTEMA DE NOTIFICACIONES
// =========================================
function showFormToast(message, type = "error") {
  const existing = document.querySelector(".form-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `form-toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${
      type === "error"
        ? "fa-exclamation-circle"
        : type === "success"
        ? "fa-check-circle"
        : "fa-info-circle"
    }"></i>
    <span>${message}</span>
    <button type="button" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 5000);
}

// =========================================
// NAVEGACIÓN Y VALIDACIÓN
// =========================================
function changeStep(direction) {
  // DETENER CUALQUIER INTENTO DE SUBMIT NATIVO
  if (window.event) {
    window.event.preventDefault();
    window.event.stopPropagation();
  }

  const nextStep = currentStep + direction;

  // -- VALIDACIÓN AL AVANZAR --
  if (direction === 1) {
    const currentPanel = document.getElementById(`step${currentStep}`);
    const requiredInputs = currentPanel.querySelectorAll(
      "input[required], select[required], textarea[required]"
    );
    let isValid = true;

    requiredInputs.forEach((input) => {
      // Validar solo si es visible (evita validar pasos ocultos)
      if (input.offsetParent !== null && !input.value.trim()) {
        isValid = false;
        input.classList.add("error");
        input.addEventListener("input", function () {
          if (this.value.trim()) this.classList.remove("error");
        });
      } else if (input.offsetParent !== null) {
        input.classList.remove("error");
      }
    });

    // Validación específica Paso 6 (Checkboxes)
    if (currentStep === 6) {
      const hardChecked =
        document.querySelectorAll('input[name="hardSkills"]:checked').length >
        0;
      const softChecked =
        document.querySelectorAll('input[name="softSkills"]:checked').length >
        0;
      const hardCont = document.getElementById("hardSkillsContainer");
      const softCont = document.getElementById("softSkillsContainer");

      if (!hardChecked) {
        isValid = false;
        hardCont.classList.add("error");
      } else {
        hardCont.classList.remove("error");
      }

      if (!softChecked) {
        isValid = false;
        softCont.classList.add("error");
      } else {
        softCont.classList.remove("error");
      }
    }

    if (!isValid) {
      showFormToast(
        "Por favor completa los campos obligatorios (*) marcados en rojo.",
        "error"
      );
      return; // Detiene la ejecución aquí si no es válido
    }
  }

  // -- LOGICA DE CAMBIO DE PASO --
  if (nextStep > 0 && nextStep <= totalSteps) {
    // Cambio visual de paso
    document.getElementById(`step${currentStep}`).classList.remove("active");
    document.getElementById(`step${nextStep}`).classList.add("active");
    currentStep = nextStep;
    updateUI();
    window.scrollTo(0, 0);
  } else if (nextStep > totalSteps) {
    // SI ES EL ÚLTIMO PASO, EJECUTAMOS EL ENVÍO
    submitForm();
  }
}

function updateUI() {
  const progress = (currentStep / totalSteps) * 100;
  document.getElementById("progressBar").style.width = `${progress}%`;
  document.getElementById(
    "stepCounter"
  ).innerText = `Paso ${currentStep} de ${totalSteps}`;

  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");

  btnPrev.style.visibility = currentStep === 1 ? "hidden" : "visible";

  if (currentStep === totalSteps) {
    btnNext.innerHTML = 'Finalizar <i class="fas fa-check"></i>';
    btnNext.style.backgroundColor = "var(--success)";
  } else {
    btnNext.innerHTML = 'Siguiente <i class="fas fa-arrow-right"></i>';
    btnNext.style.backgroundColor = "var(--primary-blue)";
  }
}

function toggleField(fieldId, show) {
  document.getElementById(fieldId).style.display = show ? "block" : "none";
}

function previewPhoto(input) {
  console.log("📸 previewPhoto llamada, archivos:", input.files?.length);
  if (input.files && input.files[0]) {
    const file = input.files[0];
    console.log(
      "📸 Archivo seleccionado:",
      file.name,
      file.size,
      "bytes",
      file.type
    );
    const reader = new FileReader();
    reader.onload = function (e) {
      console.log("📸 FileReader completado, mostrando preview");
      document.getElementById("previewImg").src = e.target.result;
      document.getElementById("previewImg").style.display = "block";
      document.querySelector(".photo-preview i").style.display = "none";
    };
    reader.onerror = function (e) {
      console.error("❌ FileReader error:", e);
    };
    reader.readAsDataURL(file);
  }
}

// =========================================
// LÓGICA DE ENVÍO (BLINDADA)
// =========================================
async function submitForm() {
  // Doble seguridad para evitar recargas
  if (window.event) {
    window.event.preventDefault();
    window.event.stopPropagation();
  }

  const btn = document.getElementById("btnNext");
  const originalBtnContent = btn.innerHTML;

  // Estado de carga visual
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  btn.disabled = true;
  btn.style.opacity = "0.7";

  try {
    // 1. Validar Sesión
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error(
        "No has iniciado sesión. Por favor, ingresa a tu cuenta."
      );
    }

    const form = document.getElementById("cvForm");
    const apiData = new FormData();

    // -- Recolección de Datos Personales (campos individuales) --
    const nombres = form.nombres.value.trim();
    const apellidos = form.apellidos.value.trim();
    const fullName = `${nombres} ${apellidos}`.trim();

    apiData.append("fullName", fullName);
    apiData.append("nombres", nombres);
    apiData.append("apellidos", apellidos);
    apiData.append("edad", form.edad?.value || "");
    apiData.append("nacionalidad", form.nacionalidad?.value || "");
    apiData.append("estadoCivil", form.estadoCivil?.value || "");
    apiData.append("email", form.email.value);
    apiData.append("phone", form.telefono.value);
    apiData.append("dni", form.dni.value);
    apiData.append("city", form.provincia.value);
    apiData.append("birthDate", form.fechaNacimiento.value);

    // CUIL
    const hasCuilRadio = form.querySelector('input[name="hasCuil"]:checked');
    const hasCuil = hasCuilRadio && hasCuilRadio.value === "si";
    if (hasCuil && form.cuil?.value) {
      apiData.append("cuil", form.cuil.value);
    }

    // LinkedIn
    const hasLinkedinRadio = form.querySelector(
      'input[name="hasLinkedin"]:checked'
    );
    const hasLinkedin = hasLinkedinRadio && hasLinkedinRadio.value === "si";
    if (hasLinkedin && form.linkLinkedin?.value) {
      apiData.append("linkedin", form.linkLinkedin.value);
    }

    // -- Experiencia (campos individuales) --
    apiData.append("disponibilidad", form.disponibilidad?.value || "");
    apiData.append("objetivo", form.objetivo?.value || "");
    apiData.append("experiencia", form.experiencia?.value || "");
    apiData.append("comentarios", form.comentarios?.value || "");

    // -- Educación (campos individuales) --
    apiData.append("educacion", form.educacion?.value || "");
    apiData.append("cursos", form.cursos?.value || "");

    // -- Idiomas --
    apiData.append("idiomas", form.idiomas?.value || "");

    // -- Arrays de Skills --
    form
      .querySelectorAll('input[name="hardSkills"]:checked')
      .forEach((cb) => apiData.append("hardSkills[]", cb.value));

    // Otras habilidades técnicas
    const otherHard = form.otherHardSkills?.value?.trim() || "";
    if (otherHard) {
      apiData.append("otherHardSkills", otherHard);
    }

    form
      .querySelectorAll('input[name="softSkills"]:checked')
      .forEach((cb) => apiData.append("softSkills[]", cb.value));

    // Otras habilidades blandas
    const otherSoft = form.otherSoftSkills?.value?.trim() || "";
    if (otherSoft) {
      apiData.append("otherSoftSkills", otherSoft);
    }

    // -- VALIDACIÓN FOTO --
    const photoInput = document.getElementById("photoFile");
    if (photoInput && photoInput.files && photoInput.files.length > 0) {
      const file = photoInput.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.size > maxSize) {
        throw new Error(
          "La imagen es muy pesada (máximo 10MB). Por favor elige una más liviana."
        );
      }

      // Verificar que sea una imagen válida
      if (!file.type.startsWith("image/")) {
        throw new Error("El archivo seleccionado no es una imagen válida.");
      }

      apiData.append("photo", file);
      console.log("Foto adjuntada:", file.name, file.size, "bytes");
    }

    // 2. Envío al Servidor con AbortController para timeout
    const BACKEND_URL = "http://localhost:3000/api/cvform/submit";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout

    let response;
    try {
      response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: apiData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        throw new Error(
          "La solicitud tardó demasiado. Intenta con una imagen más pequeña."
        );
      }
      throw new Error(
        "Error de conexión. Verifica que el servidor esté corriendo."
      );
    }

    // 3. Manejo de Respuesta
    let result;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const textResponse = await response.text();
      console.error(
        "Respuesta no JSON del servidor:",
        textResponse.substring(0, 200)
      );
      throw new Error(
        "El servidor no pudo procesar la solicitud. Intenta con una imagen más pequeña."
      );
    }

    if (!response.ok) {
      throw new Error(
        result.error || result.message || "Error al procesar la solicitud."
      );
    }

    // 4. Éxito - Limpiar y redirigir
    console.log("Formulario enviado con éxito:", result.submissionId);

    // Limpiar localStorage de formularios pendientes
    localStorage.removeItem("pending_form_order");
    sessionStorage.removeItem("cvFormCurrentStep");

    window.location.href = `exito.html?id=${result.submissionId}`;
  } catch (error) {
    console.error("Error en submitForm:", error);
    showFormToast(error.message, "error");

    // Restaurar botón SIN cambiar de paso
    btn.innerHTML = originalBtnContent;
    btn.disabled = false;
    btn.style.opacity = "1";

    if (
      error.message.includes("inicia sesión") ||
      error.message.includes("iniciado sesión")
    ) {
      setTimeout(() => (window.location.href = "login.html"), 2000);
    }
  }
}

// Parche de seguridad final al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("cvForm");
  if (form) {
    // Prevenir ENTER en inputs (excepto textareas)
    form.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && event.target.nodeName !== "TEXTAREA") {
        event.preventDefault();
        return false;
      }
    });

    // Bloquear submit nativo del formulario
    form.onsubmit = function (e) {
      if (e) e.preventDefault();
      return false;
    };

    // También con addEventListener por si acaso
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  }

  // Verificar si viene de pago (orderId en URL) - siempre empezar en paso 1
  const urlParams = new URLSearchParams(window.location.search);
  const orderIdFromUrl = urlParams.get("order");

  if (orderIdFromUrl) {
    // Viene de pago, limpiar sessionStorage y empezar en paso 1
    sessionStorage.removeItem("cvFormCurrentStep");
    console.log("Formulario iniciado desde pago, paso 1");
  } else {
    // Solo restaurar si no viene de pago y si hay un paso guardado válido
    const savedStep = sessionStorage.getItem("cvFormCurrentStep");
    if (savedStep && parseInt(savedStep) > 1) {
      const stepNum = parseInt(savedStep);
      if (stepNum >= 1 && stepNum <= totalSteps) {
        document.getElementById(`step1`).classList.remove("active");
        document.getElementById(`step${stepNum}`).classList.add("active");
        currentStep = stepNum;
        updateUI();
        console.log("Paso restaurado desde sessionStorage:", stepNum);
      }
    }
  }
});

// Guardar paso actual cuando cambia
const originalChangeStep = changeStep;
changeStep = function (direction) {
  originalChangeStep(direction);
  sessionStorage.setItem("cvFormCurrentStep", currentStep.toString());
};

// Limpiar cuando se va a exito.html
window.addEventListener("beforeunload", function () {
  if (window.location.href.includes("exito.html")) {
    sessionStorage.removeItem("cvFormCurrentStep");
  }
});
