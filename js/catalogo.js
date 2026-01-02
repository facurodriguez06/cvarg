// API URL - Cargar productos desde la base de datos
// Se utiliza api.js para manejar la URL base
// ============================================

// CARGA DE PRODUCTOS DESDE LA BASE DE DATOS
// CARGA DE PRODUCTOS DESDE LA BASE DE DATOS
// CARGA DE PRODUCTOS DESDE LA BASE DE DATOS
async function loadServices() {
  const container = document.getElementById("productsContainer");
  const CACHE_KEY = "products_cache";
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hora en milisegundos

  // 1. Intentar cargar desde caché primero (para velocidad instantánea)
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      const isFresh = Date.now() - timestamp < CACHE_DURATION;

      if (isFresh && data && data.length > 0) {
        console.log("⚡ Cargando desde caché local");
        renderProducts(data);
        // Si es fresco, terminamos aquí (no hacemos fetch)
        return;
      }
    } catch (e) {
      console.warn("Error al leer caché", e);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // 2. Si no hay caché o es viejo, cargar de la API
  try {
    const data = await api.getProducts();

    // La API devuelve { products: [...] } o array directo
    const products = Array.isArray(data) ? data : data.products || [];

    // Filtrar solo productos activos
    const activeProducts = products.filter((p) => p.isActive !== false);

    if (activeProducts.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; width:100%;">No hay servicios disponibles.</p>';
    } else {
      renderProducts(activeProducts);

      // 3. Guardar en caché para la próxima
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: activeProducts,
          timestamp: Date.now(),
        })
      );
    }
  } catch (error) {
    console.error(error);
    // Si falló la API pero tenemos caché (aunque sea viejo), usarlo como fallback
    if (cached) {
      console.warn("⚠️ API falló, usando caché expirado como fallback");
      try {
        const { data } = JSON.parse(cached);
        if (data && data.length > 0) {
          renderProducts(data);
          showToast("Modo offline: mostrando datos guardados");
          return;
        }
      } catch (e) {}
    }

    container.innerHTML = `
            <div style="text-align:center; width:100%; grid-column:1/-1;">
                <i class="fas fa-wifi" style="font-size: 2rem; color: #cbd5e1; margin-bottom:10px;"></i>
                <p>No se pudo cargar el catálogo.</p>
            </div>`;
  }
}

// Mapear categoría de BD a categoría de filtro
function getCategoryFilter(dbCategory) {
  const categoryMap = {
    CV_BASICO: "cv",
    CV_PROFESIONAL: "cv",
    CV_PREMIUM: "cv",
    CONSULTORIA: "linkedin",
    OTRO: "web",
  };
  return categoryMap[dbCategory] || "cv";
}

// Obtener icono según categoría
function getIconByCategory(category, name) {
  // Primero verificar por nombre
  const nameLower = name.toLowerCase();
  if (nameLower.includes("linkedin") || nameLower.includes("computrabajo")) {
    return "fab fa-linkedin";
  }
  if (nameLower.includes("portafolio") || nameLower.includes("web")) {
    return "fas fa-laptop-code";
  }
  if (
    nameLower.includes("inglés") ||
    nameLower.includes("ingles") ||
    nameLower.includes("traducción")
  ) {
    return "fas fa-language";
  }
  if (nameLower.includes("carta")) {
    return "fas fa-envelope-open-text";
  }
  if (nameLower.includes("pack")) {
    if (nameLower.includes("total") || nameLower.includes("vip"))
      return "fas fa-crown";
    if (nameLower.includes("full")) return "fas fa-rocket";
    return "fas fa-paper-plane";
  }

  // Por categoría
  const categoryIcons = {
    CV_BASICO: "fas fa-file-alt",
    CV_PROFESIONAL: "fas fa-file-signature",
    CV_PREMIUM: "fas fa-user-tie",
    CONSULTORIA: "fab fa-linkedin",
    OTRO: "fas fa-star",
  };
  return categoryIcons[category] || "fas fa-star";
}

