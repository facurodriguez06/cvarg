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

// Custom confirmation dialog (replaces browser's confirm())
function showConfirmDialog({
  title,
  message,
  icon = "fa-question-circle",
  confirmText = "Confirmar",
  confirmClass = "",
  onConfirm,
}) {
  // Remove any existing dialog
  const existing = document.getElementById("confirm-dialog");
  if (existing) existing.remove();

  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog-overlay";
  dialog.id = "confirm-dialog";
  dialog.innerHTML = `
    <div class="confirm-dialog">
      <div class="confirm-dialog-icon">
        <i class="fas ${icon}"></i>
      </div>
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="confirm-dialog-buttons">
        <button class="btn-confirm-cancel" onclick="closeConfirmDialog()">Cancelar</button>
        <button class="btn-confirm-action ${confirmClass}" id="confirm-action-btn">${confirmText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);

  // Add click handler for confirm button
  document
    .getElementById("confirm-action-btn")
    .addEventListener("click", () => {
      closeConfirmDialog();
      if (onConfirm) onConfirm();
    });
}

function closeConfirmDialog() {
  const dialog = document.getElementById("confirm-dialog");
  if (dialog) dialog.remove();
}

// ===== AUTENTICACIÓN =====
async function checkAdminAccess() {
  const token = api.getToken(); // Usar api.getToken() que lee 'authToken'

  if (!token) {
    window.location.href = "/login.html?redirect=admin";
    return false;
  }

  try {
    const response = await api.request("/auth/me");
    // Verificar rol (case-insensitive porque DB usa ADMIN)
    const backendRole = (response.user?.role || "").toUpperCase();
    if (!response.user || backendRole !== "ADMIN") {
      showToast("Acceso denegado. Se requiere rol de administrador.", "error");
      setTimeout(() => (window.location.href = "/index.html"), 2000);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verificando acceso con backend:", error);

    // FALLBACK: Verificar rol en localStorage (modo local/offline)
    const user = api.getUser();
    console.log("🔍 Usuario en localStorage:", user);

    if (!user) {
      api.removeToken();
      window.location.href = "/login.html?redirect=admin";
      return false;
    }

    // Verificar si es admin por rol (case-insensitive porque DB usa ADMIN)
    const userRole = (user.role || "").toUpperCase();
    const isAdmin = userRole === "ADMIN";

    if (!isAdmin) {
      showToast("Acceso denegado. Se requiere rol de administrador.", "error");
      setTimeout(() => (window.location.href = "/index.html"), 2000);
      return false;
    }

    console.log("✅ Acceso admin verificado en modo local");
    return true;
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

  // Elementos del menú principal (dashboard)
  const statsCards = document.querySelector(".stats-cards");
  const adminMenu = document.querySelector(".admin-menu");

  // Si es dashboard o menu, mostrar las tarjetas del menú
  if (sectionName === "dashboard" || sectionName === "menu") {
    if (statsCards) statsCards.style.display = "grid";
    if (adminMenu) adminMenu.style.display = "grid";
  } else {
    // Si es otra sección, ocultar el menú y mostrar solo la sección
    if (statsCards) statsCards.style.display = "none";
    if (adminMenu) adminMenu.style.display = "none";

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) targetSection.style.display = "block";
  }

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
    // Usar los métodos correctos de api.js
    const [products, users, orders, cvForms] = await Promise.all([
      api.getProducts(),
      api.getAdminUsers(),
      api.getAdminOrders(),
      api.getAdminCVSubmissions(),
    ]);

    document.getElementById("total-products").textContent =
      products?.length || products?.products?.length || 0;
    document.getElementById("total-users").textContent =
      users?.length || users?.users?.length || 0;
    document.getElementById("total-orders").textContent =
      orders?.length || orders?.orders?.length || 0;
    document.getElementById("total-cvforms").textContent =
      cvForms?.length || cvForms?.submissions?.length || 0;
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
  const tbody = document.getElementById("products-table-body");
  if (!tbody) return;

  const productsList = products?.products || products || [];

  tbody.innerHTML = productsList
    .map((p) => {
      const isActive = p.isActive !== false;
      const productData = encodeURIComponent(
        JSON.stringify({
          id: p.id,
          name: p.name || p.nombre,
          price: p.price || p.precio,
          description: p.description || p.descripcion || "",
          category: p.category || p.categoria || "",
          stock: p.stock || 999,
          imageUrl: p.imageUrl || p.image || "",
        })
      );

      return `
    <tr>
      <td>${p.id || "-"}</td>
      <td>${p.name || p.nombre || "-"}</td>
      <td>$${p.price || p.precio || 0}</td>
      <td>${p.category || p.categoria || "-"}</td>
      <td>${p.stock ?? "-"}</td>
      <td><span class="status-badge ${isActive ? "active" : "inactive"}">${
        isActive ? "Activo" : "Inactivo"
      }</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn-product-action edit" onclick="openEditProductModal('${productData}')">
            <i class="fas fa-edit"></i> Editar
          </button>
          ${
            isActive
              ? `<button class="btn-product-action deactivate" onclick="toggleProductStatus('${
                  p.id
                }', false, '${(p.name || p.nombre || "").replace(
                  /'/g,
                  "\\'"
                )}')">
                <i class="fas fa-ban"></i> Baja
              </button>`
              : `<button class="btn-product-action activate" onclick="toggleProductStatus('${
                  p.id
                }', true, '${(p.name || p.nombre || "").replace(
                  /'/g,
                  "\\'"
                )}')">
                <i class="fas fa-check"></i> Activar
              </button>`
          }
        </div>
      </td>
    </tr>
  `;
    })
    .join("");
}

// ===== USUARIOS =====
async function loadUsers() {
  try {
    const response = await api.getAdminUsers();
    const users = response?.users || response || [];
    displayUsers(users);
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    showToast("Error cargando usuarios", "error");
  }
}

function displayUsers(users) {
  const tbody = document.getElementById("users-table-body");
  if (!tbody) return;

  const usersList = users || [];

  // HTML columns: ID, Nombre, Email, Teléfono, Rol, Estado, Acciones
  tbody.innerHTML = usersList
    .map((u) => {
      const isActive = u.isActive !== false; // default to true if undefined
      const actionBtn = isActive
        ? `<button class="btn-user-action deactivate" onclick="toggleUserStatus('${u.id}', false, '${u.email}')">
              <i class="fas fa-user-slash"></i> Dar de Baja
            </button>`
        : `<button class="btn-user-action activate" onclick="toggleUserStatus('${u.id}', true, '${u.email}')">
              <i class="fas fa-user-check"></i> Activar
            </button>`;

      return `
    <tr>
      <td>${u.id || "-"}</td>
      <td>${u.fullName || u.full_name || u.name || "-"}</td>
      <td>${u.email || "-"}</td>
      <td>${u.phone || u.telefono || "-"}</td>
      <td><span class="role-badge ${(u.role || "user").toLowerCase()}">${
        (u.role || "").toUpperCase() === "ADMIN" ? "Admin" : "Usuario"
      }</span></td>
      <td><span class="status-badge ${isActive ? "active" : "inactive"}">${
        isActive ? "Activo" : "Inactivo"
      }</span></td>
      <td>${actionBtn}</td>
    </tr>
  `;
    })
    .join("");
}

// Toggle user active status with confirmation
function toggleUserStatus(userId, activate, userEmail) {
  const action = activate ? "activar" : "dar de baja";
  const title = activate ? "Activar Usuario" : "Dar de Baja Usuario";
  const icon = activate ? "fa-user-check" : "fa-user-slash";
  const btnClass = activate ? "confirm-activate" : "confirm-deactivate";

  showConfirmDialog({
    title: title,
    message: `¿Le gustaría ${action} al usuario <strong>${userEmail}</strong>?`,
    icon: icon,
    confirmText: activate ? "Sí, Activar" : "Sí, Dar de Baja",
    confirmClass: btnClass,
    onConfirm: async () => {
      try {
        await api.updateAdminUser(userId, { isActive: activate });
        showToast(
          `Usuario ${activate ? "activado" : "dado de baja"} correctamente`,
          "success"
        );
        loadUsers();
      } catch (error) {
        console.error("Error actualizando usuario:", error);
        showToast("Error actualizando usuario", "error");
      }
    },
  });
}

// ===== PEDIDOS =====
async function loadOrders() {
  try {
    const response = await api.getAdminOrders();
    const orders = response?.orders || response || [];
    displayOrders(orders);
  } catch (error) {
    console.error("Error cargando pedidos:", error);
    showToast("Error cargando pedidos", "error");
  }
}

function displayOrders(orders) {
  const tbody = document.getElementById("orders-table-body");
  if (!tbody) return;

  // HTML columns: #Orden, Cliente, Email, Productos, Total, Estado, Fecha, Acciones
  tbody.innerHTML = orders
    .map((o) => {
      const currentStatus = o.status || o.deliveryStatus || "pending";
      const statusText = getDeliveryStatusText(currentStatus);
      return `
    <tr>
      <td>#${o.id || o.orderId || "-"}</td>
      <td>${o.user?.fullName || o.clientName || o.user?.email || "-"}</td>
      <td>${o.user?.email || o.email || "-"}</td>
      <td>${o.items?.length || o.products?.length || 0} items</td>
      <td>$${o.total || 0}</td>
      <td><span class="status-badge ${currentStatus}">${statusText}</span></td>
      <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "-"}</td>
      <td>
        <button class="btn-change-status" onclick="showChangeStatusDialog('${
          o.id
        }', '${currentStatus}')">
          <i class="fas fa-exchange-alt"></i> Cambiar Estado
        </button>
      </td>
    </tr>
  `;
    })
    .join("");
}

// Show dialog to change order status
function showChangeStatusDialog(orderId, currentStatus) {
  const statusOptions = [
    { value: "pending", label: "Pendiente" },
    { value: "in-progress", label: "En Progreso" },
    { value: "completed", label: "Completado" },
    { value: "delivered", label: "Entregado" },
    { value: "cancelled", label: "Cancelado" },
  ];

  // Filter out current status
  const availableOptions = statusOptions.filter(
    (s) => s.value !== currentStatus
  );

  // Create options HTML
  const optionsHtml = availableOptions
    .map(
      (s) =>
        `<button class="status-option-btn ${s.value}" onclick="confirmStatusChange('${orderId}', '${s.value}', '${s.label}')">${s.label}</button>`
    )
    .join("");

  // Show custom dialog
  const dialog = document.createElement("div");
  dialog.className = "status-dialog-overlay";
  dialog.id = "status-dialog";
  dialog.innerHTML = `
    <div class="status-dialog">
      <h3>Cambiar Estado del Pedido #${orderId}</h3>
      <p>Estado actual: <strong>${getDeliveryStatusText(
        currentStatus
      )}</strong></p>
      <p>Seleccione el nuevo estado:</p>
      <div class="status-options">
        ${optionsHtml}
      </div>
      <button class="btn-cancel" onclick="closeStatusDialog()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(dialog);
}

