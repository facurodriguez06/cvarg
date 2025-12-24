// ===== ADMIN PANEL JavaScript =====
// Panel de Administración - CV Argentina
// Reconstruido: 2025-12-24

// ===== VARIABLES GLOBALES =====
let currentSection = "dashboard";
let currentCVSubmission = null;
let pollIntervals = {};

// ===== UTILIDADES =====
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== AUTENTICACIÓN =====
async function checkAdminAccess() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login.html?redirect=admin";
    return false;
  }

  try {
    const response = await api.request("/auth/me");

    if (!response.user || response.user.role !== "admin") {
      showToast("Acceso denegado. Se requiere rol de administrador.", "error");
      setTimeout(() => (window.location.href = "/index.html"), 2000);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verificando acceso:", error);
    localStorage.removeItem("token");
    window.location.href = "/login.html?redirect=admin";
    return false;
  }
}

// ===== INICIALIZACIÓN =====
async function init() {
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) return;

  const loadingScreen = document.getElementById("loading-container");
  if (loadingScreen) loadingScreen.style.display = "none";

  const dashboard = document.getElementById("admin-dashboard");
  if (dashboard) dashboard.style.display = "block";

  setupNavigation();
  setupNavbarScroll();
  showSection("dashboard");
}

document.addEventListener("DOMContentLoaded", init);

// ===== NAVEGACIÓN =====
function setupNavigation() {
  document.querySelectorAll(".admin-card").forEach((card) => {
    card.addEventListener("click", () => {
      const section = card.dataset.section;
      if (section) showSection(section);
    });
  });
}

function showSection(sectionName) {
  const allSections = document.querySelectorAll(".admin-section");
  allSections.forEach((s) => (s.style.display = "none"));

  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) targetSection.style.display = "block";

  currentSection = sectionName;
  loadSectionData(sectionName);
}

async function loadSectionData(section) {
  switch (section) {
    case "dashboard":
      await loadDashboard();
      break;
    case "products":
      await loadProducts();
      break;
    case "users":
      await loadUsers();
      break;
    case "orders":
      await loadOrders();
      break;
    case "cvforms":
      await loadCVForms();
      break;
  }
}

function setupNavbarScroll() {
  const navbar = document.querySelector(".admin-navbar");
  if (!navbar) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const [products, users, orders, cvForms] = await Promise.all([
      api.getProducts(),
      api.getUsers(),
      api.getOrders(),
      api.getCVSubmissions(),
    ]);

    document.getElementById("total-products").textContent =
      products.length || 0;
    document.getElementById("total-users").textContent = users.length || 0;
    document.getElementById("total-orders").textContent = orders.length || 0;
    document.getElementById("total-cvforms").textContent = cvForms.length || 0;
  } catch (error) {
    console.error("Error cargando dashboard:", error);
    showToast("Error cargando estadísticas", "error");
  }
}

// ===== PRODUCTOS =====
async function loadProducts() {
  try {
    const products = await api.getProducts();
    displayProducts(products);
  } catch (error) {
    console.error("Error cargando productos:", error);
    showToast("Error cargando productos", "error");
  }
}

function displayProducts(products) {
  const tbody = document.querySelector("#products-table tbody");
  if (!tbody) return;

  tbody.innerHTML = products
    .map(
      (p) => `
    <tr>
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>$${p.price}</td>
      <td><span class="status-badge ${p.isActive ? "active" : "inactive"}">${
        p.isActive ? "Activo" : "Inactivo"
      }</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit" onclick="editProduct(${
            p.id
          })"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" onclick="deleteProduct(${
            p.id
          })"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

// ===== USUARIOS =====
async function loadUsers() {
  try {
    const users = await api.getUsers();
    displayUsers(users);
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    showToast("Error cargando usuarios", "error");
  }
}

function displayUsers(users) {
  const tbody = document.querySelector("#users-table tbody");
  if (!tbody) return;

  tbody.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td>${u.id}</td>
      <td>${u.email}</td>
      <td><span class="role-badge ${u.role}">${
        u.role === "admin" ? "Admin" : "Usuario"
      }</span></td>
      <td><span class="status-badge ${u.isActive ? "active" : "inactive"}">${
        u.isActive ? "Activo" : "Inactivo"
      }</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      <td><div class="action-buttons">
        <button class="action-btn edit" onclick="editUser(${
          u.id
        })"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" onclick="deleteUser(${
          u.id
        })"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>
  `
    )
    .join("");
}

