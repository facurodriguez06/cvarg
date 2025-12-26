// CARRITO SIMPLE CON NOTIFICACIONES BONITAS

// Función de inicialización
function initCarrito() {
  console.log("🛒 Cargando carrito...");

  try {
    // Verificar si volvemos de Mercado Pago (puede fallar, pero no debe bloquear el carrito)
    try {
      checkPaymentResponse();
    } catch (e) {
      console.warn("⚠️ Error en checkPaymentResponse:", e.message);
    }

    // Carrito inicializado correctamente

    loadAndDisplayCart();
    updateCartCounter();
    console.log("✅ Carrito.js cargado y listo");
  } catch (error) {
    console.error("❌ Error crítico en initCarrito:", error);
    // Intentar al menos mostrar el carrito aunque haya error
    try {
      loadAndDisplayCart();
      updateCartCounter();
    } catch (e) {
      console.error("❌ Error al renderizar carrito:", e);
    }
  }
}

// Ejecutar cuando el DOM esté listo (soporta carga tarde del script)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCarrito);
} else {
  // DOM ya está listo, ejecutar inmediatamente
  initCarrito();
}

// Verificar respuesta de pago de Mercado Pago
function checkPaymentResponse() {
  const urlParams = new URLSearchParams(window.location.search);

  // MP puede devolver diferentes parámetros según la ruta:
  // - payment=success (custom, configurado en back_urls)
  // - status=approved (estándar de MP)
  // - collection_status=approved (estándar de MP)
  const paymentParam = urlParams.get("payment");
  const statusParam = urlParams.get("status");
  const collectionStatus = urlParams.get("collection_status");
  const paymentId =
    urlParams.get("payment_id") || urlParams.get("collection_id");

  // Determinar si el pago fue exitoso usando cualquiera de los parámetros
  let paymentStatus = null;
  if (paymentParam === "success" || paymentParam === "approved") {
    paymentStatus = "success";
  } else if (statusParam === "approved" || collectionStatus === "approved") {
    paymentStatus = "approved";
  } else if (paymentParam === "pending" || statusParam === "pending") {
    paymentStatus = "pending";
  } else if (paymentParam === "failure" || statusParam === "rejected") {
    paymentStatus = "failure";
  }

  if (paymentStatus) {
    console.log("🔍 Payment status detected:", paymentStatus);
    console.log("🔍 Window opener exists:", !!window.opener);
    console.log(
      "🔍 Window opener closed:",
      window.opener ? window.opener.closed : "N/A"
    );

    // Si estamos en una pestaña abierta desde otra (window.opener existe)
    const hasOpener = window.opener && !window.opener.closed;

    console.log("🔍 Has valid opener:", hasOpener);

    // SIEMPRE comunicar a la ventana padre si estamos en la pestaña de MP
    if (paymentStatus) {
      const paymentData = {
        type: "PAYMENT_COMPLETED",
        status: paymentStatus === "approved" ? "success" : paymentStatus,
        paymentId: paymentId,
        timestamp: Date.now(),
      };

      console.log("📤 Sending payment data via localStorage:", paymentData);

      // Método principal: localStorage (más confiable entre pestañas)
      localStorage.setItem("payment_completed", JSON.stringify(paymentData));
      console.log(
        "✅ localStorage set:",
        localStorage.getItem("payment_completed")
      );

      // Si hay opener válido, también intentar postMessage
      if (hasOpener) {
        try {
          window.opener.postMessage(paymentData, window.location.origin);
          console.log("✅ postMessage sent to parent window");
        } catch (e) {
          console.error("❌ Error con postMessage:", e);
        }
      }

      // Mostrar mensaje breve en la pestaña de MP
      showNotification(
        paymentStatus === "success" || paymentStatus === "approved"
          ? "¡Pago exitoso! Confirmando..."
          : paymentStatus === "pending"
          ? "Pago pendiente. Puedes cerrar esta pestaña."
          : "Pago rechazado. Puedes cerrar esta pestaña.",
        paymentStatus === "success" || paymentStatus === "approved"
          ? "success"
          : paymentStatus === "pending"
          ? "info"
          : "error"
      );

      console.log("✅ Payment data communicated");

      // Si el pago fue exitoso, confirmar manualmente (solo desarrollo)
      if (paymentStatus === "success" || paymentStatus === "approved") {
        console.log("🔧 [DEV] Calling manual confirmation endpoint...");

        const orderId = localStorage.getItem("pending_order_id");
        if (orderId) {
          // Llamar al endpoint de confirmación manual
          api
            .confirmPayment(orderId)
            .then((response) => {
              console.log("✅ Payment confirmed manually:", response);
              showNotification("¡Pago confirmado! Redirigiendo...", "success");

              // Limpiar carrito
              localStorage.removeItem("temp_cart");
              localStorage.removeItem("pending_order_id");
              updateCartCounter();

              // Guardar flag de formulario pendiente
              localStorage.setItem("pending_form_order", orderId);

              // Redirigir después de 1.5 segundos
              setTimeout(() => {
                console.log("🚀 NOW redirecting to formulario.html...");
                window.location.href = "formulario.html";
              }, 1500);
            })
            .catch((error) => {
              console.error("❌ Error confirming payment:", error);
              showNotification("Error al confirmar el pago", "error");
            });
        }
      } else {
        // Para pagos pendientes o rechazados, solo limpiar URL
        setTimeout(() => {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }, 3000);
      }
    }
  }
}

