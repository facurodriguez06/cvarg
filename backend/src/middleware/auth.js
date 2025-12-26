const jwt = require("jsonwebtoken");

/**
 * Middleware de autenticación JWT
 * Verifica que el usuario tenga un token válido
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Acceso denegado. No se proporcionó token de autenticación.",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario exista en la BD (para evitar errores de FK si se borró)
    // Usamos require aquí para evitar dependencia circular en top-level si fuera necesario
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Usuario no encontrado. Inicia sesión nuevamente.",
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expirado. Por favor, inicia sesión nuevamente.",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Token inválido.",
    });
  }
};

/**
 * Middleware para verificar si el usuario es admin
 */
const isAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      error: "Acceso denegado. Se requieren permisos de administrador.",
    });
  }
  next();
};

/**
 * Middleware opcional - permite acceso a usuarios autenticados y no autenticados
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    }
  } catch (error) {
    // Continuar sin usuario autenticado
  }

  next();
};

module.exports = { authMiddleware, isAdmin, optionalAuth };
