// Servidor API simple para testing
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true,
  })
);
app.use(express.json());

// JWT Secret
const JWT_SECRET =
  process.env.JWT_SECRET || "994c43955f7284645a057e44aba3c696310388a8a";

// Usuarios en memoria (para testing)
// Password: admin123 (hash generado con bcrypt)
const users = [
  {
    id: 1,
    email: "admin@cvargentina.com",
    password: "$2a$10$rQnM1TxGqSvNM3f5rVqXhO7s1K2tY8yQZ3mNlP4JKvF5W6hL8uI0G", // admin123
    fullName: "Administrador",
    phone: "+54 11 1234-5678",
    role: "admin",
    isActive: true,
  },
];

// Inicializar password del admin correctamente
(async () => {
  users[0].password = await bcrypt.hash("admin123", 10);
  console.log("✅ Password del admin inicializado");
})();

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor API funcionando" });
});

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    // Validar
    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    // Verificar si existe
    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      fullName,
      phone,
      role: "user",
    };

    users.push(newUser);

    // Generar token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    // Buscar usuario
    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Verificar password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// Me
app.get("/api/auth/me", (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
});

// ===== PRODUCTOS =====
const products = [
  {
    id: 1,
    name: "CV Básico",
    price: 2500,
    description: "CV profesional básico",
    category: "cv",
  },
  {
    id: 2,
    name: "CV Profesional",
    price: 5000,
    description: "CV completo optimizado",
    category: "cv",
  },
  {
    id: 3,
    name: "CV Premium",
    price: 8000,
    description: "CV premium con diseño",
    category: "cv",
  },
];

app.get("/api/products", (req, res) => {
  res.json({ success: true, products });
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }
  res.json({ success: true, product });
});

// ===== CARRITO =====
const carts = {}; // { userId: { items: [...] } }

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "No autorizado" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
};

// Obtener carrito
app.get("/api/cart", authMiddleware, (req, res) => {
  const userId = req.user.id;

  if (!carts[userId]) {
    carts[userId] = { items: [] };
  }

  // Calcular totales
  const subtotal = carts[userId].items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  res.json({
    success: true,
    cart: {
      id: userId,
      userId,
      items: carts[userId].items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          product,
        };
      }),
      subtotal,
      total: subtotal,
    },
  });
});

// Agregar al carrito
app.post("/api/cart", authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  if (!carts[userId]) {
    carts[userId] = { items: [] };
  }

  const product = products.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  // Verificar si ya existe
  const existingItem = carts[userId].items.find(
    (i) => i.productId === productId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    carts[userId].items.push({
      id: carts[userId].items.length + 1,
      productId,
      quantity,
    });
  }

  res.json({
    success: true,
    message: "Producto agregado al carrito",
    cart: carts[userId],
  });
});

// Actualizar cantidad
app.put("/api/cart/:itemId", authMiddleware, (req, res) => {
  const userId = req.user.id;
  const itemId = parseInt(req.params.itemId);
  const { quantity } = req.body;

  if (!carts[userId]) {
    return res.status(404).json({ error: "Carrito no encontrado" });
  }

  const item = carts[userId].items.find((i) => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: "Item no encontrado" });
  }

  item.quantity = quantity;

  res.json({
    success: true,
    message: "Cantidad actualizada",
    item,
  });
});

// Eliminar del carrito
app.delete("/api/cart/:itemId", authMiddleware, (req, res) => {
  const userId = req.user.id;
  const itemId = parseInt(req.params.itemId);

  if (!carts[userId]) {
    return res.status(404).json({ error: "Carrito no encontrado" });
  }

  carts[userId].items = carts[userId].items.filter((i) => i.id !== itemId);

  res.json({
    success: true,
    message: "Item eliminado",
  });
});

// ===== ADMINISTRACIÓN =====
// Middleware para verificar rol admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Acceso denegado. Se requiere rol de administrador." });
  }
  next();
};

// --- ADMIN: PRODUCTOS ---

// Obtener todos los productos (admin) - incluye inactivos
app.get("/api/admin/products", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    success: true,
    products: products.map((p) => ({ ...p, isActive: p.isActive !== false })),
  });
});

