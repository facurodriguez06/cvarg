let currentStep = 1;
const totalSteps = 6;

function changeStep(direction) {
  const nextStep = currentStep + direction;

  // VALIDAR AL AVANZAR
  if (direction === 1) {
    const currentPanel = document.getElementById(`step${currentStep}`);
    // Validar inputs requeridos normales
    const requiredInputs = currentPanel.querySelectorAll(
      "input[required], select[required], textarea[required]"
    );
    let isValid = true;

    requiredInputs.forEach((input) => {
      if (!input.value.trim()) {
        isValid = false;
        input.classList.add("error");
        input.addEventListener("input", function () {
          if (this.value.trim()) this.classList.remove("error");
        });
      } else {
        input.classList.remove("error");
      }
    });

    // VALIDACIÓN ESPECÍFICA PASO 6 (CHECKBOXES)
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
      alert("Por favor completa los campos obligatorios (*) marcados en rojo.");
      return;
    }
  }

  if (nextStep > 0 && nextStep <= totalSteps) {
    document.getElementById(`step${currentStep}`).classList.remove("active");
    document.getElementById(`step${nextStep}`).classList.add("active");
    currentStep = nextStep;
    updateUI();
    window.scrollTo(0, 0);
  } else if (nextStep > totalSteps) {
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
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("previewImg").src = e.target.result;
      document.getElementById("previewImg").style.display = "block";
      document.querySelector(".photo-preview i").style.display = "none";
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function submitForm() {
  const btn = document.getElementById("btnNext");
  // Guardamos el contenido original del botón (normalmente es "Finalizar" en el último paso)
  const originalBtnContent = btn.innerHTML;

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

    // 2. Construir FormData mapeado al Backend
    const apiData = new FormData();

    // -- Datos Básicos --
    const fullName = `${form.nombres.value} ${form.apellidos.value}`.trim();
    apiData.append("fullName", fullName);
    apiData.append("email", form.email.value);
    apiData.append("phone", form.telefono.value);

    // El backend espera 'city' y 'address'. Usamos provincia para city y DNI/CUIL para address/otros
    apiData.append("city", form.provincia.value);

    let addressInfo = `DNI: ${form.dni.value}`;
    const hasCuil =
      form.querySelector('input[name="hasCuil"]:checked').value === "si";
    if (hasCuil && form.cuil.value) {
      addressInfo += ` - CUIL: ${form.cuil.value}`;
    }
    apiData.append("address", addressInfo);

    apiData.append("birthDate", form.fechaNacimiento.value);

    // -- Links --
    const hasLinkedin =
      form.querySelector('input[name="hasLinkedin"]:checked').value === "si";
    if (hasLinkedin && form.linkLinkedin.value) {
      apiData.append("linkedin", form.linkLinkedin.value);
    }

    // -- Experiencia --
    // Concatenamos Objetivo y Comentarios en Experiencia para que no se pierdan
    let fullExperience = `[OBJETIVO PROFESIONAL]\n${form.objetivo.value}\n\n`;
    fullExperience += `[EXPERIENCIA LABORAL]\n${form.experiencia.value}`;

    if (form.comentarios.value.trim()) {
      fullExperience += `\n\n[COMENTARIOS ADICIONALES]\n${form.comentarios.value}`;
    }
    // Backend expects JSON for 'education' and 'experience' (Prisma Json type)
    // We wrap the text in a simple structure
    apiData.append("experience", JSON.stringify([{ content: fullExperience }]));

    // -- Educación --
    // Concatenamos Cursos en Educación
    let fullEducation = `[FORMACIÓN ACADÉMICA]\n${form.educacion.value}`;
    if (form.cursos.value.trim()) {
      fullEducation += `\n\n[CURSOS Y CAPACITACIONES]\n${form.cursos.value}`;
    }
    apiData.append("education", JSON.stringify([{ content: fullEducation }]));

    // -- Idiomas --
    if (form.idiomas.value.trim()) {
      apiData.append("languages", form.idiomas.value);
    }

    // -- Skills (Arrays) --
    // Hard Skills
    const hardCbs = form.querySelectorAll('input[name="hardSkills"]:checked');
    hardCbs.forEach((cb) => apiData.append("hardSkills", cb.value));
    if (form.otherHardSkills.value.trim()) {
      const others = form.otherHardSkills.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      others.forEach((s) => apiData.append("hardSkills", s));
    }

    // Soft Skills
    const softCbs = form.querySelectorAll('input[name="softSkills"]:checked');
    softCbs.forEach((cb) => apiData.append("softSkills", cb.value));
    if (form.otherSoftSkills.value.trim()) {
      const others = form.otherSoftSkills.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      others.forEach((s) => apiData.append("softSkills", s));
    }

    // -- Foto --
    const photoInput = document.getElementById("photoFile");
    if (photoInput.files.length > 0) {
      apiData.append("photo", photoInput.files[0]);
    }

    // 3. Enviar al Backend
    // Ajustar URL si es necesario (asumimos localhost:3000 por defecto)
    const BACKEND_URL = "http://localhost:3000/api/cvform/submit";

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // NO poner Content-Type manual con FormData
      },
      body: apiData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || result.message || "Error desconocido en el servidor"
      );
    }

    // 4. Éxito
    window.location.href = `exito.html?id=${result.submissionId}`;
  } catch (error) {
    console.error("Error submitting form:", error);

    let msg = error.message;
    if (msg.includes("Failed to fetch")) {
      msg =
        "No se pudo conectar con el servidor. Verifica que el backend esté corriendo.";
    }

    alert("❌ Error al guardar perfil:\n" + msg);

    // Restaurar estado
    btn.innerHTML = originalBtnContent;
    btn.disabled = false;
    btn.style.opacity = "1";

    if (error.message.includes("inicia sesión")) {
      window.location.href = "login.html";
    }
  }
}