// Confirm status change
function confirmStatusChange(orderId, newStatus, statusLabel) {
  closeStatusDialog(); // Close the status options dialog first

  showConfirmDialog({
    title: "Cambiar Estado",
    message: `¿Le gustaría cambiar de estado a <strong>${statusLabel}</strong>?`,
    icon: "fa-exchange-alt",
    confirmText: `Sí, cambiar a ${statusLabel}`,
    confirmClass: "confirm-status",
    onConfirm: () => {
      updateOrderStatus(orderId, newStatus);
    },
  });
}

// Close status dialog
function closeStatusDialog() {
  const dialog = document.getElementById("status-dialog");
  if (dialog) {
    dialog.remove();
  }
}

// Function to update order status
async function updateOrderStatus(orderId, status) {
  try {
    await api.updateAdminOrderStatus(orderId, status);
    showToast("Estado actualizado", "success");
  } catch (error) {
    console.error("Error actualizando estado:", error);
    showToast("Error actualizando estado", "error");
    loadOrders(); // Reload to reset the dropdown
  }
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
    const response = await api.getAdminCVSubmissions();
    const forms = response?.submissions || response || [];
    displayCVForms(forms);
  } catch (error) {
    console.error("Error cargando CV forms:", error);
    showToast("Error cargando formularios", "error");
  }
}