// ===== PEDIDOS =====
async function loadOrders() {
  try {
    const orders = await api.getOrders();
    displayOrders(orders);
  } catch (error) {
    console.error("Error cargando pedidos:", error);
    showToast("Error cargando pedidos", "error");
  }
}

function displayOrders(orders) {
  const tbody = document.querySelector("#orders-table tbody");
  if (!tbody) return;

  tbody.innerHTML = orders
    .map(
      (o) => `
    <tr>
      <td>#${o.id}</td>
      <td>${o.user?.email || "N/A"}</td>
      <td>$${o.total}</td>
      <td><span class="status-badge ${o.paymentStatus}">${
        o.paymentStatus === "paid" ? "Pagado" : "Pendiente"
      }</span></td>
      <td><span class="status-badge ${
        o.deliveryStatus
      }">${getDeliveryStatusText(o.deliveryStatus)}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString()}</td>
      <td><div class="action-buttons">
        <button class="action-btn review" onclick="viewOrder(${
          o.id
        })"><i class="fas fa-eye"></i> Ver</button>
      </div></td>
    </tr>
  `
    )
    .join("");
}

function getDeliveryStatusText(status) {
  const map = {
    pending: "Pendiente",
    "in-progress": "En Progreso",
    completed: "Completado",
    cancelled: "Cancelado",
    delivered: "Entregado",
  };
  return map[status] || status;
}

// ===== FORMULARIOS CV - LA PARTE PRINCIPAL =====
async function loadCVForms() {
  try {
    const forms = await api.getCVSubmissions();
    displayCVForms(forms);
  } catch (error) {
    console.error("Error cargando CV forms:", error);
    showToast("Error cargando formularios", "error");
  }
}

function displayCVForms(forms) {
  const tbody = document.querySelector("#cvforms-table tbody");
  if (!tbody) return;

  tbody.innerHTML = forms
    .map(
      (f) => `
    <tr>
      <td>#${f.id}</td>
      <td>${f.fullName}</td>
      <td>${f.email}</td>
      <td>${f.phone || "-"}</td>
      <td><span class="status-badge ${
        f.deliveryStatus
      }">${getDeliveryStatusText(f.deliveryStatus)}</span></td>
      <td>${new Date(f.createdAt).toLocaleDateString()}</td>
      <td><div class="action-buttons">
        <button class="action-btn view" onclick="viewCVSubmission(${
          f.id
        })"><i class="fas fa-eye"></i></button>
      </div></td>
    </tr>
  `
    )
    .join("");
}

async function viewCVSubmission(id) {
  try {
    const submission = await api.getCVSubmission(id);
    currentCVSubmission = submission;

    const html = buildCVDetailHTML(submission);
    const modalBody = document.getElementById("cv-modal-body");
    if (modalBody) modalBody.innerHTML = html;

    openModal("cv-modal");
  } catch (error) {
    console.error("Error cargando detalle CV:", error);
    showToast("Error cargando detalle", "error");
  }
}

// Continuará en el próximo archivo...

