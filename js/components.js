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

    // Obtener pedidos del servidor - endpoint correcto es /orders
    const response = await fetch(`${api.baseURL}/orders`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al cargar pedidos");
    }

    const data = await response.json();
    const orders = data.orders || data || [];

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
      // Determinar estado del pedido y formulario
      const hasPendingForm = order.status === "PAID" && !order.formCompleted;
      const formSent = order.formCompleted === true;

      // Estado visual
      let statusInfo;
      if (hasPendingForm) {
        statusInfo = {
          label: "Formulario Pendiente",
          icon: "📝",
          class: "status-pending",
        };
      } else if (formSent) {
        statusInfo = {
          label: "Formulario Enviado",
          icon: "✅",
          class: "status-completed",
        };
      } else {
        statusInfo = getOrderStatusInfo(order.status);
      }

      const orderId = order.orderNumber || order.id;
      const orderDate = order.createdAt
        ? formatDate(order.createdAt)
        : formatDate(order.date);

      return `
      <div class="order-card">
        <div class="order-header">
          <div class="order-id-section">
            <strong class="order-id">#${orderId}</strong>
            <span class="order-date">${orderDate}</span>
          </div>
          <span class="order-status ${statusInfo.class}">
            ${statusInfo.icon} ${statusInfo.label}
          </span>
        </div>
        
        <div class="order-body">
          <div class="order-total">
            <span>Total:</span>
            <strong>$${parseFloat(order.total || 0).toLocaleString(
              "es-AR"
            )}</strong>
          </div>
        </div>
        
        <div class="order-footer">
          ${
            hasPendingForm
              ? `<button onclick="goToForm('${order.id}')" class="btn-complete-form">
                  <i class="fas fa-edit"></i> Completar datos
                </button>`
              : `<button onclick="viewOrderReceipt('${order.id}')" class="btn-view-receipt">
                  <i class="fas fa-receipt"></i> Ver Comprobante
                </button>`
          }
        </div>
      </div>
    `;
    })
    .join("");

  content.innerHTML = ordersHTML;
}

// Función para ver el comprobante del pedido
function viewOrderReceipt(orderId) {
  window.location.href = `exito.html?id=${orderId}`;
}

function getOrderStatusInfo(status) {
  const statusMap = {
    // Estados en inglés (del backend)
    PENDING: { label: "Pendiente", icon: "🟡", class: "status-pending" },
    PAID: { label: "Pagado", icon: "🟢", class: "status-paid" },
    IN_PROGRESS: {
      label: "En proceso",
      icon: "🔵",
      class: "status-processing",
    },
    COMPLETED: { label: "Completado", icon: "✅", class: "status-completed" },
    CANCELLED: { label: "Cancelado", icon: "❌", class: "status-cancelled" },
    // Estados en español (por si acaso)
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
  // No mostrar en la página de formulario ni en éxito
  if (window.location.pathname.includes("formulario.html")) return;
  if (window.location.pathname.includes("exito.html")) return;

  // Si no hay token, no podemos verificar
  if (!api.isAuthenticated()) return;

  try {
    // Buscar CVSubmissions PENDING del usuario
    const response = await fetch(`${api.baseURL}/cvform/pending`, {
      headers: { Authorization: `Bearer ${api.getToken()}` },
    });

    if (response.ok) {
      const data = await response.json();

      if (data.hasPending && data.submission) {
        // Hay un formulario pendiente - mostrar banner
        const orderId = data.submission.orderId || data.submission.id;
        showFormBanner(orderId);
      }
    }
  } catch (error) {
    console.warn("Error verificando formularios pendientes:", error);
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

  // === MOBILE MENU TOGGLE ===
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");

      // Cambiar ícono de hamburguesa a X
      const icon = menuToggle.querySelector("i");
      if (icon) {
        if (navLinks.classList.contains("active")) {
          icon.classList.remove("fa-bars");
          icon.classList.add("fa-times");
        } else {
          icon.classList.remove("fa-times");
          icon.classList.add("fa-bars");
        }
      }
    });

    // Cerrar menú al hacer click en un link
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
        const icon = menuToggle.querySelector("i");
        if (icon) {
          icon.classList.remove("fa-times");
          icon.classList.add("fa-bars");
        }
      });
    });
  }
});

console.log("✅ Components.js loaded");