function displayCVForms(forms) {
  const tbody = document.getElementById("cvforms-table-body");
  if (!tbody) return;

  // Columnas del HTML: FECHA, CLIENTE, EMAIL, TELÉFONO, ESTADO, ACCIONES
  tbody.innerHTML = forms
    .map(
      (f) => `
    <tr>
      <td>${f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "-"}</td>
      <td>${f.fullName || f.full_name || "-"}</td>
      <td>${f.email || "-"}</td>
      <td>${f.phone || f.telefono || "-"}</td>
      <td><span class="status-badge ${
        f.deliveryStatus || f.status || "pending"
      }">${getDeliveryStatusText(f.deliveryStatus || f.status)}</span></td>
      <td><div class="action-buttons">
        <button class="action-btn view" onclick="viewCVSubmission('${
          f.id
        }')"><i class="fas fa-eye"></i></button>
      </div></td>
    </tr>
  `
    )
    .join("");
}

// ===== FILTRADO =====
function filterOrders() {
  const filter = document.getElementById("order-status-filter")?.value;
  // TODO: Implement order filtering based on filter value
  loadOrders();
}

function filterCVForms() {
  const filter = document.getElementById("cvform-status-filter")?.value;
  // TODO: Implement CV form filtering based on filter value
  loadCVForms();
}

