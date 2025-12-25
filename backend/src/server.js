require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Importar rutas
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const couponRoutes = require("./routes/coupons");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payments");
const cvformRoutes = require("./routes/cvform");
const contactRoutes = require("./routes/contact");
const adminRoutes = require("./routes/admin");

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// ===========================
// MIDDLEWARE DE SEGURIDAD
// ===========================

// Helmet - Protege headers HTTP
app.use(helmet());

// CORS - Permite peticiones desde el frontend
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ].filter(Boolean),

    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate Limiting - Previene ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por IP
  message: "Demasiadas solicitudes desde esta IP, por favor intenta más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Rate Limiting estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Máximo 5 intentos de login
  message:
    "Demasiados intentos de inicio de sesión, por favor intenta más tarde.",
  skipSuccessfulRequests: true,
});

// ===========================
// MIDDLEWARE DE PARSEO
// ===========================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Servir archivos estáticos (uploads)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ===========================
// RUTAS DE LA API
// ===========================

// Ruta de salud del servidor
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Rutas principales
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/cvform", cvformRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);

// ===========================
// MANEJO DE ERRORES
// ===========================

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
    path: req.path,
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Error de validación de Prisma
  if (err.code === "P2002") {
    return res.status(400).json({
      success: false,
      error: "Ya existe un registro con estos datos",
      field: err.meta?.target,
    });
  }

  // Error de token JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Token inválido",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Token expirado",
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ===========================
// INICIAR SERVIDOR
// ===========================
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Servidor Backend Iniciado               ║
║                                              ║
║   Puerto: ${PORT}                            ║
║   Entorno: ${process.env.NODE_ENV || "development"}          ║
║   URL: http://localhost:${PORT}              ║
╚═══════════════════════════════════════════════╝
  `);

  console.log(`🔐 JWT configurado: ${process.env.JWT_SECRET ? "Sí" : "No"}`);
  console.log(
    `💳 Mercado Pago: ${
      process.env.MP_ACCESS_TOKEN ? "Configurado" : "No configurado"
    }`
  );

  // Start AI worker
  if (process.env.GROQ_API_KEY) {
    const aiWorker = require("./services/ai-worker");
    aiWorker.start();
    console.log(`🤖 AI Worker iniciado con Groq - Procesamiento cada 1 minuto`);
  } else {
    console.warn("⚠️ Groq API Key no configurada - AI Worker deshabilitado");
  }
});

// Manejo de errores no capturados
process.on("unhandledRejection", (err) => {
  console.error("❌ Error no manejado:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Excepción no capturada:", err);
  process.exit(1);
});

module.exports = app;