// Obtener badge según características
function getBadge(product) {
  const nameLower = product.name.toLowerCase();
  const descLower = product.description.toLowerCase();

  if (nameLower.includes("portafolio") || nameLower.includes("nuevo"))
    return { text: "Nuevo", class: "new" };
  if (nameLower.includes("carrera total") || descLower.includes("vip"))
    return { text: "VIP", class: "" };
  if (nameLower.includes("full digital") || descLower.includes("más vendido"))
    return { text: "Más Vendido", class: "" };
  if (nameLower.includes("despegue") || descLower.includes("ahorra"))
    return { text: "Ahorra", class: "" };
  if (nameLower.includes("pro")) return { text: "Popular", class: "" };
  return null;
}

function renderProducts(products) {
  const container = document.getElementById("productsContainer");
  container.innerHTML = "";

  products.forEach((prod, index) => {
    const iconClass = getIconByCategory(prod.category, prod.name);
    const categoryFilter = getCategoryFilter(prod.category);
    const badge = getBadge(prod);

    let badgeHTML = "";
    if (badge) {
      badgeHTML = `<div class="badge ${badge.class}">${badge.text}</div>`;
    }

    const priceFormatted = prod.price.toLocaleString("es-AR");

    const html = `
                <article class="product-card" data-category="${categoryFilter}" style="animation-delay: ${
      index * 0.1
    }s">
                    ${badgeHTML}
                    <div class="card-icon"><i class="${iconClass}"></i></div>
                    <h3 class="card-title">${prod.name}</h3>
                    <p class="card-desc">${prod.description}</p>
                    <div class="card-footer">
                        <div class="price">$${priceFormatted} <small>ARS</small></div>
                        <button class="btn-add" onclick="addToCart('${
                          prod.id
                        }', '${prod.name.replace(/'/g, "\\'")}', ${
      prod.price
    }, '${iconClass}')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </article>
            `;
    container.insertAdjacentHTML("beforeend", html);
  });
}

function filterProducts(cat, btn) {
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  const cards = document.querySelectorAll(".product-card");
  cards.forEach((card) => {
    if (cat === "all" || card.dataset.category.includes(cat)) {
      card.style.display = "flex";
      card.style.animation = "none";
      card.offsetHeight; /* trigger reflow */
      card.style.animation = "fadeUp 0.5s ease forwards";
    } else {
      card.style.display = "none";
    }
  });
}

// --- FUNCIONES COMUNES (NAVBAR, CART) ---
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("active");
  const i = menuToggle.querySelector("i");
  i.classList.toggle("fa-bars");
  i.classList.toggle("fa-times");
});
function closeMenu() {
  navLinks.classList.remove("active");
  menuToggle.querySelector("i").classList.remove("fa-times");
  menuToggle.querySelector("i").classList.add("fa-bars");
}

window.addEventListener("scroll", function () {
  const nav = document.getElementById("navbar");
  if (window.scrollY > 20) nav.classList.add("scrolled");
  else nav.classList.remove("scrolled");
});

document.addEventListener("DOMContentLoaded", () => {
  loadServices();
  updateCartCounter();
});

function addToCart(id, name, price, icon) {
  let cart = JSON.parse(localStorage.getItem("temp_cart")) || [];
  let item = cart.find((i) => i.id === id);
  if (item) item.quantity++;
  else cart.push({ id, name, price, icon, quantity: 1 });

  localStorage.setItem("temp_cart", JSON.stringify(cart));
  updateCartCounter();
  showToast(`${name} agregado`);
}

function updateCartCounter() {
  let cart = JSON.parse(localStorage.getItem("temp_cart")) || [];
  let total = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const badge = document.getElementById("cart-count");
  if (badge) {
    badge.innerText = total;
    badge.style.display = total === 0 ? "none" : "flex";
  }
}

function showToast(msg) {
  const container = document.getElementById("notificationContainer");
  const toast = document.createElement("div");
  toast.className = "toast show";
  toast.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