async function viewCVSubmission(id) {
  try {
    console.log("🔍 Cargando CV:", id);
    const response = await api.getAdminCVSubmission(id);
    const submission = response?.submission || response;
    currentCVSubmission = submission;
    console.log("📋 Datos CV:", submission);

    const html = buildCVDetailHTML(submission);
    const modalBody = document.getElementById("cv-modal-body");
    if (modalBody) {
      modalBody.innerHTML = html;
    } else {
      console.error("❌ No se encontró cv-modal-body");
    }

    openModal("cv-detail-modal");
  } catch (error) {
    console.error("Error cargando detalle CV:", error);
    showToast("Error cargando detalle: " + error.message, "error");
  }
}

// Continuará en el próximo archivo...

// ===== CONSTRUCCIÓN DEL DETALLE CV - TODOS LOS CAMPOS DEL FORMULARIO =====
function buildCVDetailHTML(form) {
  // Obtener valores con fallback vacío para mostrar siempre el campo
  const val = (v) => v || "-";

  // Formatear fecha evitando problemas de timezone
  const formatDate = (d) => {
    if (!d) return "-";
    // Si la fecha viene como string ISO (AAAA-MM-DD), parsearla manualmente
    if (typeof d === "string" && d.includes("-")) {
      const parts = d.split("T")[0].split("-"); // Tomar solo la parte de fecha
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
    }
    // Fallback: usar toLocaleDateString pero ajustando timezone
    const date = new Date(d);
    return date.toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  // Manejar arrays que pueden venir como string
  const getArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string")
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  };

  // Parsear contenido JSON (para experiencia, educación, etc.)
  const parseJsonContent = (data) => {
    if (!data) return "-";

    // Si es string, intentar parsear
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return data; // Si no es JSON válido, devolver el string tal cual
      }
    }

    // Si es array con objetos que tienen "content"
    if (Array.isArray(data)) {
      return data
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && item.content) return item.content;
          if (typeof item === "object") return JSON.stringify(item, null, 2);
          return String(item);
        })
        .join("\n\n");
    }

    // Si es objeto con "content"
    if (data && typeof data === "object" && data.content) {
      return data.content;
    }

    // Si es otro tipo de objeto
    if (typeof data === "object") {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  };

  const hardSkills = getArray(form.hardSkills);
  const softSkills = getArray(form.softSkills);

  // Foto del perfil - priorizar Base64 sobre URL
  const photoData =
    form.photoBase64 ||
    form.photoUrl ||
    form.photo ||
    form.imagen ||
    form.profilePhoto ||
    null;
  const photoHtml = photoData
    ? `<img src="${photoData}" alt="Foto de perfil" class="cv-photo" />`
    : `<div class="cv-photo-placeholder"><i class="fas fa-user"></i><span>Sin foto</span></div>`;

  return `
    <!-- FOTO DE PERFIL -->
    <div class="cv-section cv-photo-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-camera"></i> Foto de Perfil</h4>
        ${
          photoData
            ? `<button class="btn-download-photo" onclick="downloadPhoto('${
                form.fullName || "perfil"
              }')"><i class="fas fa-download"></i> Descargar</button>`
            : ""
        }
      </div>
      <div class="cv-photo-container">
        ${photoHtml}
      </div>
    </div>

    <!-- PASO 1: DATOS PERSONALES -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-user"></i> Datos Personales</h4>
        <button class="btn-copy" onclick="copySectionToClipboard('personal')">
          <i class="fas fa-copy"></i> Copiar
        </button>
      </div>
      <div class="cv-section-content" id="section-personal">
        <div class="cv-grid">
          <div class="cv-field"><label>Nombres</label><span>${val(
            form.nombres || form.firstName
          )}</span></div>
          <div class="cv-field"><label>Apellidos</label><span>${val(
            form.apellidos || form.lastName
          )}</span></div>
          <div class="cv-field"><label>Edad</label><span>${val(
            form.edad || form.age
          )}</span></div>
          <div class="cv-field"><label>Fecha de Nacimiento</label><span>${formatDate(
            form.fechaNacimiento || form.birthDate
          )}</span></div>
          <div class="cv-field"><label>Nacionalidad</label><span>${val(
            form.nacionalidad || form.nationality
          )}</span></div>
          <div class="cv-field"><label>Estado Civil</label><span>${val(
            form.estadoCivil || form.maritalStatus
          )}</span></div>
          <div class="cv-field"><label>Email</label><span>${val(
            form.email
          )}</span></div>
          <div class="cv-field"><label>Teléfono</label><span>${val(
            form.telefono || form.phone
          )}</span></div>
          <div class="cv-field"><label>DNI</label><span>${val(
            form.dni
          )}</span></div>
          <div class="cv-field"><label>Provincia / Ciudad</label><span>${val(
            form.provincia || form.city || form.address
          )}</span></div>
          <div class="cv-field"><label>LinkedIn</label><span>${
            form.linkLinkedin || form.linkedin
              ? `<a href="${
                  form.linkLinkedin || form.linkedin
                }" target="_blank">${form.linkLinkedin || form.linkedin}</a>`
              : "-"
          }</span></div>
          <div class="cv-field"><label>CUIL</label><span>${val(
            form.cuil
          )}</span></div>
        </div>
      </div>
    </div>

    <!-- PASO 2: EXPERIENCIA LABORAL -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-briefcase"></i> Experiencia Laboral</h4>
        <div class="section-actions">
          <button class="btn-copy" onclick="copySectionToClipboard('experience')"><i class="fas fa-copy"></i> Copiar</button>
          <button class="btn-ai-mini" onclick="generateAISection('experiencia')"><i class="fas fa-magic"></i> IA</button>
        </div>
      </div>
      <div class="cv-section-content" id="section-experience">
        <div class="cv-field full-width"><label>Disponibilidad</label><span>${val(
          form.disponibilidad || form.availability
        )}</span></div>
        <div class="cv-field full-width"><label>Detalle de Experiencia</label><pre class="raw-data">${parseJsonContent(
          form.experiencia || form.experience
        )}</pre></div>
      </div>
      <div class="ai-output" id="ai-output-experiencia" style="display: none;">
        <div class="ai-output-header"><span><i class="fas fa-robot"></i> Generado con IA</span><button class="btn-copy-small" onclick="copyAIOutput('experiencia')"><i class="fas fa-copy"></i></button></div>
        <div class="ai-output-content" id="ai-content-experiencia"></div>
      </div>
    </div>

    <!-- PASO 3: EDUCACIÓN -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-graduation-cap"></i> Educación</h4>
        <div class="section-actions">
          <button class="btn-copy" onclick="copySectionToClipboard('education')"><i class="fas fa-copy"></i> Copiar</button>
          <button class="btn-ai-mini" onclick="generateAISection('educacion')"><i class="fas fa-magic"></i> IA</button>
        </div>
      </div>
      <div class="cv-section-content" id="section-education">
        <div class="cv-field full-width"><label>Detalle de Estudios</label><pre class="raw-data">${parseJsonContent(
          form.educacion || form.education
        )}</pre></div>
      </div>
      <div class="ai-output" id="ai-output-educacion" style="display: none;">
        <div class="ai-output-header"><span><i class="fas fa-robot"></i> Generado con IA</span><button class="btn-copy-small" onclick="copyAIOutput('educacion')"><i class="fas fa-copy"></i></button></div>
        <div class="ai-output-content" id="ai-content-educacion"></div>
      </div>
    </div>

    <!-- PASO 4: CAPACITACIÓN -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-certificate"></i> Capacitación</h4>
        <button class="btn-copy" onclick="copySectionToClipboard('training')"><i class="fas fa-copy"></i> Copiar</button>
      </div>
      <div class="cv-section-content" id="section-training">
        <div class="cv-field full-width"><label>Cursos y Capacitaciones</label><pre class="raw-data">${val(
          form.cursos || form.courses
        )}</pre></div>
        <div class="cv-field full-width"><label>Idiomas</label><pre class="raw-data">${parseJsonContent(
          form.idiomas || form.languages
        )}</pre></div>
      </div>
    </div>

    <!-- PASO 6: HABILIDADES -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-tools"></i> Habilidades</h4>
        <button class="btn-copy" onclick="copySectionToClipboard('skills')"><i class="fas fa-copy"></i> Copiar</button>
      </div>
      <div class="cv-section-content" id="section-skills">
        <div class="skills-display">
          <div class="skills-group">
            <label>Habilidades Técnicas (Hard Skills)</label>
            <div class="skills-tags">${
              hardSkills.length > 0
                ? hardSkills
                    .map(
                      (skill) => `<span class="skill-tag hard">${skill}</span>`
                    )
                    .join("")
                : '<span class="empty-field">-</span>'
            }</div>
          </div>
          <div class="cv-field full-width" style="margin-top: 10px;"><label>Otras Habilidades Técnicas</label><span>${val(
            form.otherHardSkills
          )}</span></div>
          <div class="skills-group" style="margin-top: 15px;">
            <label>Habilidades Blandas (Soft Skills)</label>
            <div class="skills-tags">${
              softSkills.length > 0
                ? softSkills
                    .map(
                      (skill) => `<span class="skill-tag soft">${skill}</span>`
                    )
                    .join("")
                : '<span class="empty-field">-</span>'
            }</div>
          </div>
          <div class="cv-field full-width" style="margin-top: 10px;"><label>Otras Habilidades Blandas</label><span>${val(
            form.otherSoftSkills
          )}</span></div>
        </div>
      </div>
    </div>

    <!-- OBJETIVO Y COMENTARIOS -->
    <div class="cv-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-bullseye"></i> Objetivo y Comentarios</h4>
        <button class="btn-copy" onclick="copySectionToClipboard('objective')"><i class="fas fa-copy"></i> Copiar</button>
      </div>
      <div class="cv-section-content" id="section-objective">
        <div class="cv-field full-width"><label>Objetivo / Orientación</label><span>${val(
          form.objetivo || form.objective
        )}</span></div>
        <div class="cv-field full-width"><label>Comentarios Finales</label><pre class="raw-data">${val(
          form.comentarios || form.comments
        )}</pre></div>
      </div>
    </div>

    <!-- CV COMPLETO CON IA -->
    <div class="cv-section ai-full-section">
      <div class="cv-section-header">
        <h4><i class="fas fa-file-alt"></i> CV Completo Generado con IA</h4>
        <button class="btn-ai" onclick="generateFullAI()"><i class="fas fa-magic"></i> Generar CV con IA</button>
      </div>
      <div class="ai-output" id="ai-output-full" style="display: none;">
        <div class="ai-output-content" id="ai-content-full"></div>
      </div>
      <p class="ai-hint" id="ai-hint">Presiona "Generar CV con IA" para crear un CV profesional completo</p>
      <button class="btn-copy" onclick="copyAIOutput('full')" id="copy-full-btn" style="display: none;"><i class="fas fa-copy"></i> Copiar CV</button>
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
    return experience
      .map(
        (exp) => `
      <div class="experience-item">
        <strong>${exp.puesto || exp.position || "Puesto"}</strong> en <strong>${
          exp.empresa || exp.company || "Empresa"
        }</strong>
        <div class="exp-period">${exp.periodo || exp.period || ""}</div>
        <p>${exp.tareas || exp.tasks || ""}</p>
      </div>
    `
      )
      .join("");
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
    return education
      .map(
        (edu) => `
      <div class="education-item">
        <strong>${edu.titulo || edu.title || "Título"}</strong>
        <div class="edu-institution">${
          edu.institucion || edu.institution || ""
        }</div>
        <div class="edu-year">${edu.año || edu.year || ""}</div>
      </div>
    `
      )
      .join("");
  }

  return '<p class="no-data">Sin educación registrada</p>';
}

