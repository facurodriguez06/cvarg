const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { validate } = require("../middleware/validation");
const { authMiddleware } = require("../middleware/auth");
const {
  generateVerificationCode,
  sendVerificationEmail,
} = require("../services/email");

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
        // Si existe pero está pendiente de verificación, permitir reenviar código
        if (existingUser.status === "PENDING_VERIFICATION") {
          return res.status(400).json({
            success: false,
            error:
              "Este email ya está registrado pero pendiente de verificación. Usa 'Reenviar código'.",
            needsVerification: true,
          });
        }
        return res.status(400).json({
          success: false,
          error: "Este email ya está registrado",
        });
      }

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario con status PENDING_VERIFICATION
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          phone,
          role: "CLIENT",
          status: "PENDING_VERIFICATION",
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      // Crear carrito automáticamente
      await prisma.cart.create({
        data: { userId: user.id },
      });

      // Generar código de verificación
      const code = generateVerificationCode();

      // Guardar código en BD (expira en 15 minutos)
      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code: code,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
        },
      });

      // Enviar email con código
      await sendVerificationEmail(email, code, fullName);

      // NO devolver token - el usuario debe verificar primero
      res.status(201).json({
        success: true,
        message:
          "Cuenta creada. Revisa tu email para el código de verificación.",
        requiresVerification: true,
        email: user.email,
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
 * POST /api/auth/verify-email
 * Verificar código de email y activar cuenta
 */
router.post(
  "/verify-email",
  [
    body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
    body("code").isLength({ min: 6, max: 6 }).withMessage("Código inválido"),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, code } = req.body;

      // Buscar usuario
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      // Verificar si ya está activo
      if (user.status === "ACTIVE") {
        return res.status(400).json({
          success: false,
          error: "Esta cuenta ya está verificada",
        });
      }

      // Buscar código válido
      const verificationCode = await prisma.verificationCode.findFirst({
        where: {
          userId: user.id,
          code: code,
          used: false,
          expiresAt: { gt: new Date() }, // No expirado
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verificationCode) {
        return res.status(400).json({
          success: false,
          error: "Código inválido o expirado",
        });
      }

      // Marcar código como usado y activar usuario
      await prisma.$transaction([
        prisma.verificationCode.update({
          where: { id: verificationCode.id },
          data: { used: true },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { status: "ACTIVE" },
        }),
      ]);

      // Generar token
      const token = generateToken(user);

      res.json({
        success: true,
        message: "¡Email verificado! Tu cuenta está activa.",
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Error en verificación:", error);
      res.status(500).json({
        success: false,
        error: "Error al verificar el código",
      });
    }
  }
);

/**
 * POST /api/auth/resend-verification
 * Reenviar código de verificación
 */
router.post(
  "/resend-verification",
  [body("email").isEmail().normalizeEmail().withMessage("Email inválido")],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Buscar usuario
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      // Verificar si necesita verificación
      if (user.status !== "PENDING_VERIFICATION") {
        return res.status(400).json({
          success: false,
          error: "Esta cuenta ya está verificada",
        });
      }

      // Invalidar códigos anteriores
      await prisma.verificationCode.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      // Generar nuevo código
      const code = generateVerificationCode();

      // Guardar nuevo código
      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code: code,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      // Enviar email
      await sendVerificationEmail(email, code, user.fullName);

      res.json({
        success: true,
        message: "Nuevo código enviado a tu email",
      });
    } catch (error) {
      console.error("Error al reenviar código:", error);
      res.status(500).json({
        success: false,
        error: "Error al reenviar el código",
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
          status: true,
          isActive: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Email o contraseña incorrectos",
        });
      }

      // Verificar si requiere verificación de email
      if (user.status === "PENDING_VERIFICATION") {
        return res.status(403).json({
          success: false,
          error:
            "Tu cuenta no está verificada. Revisa tu email e ingresa el código de verificación.",
          needsVerification: true,
          email: user.email,
        });
      }

      // Verificar si está suspendido
      if (user.status === "SUSPENDED" || !user.isActive) {
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
