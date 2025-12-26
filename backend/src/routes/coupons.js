const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, isAdmin } = require("../middleware/auth");

const prisma = new PrismaClient();

/**
 * POST /api/coupons/validate
 * Validar un cupón
 */
router.post("/validate", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Debes proporcionar un código de cupón",
      });
    }

    // Buscar cupón
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: "Cupón no encontrado",
      });
    }

    // Validaciones
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        error: "Este cupón ya no está activo",
      });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: "Este cupón ha expirado",
      });
    }

    if (coupon.usageCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        error: "Este cupón ha alcanzado su límite de usos",
      });
    }

    // Verificar usos por usuario
    const userUsageCount = await prisma.couponUsage.count({
      where: {
        userId: req.user.id,
        couponId: coupon.id,
      },
    });

    if (userUsageCount >= coupon.usesPerUser) {
      return res.status(400).json({
        success: false,
        error: "Ya has usado este cupón el máximo de veces permitidas",
      });
    }

    res.json({
      success: true,
      message: `¡Cupón válido! ${
        parseFloat(coupon.discountPercent) * 100
      }% de descuento`,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountPercent: parseFloat(coupon.discountPercent),
        maxDiscount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null,
        description: coupon.description,
      },
    });
  } catch (error) {
    console.error("Error al validar cupón:", error);
    res.status(500).json({
      success: false,
      error: "Error al validar cupón",
    });
  }
});

/**
 * POST /api/coupons/use
 * Registrar uso de cupón (llamado internamente al crear orden)
 */
router.post("/use", authMiddleware, async (req, res) => {
  try {
    const { couponId } = req.body;

    // Crear registro de uso
    await prisma.couponUsage.create({
      data: {
        userId: req.user.id,
        couponId: couponId,
      },
    });

    // Incrementar contador de usos
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        usageCount: { increment: 1 },
      },
    });

    res.json({
      success: true,
      message: "Cupón aplicado exitosamente",
    });
  } catch (error) {
    console.error("Error al usar cupón:", error);
    res.status(500).json({
      success: false,
      error: "Error al aplicar cupón",
    });
  }
});

/**
 * GET /api/coupons (solo admin)
 * Listar todos los cupones
 */
router.get("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    console.error("Error al obtener cupones:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener cupones",
    });
  }
});

/**
 * POST /api/coupons (solo admin)
 * Crear nuevo cupón
 */
router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const {
      code,
      discountPercent,
      maxDiscount,
      description,
      maxUsage,
      usesPerUser,
      expiresAt,
    } = req.body;

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountPercent: parseFloat(discountPercent),
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        description,
        maxUsage: maxUsage || 100,
        usesPerUser: usesPerUser || 1,
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      },
    });

    res.status(201).json({
      success: true,
      message: "Cupón creado exitosamente",
      coupon,
    });
  } catch (error) {
    console.error("Error al crear cupón:", error);
    res.status(500).json({
      success: false,
      error: "Error al crear cupón",
    });
  }
});

/**
 * PUT /api/coupons/:id (solo admin)
 * Actualizar cupón
 */
router.put("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { isActive, expiresAt, maxUsage, maxDiscount } = req.body;

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
        ...(maxUsage !== undefined && { maxUsage }),
        ...(maxDiscount !== undefined && {
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        }),
      },
    });

    res.json({
      success: true,
      message: "Cupón actualizado exitosamente",
      coupon,
    });
  } catch (error) {
    console.error("Error al actualizar cupón:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar cupón",
    });
  }
});

module.exports = router;