// Sistema de notificaciones con estilo
function showNotification(message, type = "info") {
  // Crear contenedor si no existe
  let container = document.getElementById("notificationContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "notificationContainer";
    container.style.cssText =
      "position: fixed; top: 20px; right: 20px; z-index: 10000;";
    document.body.appendChild(container);
  }

  // Crear notificación
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    background: ${
      type === "error"
        ? "linear-gradient(135deg, #fee2e2, #fecaca)"
        : type === "success"
        ? "linear-gradient(135deg, #dcfce7, #a7f3d0)"
        : "linear-gradient(135deg, #dbeafe, #bfdbfe)"
    };
    color: ${
      type === "error" ? "#991b1b" : type === "success" ? "#166534" : "#1e40af"
    };
    padding: 16px 24px;
    border-radius: 12px;
    margin-bottom: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    animation: slideIn 0.3s ease;
    border: 2px solid ${
      type === "error" ? "#f87171" : type === "success" ? "#4ade80" : "#60a5fa"
    };
  `;

  const icon = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
  notification.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span>${message}</span>`;

  container.appendChild(notification);

  // Remover después de 4 segundos
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function loadAndDisplayCart() {
  const cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
  console.log("📦 Productos en temp_cart:", cart.length);

  const container = document.getElementById("cartItemsContainer");
  const summary = document.getElementById("cartSummary");
  const emptyMsg = document.getElementById("emptyCartMessage");
  const badge = document.getElementById("cart-count");

  if (cart.length === 0) {
    console.log("❌ Carrito vacío");
    if (container) container.style.display = "none";
    if (summary) summary.style.display = "none";
    if (emptyMsg) emptyMsg.style.display = "block";
    if (badge) badge.style.display = "none";
    return;
  }

  console.log("✅ Mostrando", cart.length, "productos");
  if (container) container.style.display = "flex";
  if (summary) summary.style.display = "block";
  if (emptyMsg) emptyMsg.style.display = "none";

  let subtotal = 0;
  if (container) {
    container.innerHTML = "";

    cart.forEach((item, index) => {
      const itemTotal = item.price * (item.quantity || 1);
      subtotal += itemTotal;

      container.innerHTML += `
        <div class="cart-item">
          <div class="item-icon"><i class="${
            item.icon || "fas fa-star"
          }"></i></div>
          <div class="item-info">
            <h3>${item.name}</h3>
            <p>Cantidad: ${item.quantity || 1}</p>
          </div>
          <div class="item-price">$${itemTotal.toLocaleString()}</div>
          <button class="btn-remove" onclick="removeItem(${index})">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;
    });
  }

  if (badge) {
    const totalItems = cart.reduce(
      (acc, item) => acc + (item.quantity || 1),
      0
    );
    badge.innerText = totalItems;
    badge.style.display = "flex";
  }

  updateTotals(subtotal);
}

function removeItem(index) {
  const cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
  const removedItem = cart[index];
  cart.splice(index, 1);
  localStorage.setItem("temp_cart", JSON.stringify(cart));
  loadAndDisplayCart();
  showNotification(`${removedItem.name} eliminado del carrito`, "success");
}

function updateTotals(subtotal) {
  const subtotalEl = document.getElementById("subtotalPrice");
  const totalEl = document.getElementById("totalPrice");
  const discountRow = document.querySelector(".summary-row.discount");
  const discountEl = document.querySelector(
    ".summary-row.discount span:last-child"
  );

  // Verificar si hay cupón aplicado
  const appliedCoupon = JSON.parse(localStorage.getItem("applied_coupon"));
  let finalTotal = subtotal;

  if (appliedCoupon && subtotal > 0) {
    const discountAmount = subtotal * appliedCoupon.discountPercent;
    finalTotal = subtotal - discountAmount;

    // Mostrar fila de descuento
    if (discountRow) {
      discountRow.style.display = "flex";
      discountEl.innerText = `-$${discountAmount.toLocaleString()} (${
        appliedCoupon.code
      })`;
    }
  } else {
    // Ocultar descuento
    if (discountRow) discountRow.style.display = "none";
  }

  if (subtotalEl) subtotalEl.innerText = `$${subtotal.toLocaleString()}`;
  if (totalEl) totalEl.innerText = `$${finalTotal.toLocaleString()}`;
}

// Alias para consistencia
const updateCartSummary = loadAndDisplayCart;

async function clearCart() {
  const cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
  if (cart.length === 0) {
    showNotification("El carrito ya está vacío", "info");
    return;
  }

  // Confirmación con modal personalizado
  const confirmed = await showConfirm({
    title: "Vaciar Carrito",
    message: "¿Estás seguro de vaciar el carrito?",
    confirmText: "Vaciar",
    cancelText: "Cancelar",
    type: "danger",
  });
  if (confirmed) {
    localStorage.removeItem("temp_cart");
    loadAndDisplayCart();
    showNotification("Carrito vaciado correctamente", "success");
  }
}

// Proceder al pago con Mercado Pago (en popup)
async function proceedToCheckout() {
  const cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");

  if (cart.length === 0) {
    showNotification(
      "El carrito está vacío. Agrega productos antes de pagar.",
      "error"
    );
    return;
  }

  // Verificar autenticación
  const isAuth = localStorage.getItem("authToken");

  if (!isAuth) {
    showNotification("Debes iniciar sesión para continuar con el pago", "info");
    setTimeout(() => {
      window.location.href = "login.html?redirect=carrito.html";
    }, 1500);
    return;
  }

  // Mostrar loading
  showNotification("Preparando pago...", "info");

  try {
    // Crear preferencia en backend
    const response = await api.createPaymentPreference();

    if (response.success && response.initPoint) {
      // Cambiar estado del botón
      const payBtn = document.getElementById("checkout-btn");
      if (payBtn) {
        payBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Esperando pago...';
        payBtn.disabled = true;
      }

      showNotification("Abriendo Mercado Pago...", "success");

      // Guardar orderId para verificar después
      localStorage.setItem("pending_order_id", response.orderId);

      // Abrir Mercado Pago en nueva pestaña del mismo navegador
      const mpTab = window.open(response.initPoint, "_blank");

      if (!mpTab) {
        if (payBtn) {
          payBtn.innerHTML = "Pagar con Mercado Pago";
          payBtn.disabled = false;
        }
        throw new Error(
          "No se pudo abrir la pestaña. Verifica que no esté bloqueada por el navegador."
        );
      }

      // Mostrar botón de confirmación manual después de 5 segundos
      setTimeout(() => {
        const confirmBtn = document.getElementById("confirm-payment-btn");
        if (confirmBtn) {
          confirmBtn.style.display = "block";
        }
      }, 5000);

      // Iniciar polling para verificar el pago
      startPaymentPolling(response.orderId, mpTab);
    } else {
      throw new Error("No se pudo crear la preferencia de pago");
    }
  } catch (error) {
    console.error("Error al procesar pago:", error);

    // Restaurar botón
    const payBtn = document.getElementById("checkout-btn");
    if (payBtn) {
      payBtn.innerHTML = "Pagar con Mercado Pago";
      payBtn.disabled = false;
    }

    showNotification(
      error.message ||
        "Error al conectar con Mercado Pago. Verifica que el backend esté corriendo.",
      "error"
    );
  }
}

// Función para confirmar pago manualmente (cuando el usuario ya pagó en MP)
async function confirmPaymentManually() {
  const orderId = localStorage.getItem("pending_order_id");

  if (!orderId) {
    showNotification("No hay un pago pendiente", "error");
    return;
  }

  const confirmBtn = document.getElementById("confirm-payment-btn");
  if (confirmBtn) {
    confirmBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Confirmando...';
    confirmBtn.disabled = true;
  }

  try {
    console.log("🔧 Confirmando pago manualmente para orden:", orderId);
    const response = await api.confirmPayment(orderId);

    if (response.success) {
      showNotification("¡Pago confirmado! Redirigiendo...", "success");

      // Limpiar carrito y storage
      localStorage.removeItem("temp_cart");
      localStorage.removeItem("pending_order_id");
      updateCartCounter();

      // Guardar flag de formulario pendiente
      localStorage.setItem("pending_form_order", orderId);

      // Ocultar botón de confirmación
      if (confirmBtn) {
        confirmBtn.style.display = "none";
      }

      // Redirigir después de 1 segundo
      setTimeout(() => {
        console.log("🚀 Redirigiendo a formulario.html...");
        window.location.href = "formulario.html";
      }, 1000);
    } else {
      throw new Error(response.error || "Error al confirmar el pago");
    }
  } catch (error) {
    console.error("Error al confirmar pago:", error);
    showNotification(
      error.message || "Error al confirmar el pago. Intenta nuevamente.",
      "error"
    );

    // Restaurar botón
    if (confirmBtn) {
      confirmBtn.innerHTML =
        '<i class="fas fa-check-circle"></i> Ya pagué - Confirmar pago';
      confirmBtn.disabled = false;
    }
  }
}

// Polling para verificar el estado del pago
function startPaymentPolling(orderId, mpTab) {
  let pollCount = 0;
  const maxPolls = 36; // 3 minutos máximo con intervalo de 5s (36 * 5s = 180s)

  console.log("🔔 Starting payment polling for order:", orderId);

  // Listener para postMessage (comunicación directa entre pestañas)
  const messageListener = (event) => {
    console.log("📨 Received message event:", event.data);
    // Verificar origen por seguridad (en producción, verificar el dominio exacto)
    if (event.data && event.data.type === "PAYMENT_COMPLETED") {
      console.log("✅ Payment completed message received!");
      handlePaymentComplete(
        event.data,
        mpTab,
        pollInterval,
        messageListener,
        storageListener
      );
    }
  };

  // Listener para localStorage (backup si postMessage no funciona)
  const storageListener = (e) => {
    console.log("💾 Storage event:", e.key, e.newValue);
    if (e.key === "payment_completed" && e.newValue) {
      console.log("✅ Payment completed via localStorage!");
      const paymentData = JSON.parse(e.newValue);
      handlePaymentComplete(
        paymentData,
        mpTab,
        pollInterval,
        messageListener,
        storageListener
      );
    }
  };

  window.addEventListener("message", messageListener);
  window.addEventListener("storage", storageListener);

  console.log("✅ Event listeners attached");

  // Polling híbrido: backend + ventana
  const pollInterval = setInterval(async () => {
    pollCount++;

    // 1. Consultar al backend si el pago se aprobó (Más confiable)
    try {
      const res = await fetch(`${api.baseURL}/payments/status/${orderId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      const data = await res.json();

      // El backend devuelve { success: true, order: { status: 'PAID' } }
      const orderStatus = data.order?.status;
      if (
        orderStatus === "PAID" ||
        data.status === "approved" ||
        data.status === "success"
      ) {
        console.log("✅ Backend confirmed payment approved!");
        handlePaymentComplete(
          { status: "success" },
          mpTab,
          pollInterval,
          messageListener,
          storageListener
        );
        return;
      }
    } catch (err) {
      // Ignorar errores de red en polling para no spammear
    }

    if (pollCount % 10 === 0) {
      console.log(
        `⏱️ Polling... ${pollCount}/${maxPolls} - Tab closed: ${mpTab.closed}`
      );
    }

    // Verificar si la pestaña fue cerrada manualmente
    if (mpTab.closed) {
      console.log("🚪 Payment tab closed");
      clearInterval(pollInterval);
      window.removeEventListener("message", messageListener);
      window.removeEventListener("storage", storageListener);

      // Verificar si hay flag de pago completado
      const paymentCompleted = localStorage.getItem("payment_completed");
      console.log("🔍 Checking payment_completed flag:", paymentCompleted);
      if (paymentCompleted) {
        const paymentData = JSON.parse(paymentCompleted);
        console.log("✅ Found payment data, processing...");
        handlePaymentComplete(
          paymentData,
          mpTab,
          pollInterval,
          messageListener,
          storageListener
        );
      } else {
        console.log("❌ No payment data found");
        showNotification("Pago cancelado", "error");
        localStorage.removeItem("pending_order_id");
      }
      return;
    }

    // Timeout
    if (pollCount >= maxPolls) {
      console.log("⏰ Polling timeout reached");
      clearInterval(pollInterval);
      window.removeEventListener("message", messageListener);
      window.removeEventListener("storage", storageListener);

      // ÚLTIMA VERIFICACIÓN: Consultar backend por si el pago SÍ se procesó pero no recibimos notificación
      console.log("🔍 Haciendo verificación final del backend...");
      const orderId = localStorage.getItem("pending_order_id");
      if (orderId) {
        fetch(`${api.baseURL}/payments/status/${orderId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            console.log("📊 Estado final del pedido:", data.order?.status);
            if (data.order?.status === "PAID") {
              // ¡El pago SÍ fue procesado!
              console.log("✅ Pago fue confirmado, redirigiendo...");
              handlePaymentComplete(
                { status: "success" },
                mpTab,
                pollInterval,
                messageListener,
                storageListener
              );
            } else {
              // Realmente no se procesó
              console.log("❌ Pago no fue procesado");
              if (!mpTab.closed) {
                mpTab.close();
              }
              showNotification(
                "Tiempo de espera agotado. Intenta nuevamente.",
                "error"
              );
              localStorage.removeItem("pending_order_id");
            }
          })
          .catch((err) => {
            console.error("Error en verificación final:", err);
            if (!mpTab.closed) {
              mpTab.close();
            }
            showNotification(
              "Tiempo de espera agotado. Intenta nuevamente.",
              "error"
            );
            localStorage.removeItem("pending_order_id");
          });
      } else {
        if (!mpTab.closed) {
          mpTab.close();
        }
        showNotification(
          "Tiempo de espera agotado. Intenta nuevamente.",
          "error"
        );
        localStorage.removeItem("pending_order_id");
      }
      return;
    }
  }, 5000); // Cambiado a 5 segundos para reducir carga del servidor
}

// Manejar pago completado
function handlePaymentComplete(
  paymentData,
  mpTab,
  pollInterval,
  messageListener,
  storageListener
) {
  console.log("🎉 handlePaymentComplete called with:", paymentData);

  // Limpiar listeners e interval
  clearInterval(pollInterval);
  window.removeEventListener("message", messageListener);
  window.removeEventListener("storage", storageListener);
  console.log("✅ Listeners and interval cleared");

  // NO cerramos la pestaña de MP - el usuario puede querer capturar pantalla
  console.log("📸 MP tab remains open for user screenshots");

  // Limpiar flag
  localStorage.removeItem("payment_completed");
  console.log("🧹 payment_completed flag removed");

  if (paymentData.status === "success") {
    console.log("✅ Payment SUCCESS - redirecting to formulario");
    showNotification("¡Pago exitoso! Redirigiendo...", "success");

    // Limpiar carrito
    localStorage.removeItem("temp_cart");
    const orderId = localStorage.getItem("pending_order_id");

    // Guardar flag de formulario pendiente
    if (orderId) {
      localStorage.setItem("pending_form_order", orderId);
      console.log(`📝 Set pending form for order: ${orderId}`);
    }

    localStorage.removeItem("pending_order_id");
    console.log("🧹 Cart cleared");

    // Actualizar contador
    updateCartCounter();
    console.log("🔄 Cart counter updated");

    // Redirigir al formulario
    console.log("🚀 Redirecting to formulario.html in 1.5s...");
    setTimeout(() => {
      console.log("🚀 NOW redirecting...");
      window.location.href = "formulario.html";
    }, 1500);
  } else if (paymentData.status === "failure") {
    console.log("❌ Payment FAILED");

    // Restaurar botón
    const payBtn = document.getElementById("checkout-btn");
    if (payBtn) {
      payBtn.innerHTML = "Pagar con Mercado Pago";
      payBtn.disabled = false;
    }

    showNotification("El pago fue rechazado. Intenta nuevamente.", "error");
    localStorage.removeItem("pending_order_id");
  } else if (paymentData.status === "pending") {
    console.log("⏳ Payment PENDING");
    showNotification("Pago pendiente de confirmación", "info");
    localStorage.removeItem("pending_order_id");
  }
}

// Aplicar cupón
async function applyCoupon() {
  const input = document.getElementById("couponInput");
  const btn = document.querySelector(".btn-apply"); // Obtener botón
  const code = input?.value.trim().toUpperCase();

  if (!code) {
    showNotification("Ingresa un código de cupón", "error");
    return;
  }

  // Estado de carga
  if (btn) {
    const originalText = btn.innerText;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aplicando...';
    btn.classList.add("btn-loading");
  }

  try {
    const response = await api.validateCoupon(code);

    if (response && response.success && response.coupon) {
      // Guardar cupón en localStorage
      const couponData = {
        code: response.coupon.code,
        discountPercent: response.coupon.discountPercent,
        maxDiscount: response.coupon.maxDiscount, // Guardar tope si existe
        id: response.coupon.id,
      };

      localStorage.setItem("applied_coupon", JSON.stringify(couponData));

      showNotification(
        `¡Cupón "${code}" aplicado! ${
          response.coupon.discountPercent * 100
        }% de descuento`,
        "success"
      );

      // Actualizar visualmente el subtotal y total
      updateCartSummary();
    } else {
      throw new Error(response.error || "Cupón inválido");
    }
  } catch (error) {
    console.error("Error al aplicar cupón:", error);
    showNotification(error.message || "Cupón no válido o expirado", "error");
    localStorage.removeItem("applied_coupon"); // Limpiar si falla
    updateCartSummary();
  } finally {
    // Restaurar botón
    if (btn) {
      btn.innerText = "Aplicar";
      btn.classList.remove("btn-loading");
    }
  }

  if (input) input.value = "";
}

function removeCoupon() {
  localStorage.removeItem("applied_coupon");
  updateCartSummary();
  showNotification("Cupón eliminado", "info");
}

// Navegación
function closeMenu() {
  const navLinks = document.querySelector(".nav-links");
  const menuToggle = document.querySelector(".menu-toggle");
  if (navLinks) navLinks.classList.remove("active");
  if (menuToggle) {
    const icon = menuToggle.querySelector("i");
    if (icon) {
      icon.classList.remove("fa-times");
      icon.classList.add("fa-bars");
    }
  }
}

function updateTotals(subtotal) {
  const subtotalEl = document.getElementById("subtotalPrice");
  const totalEl = document.getElementById("totalPrice");
  const discountRow = document.querySelector(".summary-row.discount");
  const discountEl = document.querySelector(
    ".summary-row.discount span:last-child"
  );

  // Verificar si hay cupón aplicado
  const appliedCoupon = JSON.parse(localStorage.getItem("applied_coupon"));
  let finalTotal = subtotal;

  if (appliedCoupon && subtotal > 0) {
    let discountAmount = subtotal * appliedCoupon.discountPercent;

    // Aplicar tope si existe
    if (
      appliedCoupon.maxDiscount &&
      discountAmount > appliedCoupon.maxDiscount
    ) {
      discountAmount = appliedCoupon.maxDiscount;
    }

    finalTotal = subtotal - discountAmount;

    // Mostrar fila de descuento
    if (discountRow) {
      discountRow.style.display = "flex";
      discountEl.innerHTML = `
        -$${discountAmount.toLocaleString()} (${appliedCoupon.code})
        <button class="remove-coupon" onclick="removeCoupon()" title="Quitar cupón">
            <i class="fas fa-times"></i>
        </button>
      `;
    }
  } else {
    // Ocultar descuento
    if (discountRow) discountRow.style.display = "none";
  }

  if (subtotalEl) subtotalEl.innerText = `$${subtotal.toLocaleString()}`;
  if (totalEl) totalEl.innerText = `$${finalTotal.toLocaleString()}`;
}

async function clearCart() {
  const cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
  if (cart.length === 0) {
    showNotification("El carrito ya está vacío", "info");
    return;
  }

  if (confirm("¿Estás seguro de vaciar el carrito?")) {
    localStorage.removeItem("temp_cart");
    localStorage.removeItem("applied_coupon"); // Auto-remove coupon
    loadAndDisplayCart();
    showNotification("Carrito vaciado", "success");
  }
}

// NOTA: El código del menu toggle está en el script inline de carrito.html
// para evitar conflictos de redeclaración de variables

// Agregar estilos para animaciones
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }
`;
document.head.appendChild(style);

// Actualizar contador del carrito en el navbar
function updateCartCounter() {
  const badge = document.getElementById("cart-count");
  const cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
  const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  if (badge) {
    badge.innerText = totalItems;
    badge.style.display = totalItems > 0 ? "flex" : "none";
  }
}

console.log("✅ Carrito.js cargado y listo");

// Modal overlay functions (support for existing HTML markup)
function showModal(title, msg, type = "info") {
  const overlay = document.getElementById("modalOverlay");
  const titleEl = document.getElementById("modalTitle");
  const msgEl = document.getElementById("modalMsg");
  const icon = document.getElementById("modalIcon");

  if (!overlay || !titleEl || !msgEl || !icon) return;

  titleEl.innerText = title;
  msgEl.innerText = msg;
  icon.className = "fas modal-icon";

  if (type === "error") {
    icon.classList.add("fa-exclamation-circle", "error");
    icon.style.color = "var(--danger)";
  } else if (type === "success") {
    icon.classList.add("fa-check-circle", "success");
    icon.style.color = "var(--success)";
  } else {
    icon.classList.add("fa-info-circle");
    icon.style.color = "var(--primary-blue)";
  }

  overlay.style.display = "flex";
}

function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) overlay.style.display = "none";
}