// ===== CONSTRUCCIÓN DEL DETALLE CV - CON TODOS LOS CAMPOS =====
function buildCVDetailHTML(form) {
  const education = form.education || [];
  const experience = form.experience || [];
  const hardSkills = form.hardSkills || [];
  const softSkills = form.softSkills || [];
  const languages = form.languages || [];
  
  return `
    <!-- Datos Personales -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-user"></i> Datos Personales</h4>
        <button class="btn-copy" onclick="copySectionToClipboard('personal')">
          <i class="fas fa-copy"></i> Copiar
        </button>
      </div>
      <div class="cv-section-content" id="section-personal">
        <div class="cv-grid">
          <div class="cv-field">
            <label>Nombre Completo</label>
            <span>${form.fullName || "-"}</span>
          </div>
          <div class="cv-field">
            <label>Email</label>
            <span>${form.email || "-"}</span>
          </div>
          <div class="cv-field">
            <label>Teléfono</label>
            <span>${form.phone || "-"}</span>
          </div>
          <div class="cv-field">
            <label>DNI</label>
            <span>${form.dni || "-"}</span>
          </div>
          <div class="cv-field">
            <label>Fecha de Nacimiento</label>
            <span>${form.birthDate ? new Date(form.birthDate).toLocaleDateString("es-AR") : "-"}</span>
          </div>
          <div class="cv-field">
            <label>Edad</label>
            <span>${form.age || "-"}</span>
          </div>
          <div class="cv-field">
            <label>Nacionalidad</label>
            <span>${form.nationality || "-"}</span>
          </div>
          <div class="cv-field">
            <label>Ciudad</label>
            <span>${form.city || form.address || "-"}</span>
          </div>
          <div class="cv-field">
            <label>LinkedIn</label>
            <span>${form.linkedin ? `<a href="${form.linkedin}" target="_blank">${form.linkedin}</a>` : "-"}</span>
          </div>
          <div class="cv-field">
            <label>Objetivo Profesional</label>
            <span>${form.objective || "-"}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Experiencia Laboral -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-briefcase"></i> Experiencia Laboral</h4>
        <div class="section-actions">
          <button class="btn-copy" onclick="copySectionToClipboard('experience')">
            <i class="fas fa-copy"></i> Copiar
          </button>
          <button class="btn-ai-mini" onclick="generateAISection('experiencia')">
            <i class="fas fa-magic"></i> IA
          </button>
        </div>
      </div>
      <div class="cv-section-content" id="section-experience">
        ${formatExperience(experience)}
      </div>
      <div class="ai-output" id="ai-output-experiencia" style="display: none;">
        <div class="ai-output-header">
          <span><i class="fas fa-robot"></i> Generado con IA</span>
          <button class="btn-copy-small" onclick="copyAIOutput('experiencia')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <div class="ai-output-content" id="ai-content-experiencia"></div>
      </div>
    </div>

    <!-- Educación -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-graduation-cap"></i> Educación</h4>
        <div class="section-actions">
          <button class="btn-copy" onclick="copySectionToClipboard('education')">
            <i class="fas fa-copy"></i> Copiar
          </button>
          <button class="btn-ai-mini" onclick="generateAISection('educacion')">
            <i class="fas fa-magic"></i> IA
          </button>
        </div>
      </div>
      <div class="cv-section-content" id="section-education">
        ${formatEducation(education)}
      </div>
      <div class="ai-output" id="ai-output-educacion" style="display: none;">
        <div class="ai-output-header">
          <span><i class="fas fa-robot"></i> Generado con IA</span>
          <button class="btn-copy-small" onclick="copyAIOutput('educacion')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <div class="ai-output-content" id="ai-content-educacion"></div>
      </div>
    </div>

    <!-- Habilidades -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-tools"></i> Habilidades</h4>
        <button class="btn-copy" onclick="copySectionToClipboard('skills')">
          <i class="fas fa-copy"></i> Copiar
        </button>
      </div>
      <div class="cv-section-content" id="section-skills">
        <div class="skills-display">
          <div class="skills-group">
            <label>Habilidades Técnicas (Hard Skills)</label>
            <div class="skills-tags">
              ${hardSkills.length > 0 
                ? hardSkills.map(skill => `<span class="skill-tag hard">${skill}</span>`).join("") 
                : '<span style="color: #a0aec0; font-style: italic;">Sin habilidades técnicas registradas</span>'}
            </div>
          </div>
          <div class="skills-group">
            <label>Habilidades Blandas (Soft Skills)</label>
            <div class="skills-tags">
              ${softSkills.length > 0 
                ? softSkills.map(skill => `<span class="skill-tag soft">${skill}</span>`).join("") 
                : '<span style="color: #a0aec0; font-style: italic;">Sin habilidades blandas registradas</span>'}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Idiomas -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-language"></i> Idiomas</h4>
        <button class="btn-copy" onclick="copySectionToClipboard('languages')">
          <i class="fas fa-copy"></i> Copiar
        </button>
      </div>
      <div class="cv-section-content" id="section-languages">
        ${formatLanguages(languages)}
      </div>
    </div>

    <!-- CV Completo con IA -->
    <div class="cv-section ai-full-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-file-alt"></i> CV Completo Generado con IA</h4>
        <button class="btn-ai" onclick="generateFullAI()">
          <i class="fas fa-magic"></i> Generar CV con IA
        </button>
      </div>
      <div class="ai-output" id="ai-output-full" style="display: none;">
        <div class="ai-output-content" id="ai-content-full"></div>
      </div>
      <p class="ai-hint" id="ai-hint">Presiona "Generar CV con IA" para crear un CV profesional completo</p>
      <button class="btn-copy" onclick="copyAIOutput('full')" id="copy-full-btn" style="display: none;">
        <i class="fas fa-copy"></i> Copiar CV
      </button>
    </div>
  `;
}

