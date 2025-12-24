const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { validate } = require("../middleware/validation");
const { authMiddleware } = require("../middleware/auth");

const prisma = new PrismaClient();

/**
 * Generar token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres"),
    body("fullName")
      .trim()
      .isLength({ min: 3 })
      .withMessage("El nombre debe tener al menos 3 caracteres"),
    body("phone").optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password, fullName, phone } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Este email ya está registrado",
        });
      }

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          phone,
          role: "CLIENT",
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      // Crear carrito automáticamente
      await prisma.cart.create({
        data: { userId: user.id },
      });

      // Generar token
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        token,
        user,
      });
    } catch (error) {
      console.error("Error en registro:", error);
      res.status(500).json({
        success: false,
        error: "Error al registrar usuario",
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
    body("password").notEmpty().withMessage("La contraseña es requerida"),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Email o contraseña incorrectos",
        });
      }

      // Verificar si está activo
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: "Cuenta desactivada. Contacta al soporte.",
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: "Email o contraseña incorrectos",
        });
      }

      // Generar token
      const token = generateToken(user);

      // Remover password de la respuesta
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: "Inicio de sesión exitoso",
        token,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({
        success: false,
        error: "Error al iniciar sesión",
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Obtener información del usuario autenticado
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener información del usuario",
    });
  }
});

/**
 * PUT /api/auth/update-profile
 * Actualizar perfil del usuario
 */
router.put(
  "/update-profile",
  authMiddleware,
  [
    body("fullName").optional().trim().isLength({ min: 3 }),
    body("phone").optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { fullName, phone } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(fullName && { fullName }),
          ...(phone && { phone }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
        },
      });

      res.json({
        success: true,
        message: "Perfil actualizado exitosamente",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      res.status(500).json({
        success: false,
        error: "Error al actualizar perfil",
      });
    }
  }
);

module.exports = router;
