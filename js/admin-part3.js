// ===== IA Y POLLING =====
async function generateAISection(section) {
  if (!currentCVSubmission) return;

  const output = document.getElementById(`ai-output-${section}`);
  const content = document.getElementById(`ai-content-${section}`);

  output.style.display = "block";
  content.innerHTML =
    '<div class="ai-loading"><i class="fas fa-spinner fa-spin"></i> Encolando solicitud...</div>';

  try {
    const response = await api.generateAIContent(
      currentCVSubmission.id,
      section
    );

    if (response && response.jobId) {
      content.innerHTML =
        '<div class="ai-loading"><i class="fas fa-clock"></i> En cola...</div>';
      pollJobStatus(response.jobId, section);
    } else {
      content.innerHTML =
        '<p class="ai-error">Error al encolar la solicitud</p>';
      showToast("Error encolando IA", "error");
    }
  } catch (error) {
    console.error("Error generando IA:", error);
    content.innerHTML = `<p class="ai-error">Error: ${error.message}</p>`;
    showToast("Error al generar contenido", "error");
  }
}

async function pollJobStatus(jobId, section) {
  const content = document.getElementById(`ai-content-${section}`);
  const pollKey = `${section}_${jobId}`;

  if (pollIntervals[pollKey]) {
    clearInterval(pollIntervals[pollKey]);
  }

  const checkStatus = async () => {
    try {
      const response = await fetch(
        `${api.baseURL}/admin/ai-queue/status/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${api.getToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al obtener estado del trabajo");
      }

      const data = await response.json();

      if (data.success && data.job) {
        const { status, result, error } = data.job;
        const { position, pendingCount, estimatedWaitMinutes } = data.queue;

        if (status === "pending") {
          content.innerHTML = `
            <div class="ai-queue-status">
              <i class="fas fa-hourglass-half"></i>
              <p><strong>En cola - Posición #${position || "?"}</strong></p>
              <p class="queue-details">${pendingCount} solicitudes pendientes</p>
              <p class="queue-time">⏱️ Tiempo estimado: ~${estimatedWaitMinutes} min</p>
            </div>
          `;
        } else if (status === "processing") {
          content.innerHTML =
            '<div class="ai-loading"><i class="fas fa-cog fa-spin"></i> Procesando...</div>';
        } else if (status === "completed") {
          content.innerHTML = `<pre>${result}</pre>`;
          showToast("Contenido generado exitosamente", "success");

          if (section === "full") {
            const copyBtn = document.getElementById("copy-full-btn");
            if (copyBtn) copyBtn.style.display = "inline-flex";
          }

          clearInterval(pollIntervals[pollKey]);
          delete pollIntervals[pollKey];
        } else if (status === "failed") {
          content.innerHTML = `<p class="ai-error">Error: ${
            error || "Desconocido"
          }</p>`;
          showToast("Error generando contenido", "error");
          clearInterval(pollIntervals[pollKey]);
          delete pollIntervals[pollKey];
        }
      }
    } catch (error) {
      console.error("Error polling:", error);
    }
  };

  checkStatus();
  pollIntervals[pollKey] = setInterval(checkStatus, 5000);
}

async function generateFullAI() {
  if (!currentCVSubmission) return;

  const output = document.getElementById("ai-output-full");
  const content = document.getElementById("ai-content-full");
  const hint = document.getElementById("ai-hint");

  output.style.display = "block";
  hint.style.display = "none";
  content.innerHTML =
    '<div class="ai-loading"><i class="fas fa-spinner fa-spin"></i> Encolando...</div>';

  try {
    const response = await api.generateAIContent(currentCVSubmission.id, "all");

    if (response && response.jobId) {
      content.innerHTML =
        '<div class="ai-loading"><i class="fas fa-clock"></i> En cola...</div>';
      pollJobStatus(response.jobId, "full");
    } else {
      content.innerHTML = '<p class="ai-error">Error al encolar</p>';
      showToast("Error", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    content.innerHTML = `<p class="ai-error">Error: ${error.message}</p>`;
    showToast("Error al generar CV", "error");
  }
}

// ===== UTILIDADES DE COPIADO =====
function copySectionToClipboard(sectionId) {
  const section = document.getElementById(`section-${sectionId}`);
  if (!section) {
    showToast("Error: sección no encontrada", "error");
    return;
  }

  const text = section.innerText;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast("Contenido copiado al portapapeles", "success");
    })
    .catch((err) => {
      console.error("Error copiando:", err);
      showToast("Error al copiar", "error");
    });
}

function copyAIOutput(section) {
  const content = document.getElementById(`ai-content-${section}`);
  if (!content) {
    showToast("Error: contenido no encontrado", "error");
    return;
  }

  const text = content.innerText;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast("Contenido IA copiado", "success");
    })
    .catch((err) => {
      console.error("Error copiando:", err);
      showToast("Error al copiar", "error");
    });
}

// ===== MODALES =====
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", function () {
    const modal = this.closest(".modal");
    if (modal) modal.classList.remove("active");
  });
});

// ===== FUNCIONES PLACEHOLDER PARA FUTURAS IMPLEMENTACIONES =====
function editProduct(id) {
  showToast("Editar producto - Por implementar", "info");
}

function deleteProduct(id) {
  showToast("Eliminar producto - Por implementar", "info");
}

function editUser(id) {
  showToast("Editar usuario - Por implementar", "info");
}

function deleteUser(id) {
  showToast("Eliminar usuario - Por implementar", "info");
}

function viewOrder(id) {
  showToast("Ver pedido - Por implementar", "info");
}