// Crear producto
app.post("/api/admin/products", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name, description, price, category, imageUrl, features, stock } =
      req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Nombre y precio son requeridos" });
    }

    const newProduct = {
      id: products.length + 1,
      name,
      description: description || "",
      price: parseFloat(price),
      category: category || "cv",
      imageUrl: imageUrl || "",
      features: features || [],
      stock: stock || 999,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    products.push(newProduct);

    res.json({
      success: true,
      message: "Producto creado exitosamente",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// Editar producto
app.put(
  "/api/admin/products/:id",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const productIndex = products.findIndex((p) => p.id === productId);

      if (productIndex === -1) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const {
        name,
        description,
        price,
        category,
        imageUrl,
        features,
        stock,
        isActive,
      } = req.body;

      products[productIndex] = {
        ...products[productIndex],
        name: name !== undefined ? name : products[productIndex].name,
        description:
          description !== undefined
            ? description
            : products[productIndex].description,
        price:
          price !== undefined
            ? parseFloat(price)
            : products[productIndex].price,
        category:
          category !== undefined ? category : products[productIndex].category,
        imageUrl:
          imageUrl !== undefined ? imageUrl : products[productIndex].imageUrl,
        features:
          features !== undefined ? features : products[productIndex].features,
        stock: stock !== undefined ? stock : products[productIndex].stock,
        isActive:
          isActive !== undefined ? isActive : products[productIndex].isActive,
        updatedAt: new Date().toISOString(),
      };

      res.json({
        success: true,
        message: "Producto actualizado exitosamente",
        product: products[productIndex],
      });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Error al actualizar producto" });
    }
  }
);

// Eliminar producto (soft delete)
app.delete(
  "/api/admin/products/:id",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const productIndex = products.findIndex((p) => p.id === productId);

      if (productIndex === -1) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      // Soft delete - marcar como inactivo
      products[productIndex].isActive = false;

      res.json({
        success: true,
        message: "Producto eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Error al eliminar producto" });
    }
  }
);

// --- ADMIN: USUARIOS ---

// Obtener todos los usuarios
app.get("/api/admin/users", authMiddleware, adminMiddleware, (req, res) => {
  const safeUsers = users.map(({ password, ...user }) => user);
  res.json({ success: true, users: safeUsers });
});

// Obtener un usuario específico
app.get("/api/admin/users/:id", authMiddleware, adminMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  const { password, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Editar usuario
app.put("/api/admin/users/:id", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const { fullName, phone, role, isActive } = req.body;

    users[userIndex] = {
      ...users[userIndex],
      fullName: fullName !== undefined ? fullName : users[userIndex].fullName,
      phone: phone !== undefined ? phone : users[userIndex].phone,
      role: role !== undefined ? role : users[userIndex].role,
      isActive: isActive !== undefined ? isActive : users[userIndex].isActive,
      updatedAt: new Date().toISOString(),
    };

    const { password, ...safeUser } = users[userIndex];

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      user: safeUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// Eliminar usuario (soft delete)
app.delete(
  "/api/admin/users/:id",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // No permitir eliminar al propio admin
      if (userId === req.user.id) {
        return res
          .status(400)
          .json({ error: "No puedes eliminarte a ti mismo" });
      }

      const userIndex = users.findIndex((u) => u.id === userId);

      if (userIndex === -1) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // Soft delete - marcar como inactivo
      users[userIndex].isActive = false;

      res.json({
        success: true,
        message: "Usuario desactivado exitosamente",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Error al eliminar usuario" });
    }
  }
);

// ===== INICIAR SERVIDOR =====
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Servidor API funcionando en puerto ${PORT}`);
  console.log(`${"=".repeat(50)}`);
  console.log(`\n📌 Endpoints disponibles:`);
  console.log(`   🌐 Health: http://localhost:${PORT}/health`);
  console.log(`   🔐 Register: POST /api/auth/register`);
  console.log(`   🔑 Login: POST /api/auth/login`);
  console.log(`   👤 Me: GET /api/auth/me`);
  console.log(`   📦 Products: GET /api/products`);
  console.log(`   🛒 Cart: GET/POST/PUT/DELETE /api/cart`);
  console.log(`\n🔒 Endpoints de Admin (requieren rol admin):`);
  console.log(`   📦 GET/POST /api/admin/products`);
  console.log(`   📦 PUT/DELETE /api/admin/products/:id`);
  console.log(`   👥 GET /api/admin/users`);
  console.log(`   👥 PUT/DELETE /api/admin/users/:id`);
  console.log(`\n👤 Admin por defecto:`);
  console.log(`   Email: admin@cvargentina.com`);
  console.log(`   Password: admin123`);
  console.log(`${"=".repeat(50)}\n`);
});