// ===== FORMATEO DE SECCIONES =====
function formatExperience(experience) {
  if (!experience || (Array.isArray(experience) && experience.length === 0)) {
    return '<p class="no-data">Sin experiencia registrada</p>';
  }
  
  if (typeof experience === "string") {
    return `<pre class="raw-data">${experience}</pre>`;
  }
  
  if (Array.isArray(experience)) {
    return experience.map(exp => `
      <div class="experience-item">
        <strong>${exp.puesto || exp.position || "Puesto"}</strong> en <strong>${exp.empresa || exp.company || "Empresa"}</strong>
        <div class="exp-period">${exp.periodo || exp.period || ""}</div>
        <p>${exp.tareas || exp.tasks || ""}</p>
      </div>
    `).join("");
  }
  
  return '<p class="no-data">Sin experiencia registrada</p>';
}

function formatEducation(education) {
  if (!education || (Array.isArray(education) && education.length === 0)) {
    return '<p class="no-data">Sin educación registrada</p>';
  }
  
  if (typeof education === "string") {
    return `<pre class="raw-data">${education}</pre>`;
  }
  
  if (Array.isArray(education)) {
    return education.map(edu => `
      <div class="education-item">
        <strong>${edu.titulo || edu.title || "Título"}</strong>
        <div class="edu-institution">${edu.institucion || edu.institution || ""}</div>
        <div class="edu-year">${edu.año || edu.year || ""}</div>
      </div>
    `).join("");
  }
  
  return '<p class="no-data">Sin educación registrada</p>';
}

function formatLanguages(languages) {
  if (!languages || (Array.isArray(languages) && languages.length === 0)) {
    return '<p class="no-data">Sin idiomas registrados</p>';
  }
  
  if (Array.isArray(languages)) {
    return languages.map(lang => `
      <div class="language-item">
        <strong>${lang.idioma || lang.language || "Idioma"}</strong>
        <span class="lang-level">${lang.nivel || lang.level || ""}</span>
      </div>
    `).join("");
  }
  
  if (typeof languages === "object") {
    return `<pre class="raw-data">${JSON.stringify(languages, null, 2)}</pre>`;
  }
  
  return '<p class="no-data">Sin idiomas registrados</p>';
}

// Continuará...
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
              <p><strong>En cola - PosiciÃ³n #${position || "?"}</strong></p>
              <p class="queue-details">${pendingCount} solicitudes pendientes</p>
              <p class="queue-time">â±ï¸ Tiempo estimado: ~${estimatedWaitMinutes} min</p>
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
    showToast("Error: secciÃ³n no encontrada", "error");
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
