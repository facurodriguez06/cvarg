// COMPONENTES GLOBALES REUTILIZABLES

// =========================================
// SISTEMA DE NOTIFICACIONES PERSONALIZADAS
// =========================================

/**
 * Mostrar una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duración en ms (default 3000)
 */
function showNotification(message, type = "info", duration = 3000) {
  // Crear contenedor si no existe
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  // Crear notificación
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;

  const icons = {
    success: "fa-check-circle",
    error: "fa-times-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };

  notification.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(notification);

  // Auto-remover después del tiempo
  setTimeout(() => {
    notification.classList.add("notification-hide");
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// =========================================
// MODAL DE CONFIRMACIÓN PERSONALIZADO
// =========================================

/**
 * Mostrar modal de confirmación personalizado
 * @param {Object} options - Opciones del modal
 * @param {string} options.title - Título del modal
 * @param {string} options.message - Mensaje del modal
 * @param {string} options.confirmText - Texto del botón confirmar
 * @param {string} options.cancelText - Texto del botón cancelar
 * @param {string} options.type - Tipo: 'danger', 'warning', 'info'
 * @returns {Promise<boolean>} - Promesa que resuelve true/false
 */
function showConfirm(options = {}) {
  return new Promise((resolve) => {
    const {
      title = "Confirmar acción",
      message = "¿Estás seguro de continuar?",
      confirmText = "Confirmar",
      cancelText = "Cancelar",
      type = "warning",
    } = options;

    // Remover modal existente si hay
    const existing = document.getElementById("custom-confirm-modal");
    if (existing) existing.remove();

    const icons = {
      danger: "fa-exclamation-triangle",
      warning: "fa-question-circle",
      info: "fa-info-circle",
      success: "fa-check-circle",
    };

    const modalHTML = `
      <div class="custom-modal-overlay" id="custom-confirm-modal">
        <div class="custom-modal custom-modal-${type}">
          <div class="custom-modal-icon">
            <i class="fas ${icons[type] || icons.warning}"></i>
          </div>
          <h3 class="custom-modal-title">${title}</h3>
          <p class="custom-modal-message">${message}</p>
          <div class="custom-modal-actions">
            <button class="custom-modal-btn custom-modal-btn-cancel" id="modal-cancel">
              ${cancelText}
            </button>
            <button class="custom-modal-btn custom-modal-btn-confirm custom-modal-btn-${type}" id="modal-confirm">
              ${confirmText}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modal = document.getElementById("custom-confirm-modal");
    const confirmBtn = document.getElementById("modal-confirm");
    const cancelBtn = document.getElementById("modal-cancel");

    // Animar entrada
    setTimeout(() => modal.classList.add("active"), 10);

    const closeModal = (result) => {
      modal.classList.remove("active");
      setTimeout(() => modal.remove(), 300);
      resolve(result);
    };

    confirmBtn.onclick = () => closeModal(true);
    cancelBtn.onclick = () => closeModal(false);
    modal.onclick = (e) => {
      if (e.target === modal) closeModal(false);
    };

    // ESC para cerrar
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        closeModal(false);
        document.removeEventListener("keydown", handleEsc);
      }
    };
    document.addEventListener("keydown", handleEsc);
  });
}

// Función helper para confirmaciones rápidas
async function confirmAction(message, options = {}) {
  return showConfirm({
    message,
    ...options,
  });
}

// =========================================
// MENÚ LATERAL DE PEDIDOS
// =========================================

function createOrdersSidebar() {
  const sidebarHTML = `
    <!-- Overlay oscuro -->
    <div class="sidebar-overlay" id="ordersOverlay" onclick="closeOrdersSidebar()"></div>
    
    <!-- Sidebar de pedidos -->
    <div class="orders-sidebar" id="ordersSidebar">
      <div class="sidebar-header">
        <h2><i class="fas fa-receipt"></i> Mis Pedidos</h2>
        <button class="close-sidebar" onclick="closeOrdersSidebar()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="sidebar-content" id="ordersContent">
        <div class="orders-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Cargando pedidos...</p>
        </div>
      </div>
    </div>
  `;

  // Insertar al final del body si no existe
  if (!document.getElementById("ordersSidebar")) {
    document.body.insertAdjacentHTML("beforeend", sidebarHTML);
  }
}

function openOrdersSidebar() {
  createOrdersSidebar();
  const sidebar = document.getElementById("ordersSidebar");
  const overlay = document.getElementById("ordersOverlay");

  sidebar.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevenir scroll

  loadUserOrders();
}

function closeOrdersSidebar() {
  const sidebar = document.getElementById("ordersSidebar");
  const overlay = document.getElementById("ordersOverlay");

  if (sidebar) sidebar.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = ""; // Restaurar scroll
}

async function loadUserOrders() {
  const content = document.getElementById("ordersContent");
  if (!content) return;

  try {
    // Verificar autenticación
    const authToken = localStorage.getItem("authToken");
    if (!authToken) {
      content.innerHTML = `
        <div class="empty-orders">
          <i class="fas fa-user-lock" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
          <h3>Inicia sesión para ver tus pedidos</h3>
          <a href="login.html" class="btn-primary" style="margin-top: 1rem;">
            Iniciar sesión
          </a>
        </div>
      `;
      return;
    }

    // Obtener pedidos del servidor
    const response = await fetch(`${api.baseURL}/orders/user`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al cargar pedidos");
    }

    const orders = await response.json();

    if (orders.length === 0) {
      content.innerHTML = `
        <div class="empty-orders">
          <i class="fas fa-shopping-bag" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem;"></i>
          <h3>No tienes pedidos aún</h3>
          <p style="color: #64748b;">Explora nuestro catálogo para comenzar</p>
          <a href="catalogo.html" class="btn-primary" style="margin-top: 1rem;">
            Ver catálogo
          </a>
        </div>
      `;
      return;
    }

    renderOrders(orders);
  } catch (error) {
    console.error("Error loading orders:", error);
    content.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error al cargar los pedidos</p>
        <button onclick="loadUserOrders()" class="btn-secondary">
          Reintentar
        </button>
      </div>
    `;
  }
}

function renderOrders(orders) {
  const content = document.getElementById("ordersContent");

  const ordersHTML = orders
    .map((order) => {
      const statusInfo = getOrderStatusInfo(order.status);
      const hasPendingForm = order.status === "PAID" && !order.formCompleted;

      return `
      <div class="order-card">
        <div class="order-header">
          <div>
            <strong>#${order.id}</strong>
            <span class="order-date">${formatDate(order.date)}</span>
          </div>
          <span class="order-status ${statusInfo.class}">
            ${statusInfo.icon} ${statusInfo.label}
          </span>
        </div>
        
        <div class="order-body">
          <div class="order-items">
            ${order.items_summary || "Sin detalles"}
          </div>
          <div class="order-total">
            <strong>$${order.total.toLocaleString("es-AR")}</strong>
          </div>
        </div>
        
        ${
          hasPendingForm
            ? `
          <div class="order-footer">
            <button onclick="goToForm('${order.id}')" class="btn-complete-form">
              <i class="fas fa-edit"></i> Completar datos
            </button>
          </div>
        `
            : ""
        }
        
        ${
          order.observations
            ? `
          <div class="order-observations">
            <small><i class="fas fa-comment"></i> ${order.observations}</small>
          </div>
        `
            : ""
        }
      </div>
    `;
    })
    .join("");

  content.innerHTML = ordersHTML;
}

function getOrderStatusInfo(status) {
  const statusMap = {
    PENDIENTE: { label: "Pendiente", icon: "🟡", class: "status-pending" },
    PAGADO: { label: "Pagado", icon: "🟢", class: "status-paid" },
    PROCESANDO: { label: "En proceso", icon: "🔵", class: "status-processing" },
    ENVIADO: { label: "Enviado", icon: "🟣", class: "status-shipped" },
    COMPLETADO: { label: "Completado", icon: "✅", class: "status-completed" },
  };

  return (
    statusMap[status] || { label: status, icon: "⚪", class: "status-unknown" }
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function goToForm(orderId) {
  localStorage.setItem("pending_form_order", orderId);
  window.location.href = `formulario.html?order=${orderId}`;
}

// =========================================
// BANNER DE FORMULARIO PENDIENTE
// =========================================

async function checkPendingForm() {
  const pendingOrder = localStorage.getItem("pending_form_order");

  if (pendingOrder && !window.location.pathname.includes("formulario.html")) {
    try {
      // Si no hay token, no podemos validar, así que por seguridad no mostramos nada
      // o verificamos si es lógica de guest (que por ahora no parece ser el caso principal)
      if (!api.isAuthenticated()) {
        return;
      }

      const order = await api.getOrder(pendingOrder);

      // Validar si realmente está pendiente de formulario
      // Debe estar PAGADO y NO tener formulario completado
      const hasPendingForm =
        order && order.status === "PAID" && !order.formCompleted;

      if (hasPendingForm) {
        showFormBanner(pendingOrder);
      } else {
        // Si ya no es válido (completado, cancelado, etc), limpiamos el storage
        console.log(
          "Limpiando orden pendiente inválida del storage:",
          pendingOrder
        );
        localStorage.removeItem("pending_form_order");
      }
    } catch (error) {
      console.warn("No se pudo validar la orden pendiente:", error);
      // Si da error 404 (no existe) o 403 (no es suya), borramos
      if (
        error.message.includes("404") ||
        error.message.includes("403") ||
        error.message.includes("Error 404")
      ) {
        localStorage.removeItem("pending_form_order");
      }
    }
  }
}

function showFormBanner(orderId) {
  // No mostrar si ya existe
  if (document.getElementById("formBanner")) return;

  const bannerHTML = `
    <div class="form-banner" id="formBanner">
      <div class="form-banner-content">
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>Tienes un formulario pendiente</strong>
          <p>Completa tus datos para el pedido #${orderId}</p>
        </div>
        <div class="form-banner-actions">
          <button onclick="goToForm('${orderId}')" class="btn-banner-primary">
            Completar ahora
          </button>
          <button onclick="dismissFormBanner()" class="btn-banner-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("afterbegin", bannerHTML);
}

function dismissFormBanner() {
  const banner = document.getElementById("formBanner");
  if (banner) {
    banner.style.animation = "slideOutUp 0.3s ease";
    setTimeout(() => banner.remove(), 300);
  }
}

// =========================================
// INICIALIZACIÓN
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  // Crear sidebar al cargar página
  createOrdersSidebar();

  // Verificar si hay formulario pendiente
  checkPendingForm();
});

console.log("✅ Components.js loaded");