function formatLanguages(languages) {
  if (!languages || (Array.isArray(languages) && languages.length === 0)) {
    return '<p class="no-data">Sin idiomas registrados</p>';
  }

  if (Array.isArray(languages)) {
    return languages
      .map(
        (lang) => `
      <div class="language-item">
        <strong>${lang.idioma || lang.language || "Idioma"}</strong>
        <span class="lang-level">${lang.nivel || lang.level || ""}</span>
      </div>
    `
      )
      .join("");
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

// ===== MODAL-SPECIFIC FUNCTIONS =====
function closeCVDetailModal() {
  closeModal("cv-detail-modal");
}

function openProductModal(id = null) {
  // Clear form
  document.getElementById("product-id").value = "";
  document.getElementById("product-name").value = "";
  document.getElementById("product-price").value = "";
  document.getElementById("product-description").value = "";
  document.getElementById("product-category").value = "CV_BASICO";
  document.getElementById("product-stock").value = "999";
  document.getElementById("product-image").value = "";

  document.getElementById("product-modal-title").textContent = "Nuevo Producto";
  openModal("product-modal");
}

function openEditProductModal(encodedData) {
  try {
    const product = JSON.parse(decodeURIComponent(encodedData));

    document.getElementById("product-id").value = product.id || "";
    document.getElementById("product-name").value = product.name || "";
    document.getElementById("product-price").value = product.price || "";
    document.getElementById("product-description").value =
      product.description || "";
    document.getElementById("product-category").value =
      product.category || "CV_BASICO";
    document.getElementById("product-stock").value = product.stock || "999";
    document.getElementById("product-image").value = product.imageUrl || "";

    document.getElementById("product-modal-title").textContent =
      "Editar Producto";
    openModal("product-modal");
  } catch (error) {
    console.error("Error parsing product data:", error);
    showToast("Error abriendo producto", "error");
  }
}

async function saveProduct(event) {
  event.preventDefault();

  const productId = document.getElementById("product-id").value;
  const productData = {
    name: document.getElementById("product-name").value,
    price: parseFloat(document.getElementById("product-price").value),
    description: document.getElementById("product-description").value,
    category: document.getElementById("product-category").value,
    stock: parseInt(document.getElementById("product-stock").value) || 999,
    imageUrl: document.getElementById("product-image").value,
    isActive: true,
  };

  try {
    if (productId) {
      // Update existing product
      await api.updateAdminProduct(productId, productData);
      showToast("Producto actualizado correctamente", "success");
    } else {
      // Create new product
      await api.createAdminProduct(productData);
      showToast("Producto creado correctamente", "success");
    }

    closeProductModal();
    loadProducts();
  } catch (error) {
    console.error("Error guardando producto:", error);
    showToast("Error guardando producto: " + error.message, "error");
  }
}

function toggleProductStatus(productId, activate, productName) {
  const action = activate ? "activar" : "dar de baja";
  const title = activate ? "Activar Producto" : "Dar de Baja Producto";
  const icon = activate ? "fa-check-circle" : "fa-ban";
  const btnClass = activate ? "confirm-activate" : "confirm-deactivate";

  showConfirmDialog({
    title: title,
    message: `¿Le gustaría ${action} el producto <strong>${productName}</strong>?`,
    icon: icon,
    confirmText: activate ? "Sí, Activar" : "Sí, Dar de Baja",
    confirmClass: btnClass,
    onConfirm: async () => {
      try {
        await api.updateAdminProduct(productId, { isActive: activate });
        showToast(
          `Producto ${activate ? "activado" : "dado de baja"} correctamente`,
          "success"
        );
        loadProducts();
      } catch (error) {
        console.error("Error actualizando producto:", error);
        showToast("Error actualizando producto", "error");
      }
    },
  });
}

function closeProductModal() {
  closeModal("product-modal");
}

function openUserModal(id = null) {
  // TODO: Implement user editing when id is provided
  openModal("user-modal");
}

function closeUserModal() {
  closeModal("user-modal");
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

// ===== DESCARGA DE FOTO DE PERFIL =====
function downloadPhoto(fileName) {
  if (!currentCVSubmission) {
    showToast("No hay datos del CV", "error");
    return;
  }

  const photoData =
    currentCVSubmission.photoBase64 || currentCVSubmission.photoUrl;

  if (!photoData) {
    showToast("No hay foto disponible", "error");
    return;
  }

  // Crear elemento de descarga
  const link = document.createElement("a");
  link.href = photoData;

  // Limpiar nombre de archivo
  const cleanName = fileName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_");

  // Detectar extensión desde el data URI
  let extension = "jpg";
  if (photoData.includes("image/png")) {
    extension = "png";
  } else if (photoData.includes("image/webp")) {
    extension = "webp";
  }

  link.download = `foto_${cleanName}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Foto descargada", "success");
}
