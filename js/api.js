/**
 * Servicio centralizado para comunicación con el Backend API
 * Maneja autenticación, headers y errores de forma consistente
 */

const API_URL = "http://localhost:3000/api"; // Cambiar en producción

class APIService {
  constructor() {
    this.baseURL = API_URL;
  }

  /**
   * Obtener token de autenticación
   */
  getToken() {
    return localStorage.getItem("authToken");
  }

  /**
   * Guardar token de autenticación
   */
  setToken(token) {
    localStorage.setItem("authToken", token);
  }

  /**
   * Eliminar token de autenticación
   */
  removeToken() {
    localStorage.removeItem("authToken");
  }

  /**
   * Obtener información del usuario autenticado
   */
  getUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Guardar información del usuario
   */
  setUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  /**
   * Eliminar información del usuario
   */
  removeUser() {
    localStorage.removeItem("user");
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Realizar petición HTTP
   */
  async request(endpoint, options = {}) {
    const token = this.getToken();

    const config = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    // Si hay body y no es FormData, convertir a JSON
    if (config.body && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    // Si es FormData, eliminar Content-Type para que el navegador lo establezca
    if (config.body instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // Si el token expiró, limpiar y redirigir
        if (response.status === 401) {
          this.removeToken();
          this.removeUser();
          // Opcional: redirigir a login
        }
        throw new Error(data.error || `Error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // MÉTODOS DE AUTENTICACIÓN
  // ===========================

  async register(userData) {
    try {
      const data = await this.request("/auth/register", {
        method: "POST",
        body: userData,
      });

      if (data.success) {
        this.setToken(data.token);
        this.setUser(data.user);
      }

      return data;
    } catch (error) {
      // Fallback: registro local si el backend no está disponible
      console.warn("⚠️ Backend no disponible. Usando autenticación local.");
      return this.registerLocal(userData);
    }
  }

  async login(email, password) {
    try {
      console.log(
        "🔑 Intentando login en servidor:",
        this.baseURL + "/auth/login"
      );
      const data = await this.request("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      console.log("✅ Login exitoso:", data);
      if (data.success) {
        this.setToken(data.token);
        this.setUser(data.user);
      }

      return data;
    } catch (error) {
      console.warn("⚠️ Login en servidor falló:", error.message);

      // Solo usar fallback si el servidor no está disponible (error de conexión)
      if (
        error.message === "Failed to fetch" ||
        error.message.includes("NetworkError")
      ) {
        console.warn("⚠️ Servidor no disponible. Usando autenticación local.");
        return this.loginLocal(email, password);
      }

      // Si es un error del servidor (credenciales, etc), propagarlo
      throw error;
    }
  }

  async logout() {
    this.removeToken();
    this.removeUser();
  }

  async verifyEmail(email, code) {
    const data = await this.request("/auth/verify-email", {
      method: "POST",
      body: { email, code },
    });

    if (data.success) {
      this.setToken(data.token);
      this.setUser(data.user);
    }

    return data;
  }

  async resendVerificationCode(email) {
    return await this.request("/auth/resend-verification", {
      method: "POST",
      body: { email },
    });
  }

  // ===========================
  // MÉTODOS DE AUTENTICACIÓN LOCAL (FALLBACK)
  // ===========================

  registerLocal(userData) {
    // Obtener usuarios existentes
    const users = JSON.parse(localStorage.getItem("local_users") || "[]");

    // Verificar si el email ya existe
    if (users.find((u) => u.email === userData.email)) {
      throw new Error("Este email ya está registrado");
    }

    // Crear nuevo usuario
    const newUser = {
      id: Date.now().toString(),
      email: userData.email,
      fullName: userData.fullName,
      phone: userData.phone,
      password: btoa(userData.password), // Simple encoding (NO es seguro en producción)
      role: "user", // Rol por defecto
      createdAt: new Date().toISOString(),
    };

    // Guardar usuario
    users.push(newUser);
    localStorage.setItem("local_users", JSON.stringify(users));

    // Generar token simulado
    const token = btoa(
      JSON.stringify({
        userId: newUser.id,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    );

    // Guardar sesión
    this.setToken(token);
    this.setUser({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      phone: newUser.phone,
      role: "user",
    });

    return {
      success: true,
      token: token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
      },
      message: "Cuenta creada localmente (modo offline)",
    };
  }

  loginLocal(email, password) {
    // Usuario admin por defecto (siempre disponible)
    const defaultAdmin = {
      id: "admin-1",
      email: "admin@cvargentina.com",
      password: btoa("admin123"), // admin123
      fullName: "Administrador",
      phone: "+54 11 1234-5678",
      role: "admin",
    };

    // Obtener usuarios locales
    let users = JSON.parse(localStorage.getItem("local_users") || "[]");

    // Buscar si existe el admin
    const adminIndex = users.findIndex((u) => u.email === defaultAdmin.email);

    if (adminIndex === -1) {
      // No existe, agregarlo
      users.push(defaultAdmin);
    } else {
      // Existe, actualizar su password y rol (por si tiene datos antiguos)
      users[adminIndex] = { ...users[adminIndex], ...defaultAdmin };
    }

    localStorage.setItem("local_users", JSON.stringify(users));

    // Buscar usuario
    const user = users.find((u) => u.email === email);

    if (!user) {
      throw new Error("Email no encontrado");
    }

    // Verificar contraseña
    if (atob(user.password) !== password) {
      throw new Error("Contraseña incorrecta");
    }

    // Generar token simulado
    const token = btoa(
      JSON.stringify({
        userId: user.id,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })
    );

    // Guardar sesión (incluyendo rol)
    this.setToken(token);
    this.setUser({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role || "user", // Importante: incluir el rol
    });

    return {
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role || "user",
      },
      message: "Inicio de sesión local (modo offline)",
    };
  }

  async getMe() {
    return await this.request("/auth/me", { method: "GET" });
  }

  // ===========================
  // MÉTODOS DE PRODUCTOS
  // ===========================

  async getProducts(filters = {}) {
    const params = new URLSearchParams(filters);
    return await this.request(`/products?${params}`, { method: "GET" });
  }

  async getProduct(id) {
    return await this.request(`/products/${id}`, { method: "GET" });
  }

  // ===========================
  // MÉTODOS DE CARRITO
  // ===========================

  async getCart() {
    return await this.request("/cart", { method: "GET" });
  }

  async addToCart(productId, quantity = 1) {
    return await this.request("/cart/add", {
      method: "POST",
      body: { productId, quantity },
    });
  }

  async updateCartItem(itemId, quantity) {
    return await this.request(`/cart/update/${itemId}`, {
      method: "PUT",
      body: { quantity },
    });
  }

  async removeFromCart(itemId) {
    return await this.request(`/cart/remove/${itemId}`, {
      method: "DELETE",
    });
  }

  async clearCart() {
    return await this.request("/cart/clear", {
      method: "DELETE",
    });
  }

  // ===========================
  // MÉTODOS DE CUPONES
  // ===========================

  async validateCoupon(code) {
    return await this.request("/coupons/validate", {
      method: "POST",
      body: { code },
    });
  }

  // ===========================
  // MÉTODOS DE PAGOS
  // ===========================

  async createPaymentPreference(couponCode = null) {
    try {
      // En modo simplificado, NO sincronizar con backend
      // Solo usar el carrito local directamente
      const localCart = JSON.parse(localStorage.getItem("temp_cart") || "[]");

      if (localCart.length === 0) {
        throw new Error("El carrito está vacío");
      }

      console.log("📦 Carrito local:", localCart);

      // Crear preferencia directamente sin sincronizar
      const response = await this.request("/payments/create-preference", {
        method: "POST",
        body: {
          couponCode,
          items: localCart, // Enviar items directamente
        },
      });

      return response;
    } catch (error) {
      console.error("Error al crear preferencia:", error);
      throw error;
    }
  }

  async getPaymentStatus(orderId) {
    return await this.request(`/payments/status/${orderId}`, {
      method: "GET",
    });
  }

  async confirmPayment(orderId) {
    return await this.request(`/payments/confirm-payment/${orderId}`, {
      method: "POST",
    });
  }

  // ===========================
  // MÉTODOS DE ÓRDENES
  // ===========================

  async getOrders() {
    return await this.request("/orders", { method: "GET" });
  }

  async getOrder(id) {
    return await this.request(`/orders/${id}`, { method: "GET" });
  }

  // ===========================
  // MÉTODOS DE FORMULARIO CV
  // ===========================

  async submitCVForm(formData) {
    // formData debe ser un FormData object para incluir archivos
    return await this.request("/cvform/submit", {
      method: "POST",
      body: formData,
    });
  }

  async getCVSubmissions() {
    return await this.request("/cvform/submissions", {
      method: "GET",
    });
  }

  async getCVSubmission(id) {
    return await this.request(`/cvform/${id}`, {
      method: "GET",
    });
  }

  // ===========================
  // MÉTODOS DE CONTACTO
  // ===========================

  async sendContactMessage(messageData) {
    return await this.request("/contact", {
      method: "POST",
      body: messageData,
    });
  }

  // ===========================
  // MÉTODOS DE ADMINISTRACIÓN
  // ===========================

  /**
   * Verificar si el usuario actual es administrador
   */
  isAdmin() {
    const user = this.getUser();
    return user && user.role === "admin";
  }

  // --- ADMIN: PRODUCTOS ---

  async getAdminProducts() {
    return await this.request("/admin/products", { method: "GET" });
  }

  async createAdminProduct(productData) {
    return await this.request("/admin/products", {
      method: "POST",
      body: productData,
    });
  }

  async updateAdminProduct(productId, productData) {
    return await this.request(`/admin/products/${productId}`, {
      method: "PUT",
      body: productData,
    });
  }

  async deleteAdminProduct(productId) {
    return await this.request(`/admin/products/${productId}`, {
      method: "DELETE",
    });
  }

  // --- ADMIN: USUARIOS ---

  async getAdminUsers() {
    return await this.request("/admin/users", { method: "GET" });
  }

  async getAdminUser(userId) {
    return await this.request(`/admin/users/${userId}`, { method: "GET" });
  }

  async updateAdminUser(userId, userData) {
    return await this.request(`/admin/users/${userId}`, {
      method: "PUT",
      body: userData,
    });
  }

  async deleteAdminUser(userId) {
    return await this.request(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  // --- ADMIN: ÓRDENES ---

  async getAdminOrders(status = null) {
    const params = status ? `?status=${status}` : "";
    return await this.request(`/admin/orders${params}`, { method: "GET" });
  }

  async updateAdminOrderStatus(orderId, status) {
    return await this.request(`/admin/orders/${orderId}/status`, {
      method: "PUT",
      body: { status },
    });
  }

  // --- ADMIN: FORMULARIOS CV ---

  async getAdminCVSubmissions() {
    return await this.request("/admin/cv-submissions", { method: "GET" });
  }

  async getAdminCVSubmission(id) {
    return await this.request(`/admin/cv-submissions/${id}`, { method: "GET" });
  }

  async updateAdminCVSubmissionStatus(id, status) {
    return await this.request(`/admin/cv-submissions/${id}/status`, {
      method: "PUT",
      body: { status },
    });
  }

  async generateAIContent(submissionId, section = "all") {
    return await this.request(
      `/admin/cv-submissions/${submissionId}/generate-ai`,
      {
        method: "POST",
        body: { section },
      }
    );
  }
}

// Exportar instancia única del servicio
const api = new APIService();
