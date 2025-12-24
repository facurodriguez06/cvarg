const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const prisma = new PrismaClient();

/**
 * GET /api/orders
 * Obtener órdenes del usuario
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error al obtener órdenes:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener órdenes",
    });
  }
});

/**
 * GET /api/orders/:id
 * Obtener una orden específica
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
        user: {
          select: {
            email: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Orden no encontrada",
      });
    }

    // Solo el dueño o admin puede ver la orden
    if (order.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        error: "No tienes permiso para ver esta orden",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error al obtener orden:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener orden",
    });
  }
});

module.exports = router;
