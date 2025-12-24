/**
 * Rutas de Administración
 * CRUD de productos y usuarios con Prisma
 */
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { authMiddleware } = require("../middleware/auth");

const prisma = new PrismaClient();

// Middleware para verificar rol admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      error: "Acceso denegado. Se requiere rol de administrador.",
    });
  }
  next();
};

// ===========================
// PRODUCTOS
// ===========================

/**
 * GET /api/admin/products
 * Obtener todos los productos (incluyendo inactivos)
 */
router.get("/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener productos",
    });
  }
});

/**
 * POST /api/admin/products
 * Crear nuevo producto
 */
router.post("/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, price, category, stock, imageUrl, features } =
      req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category: category || "CV_BASICO",
        stock: stock || 999,
        imageUrl,
        features: features || [],
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      product,
    });
  } catch (error) {
    console.error("Error creando producto:", error);
    res.status(500).json({
      success: false,
      error: "Error al crear producto",
    });
  }
});

/**
 * PUT /api/admin/products/:id
 * Actualizar producto
 */
router.put(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        category,
        stock,
        imageUrl,
        features,
        isActive,
      } = req.body;

      const product = await prisma.product.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price: parseFloat(price) }),
          ...(category && { category }),
          ...(stock !== undefined && { stock: parseInt(stock) }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(features && { features }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        success: true,
        message: "Producto actualizado exitosamente",
        product,
      });
    } catch (error) {
      console.error("Error actualizando producto:", error);
      res.status(500).json({
        success: false,
        error: "Error al actualizar producto",
      });
    }
  }
);

/**
 * DELETE /api/admin/products/:id
 * Eliminar producto (soft delete)
 */
router.delete(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: "Producto eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error eliminando producto:", error);
      res.status(500).json({
        success: false,
        error: "Error al eliminar producto",
      });
    }
  }
);

// ===========================
// USUARIOS
// ===========================

/**
 * GET /api/admin/users
 * Obtener todos los usuarios
 */
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener usuarios",
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Obtener usuario específico
 */
router.get("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
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
    console.error("Error obteniendo usuario:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener usuario",
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Actualizar usuario
 */
router.put("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, role, isActive, password } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role.toUpperCase();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      user,
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar usuario",
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Desactivar usuario (soft delete)
 */
router.delete(
  "/users/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que no se esté eliminando a sí mismo
      if (req.user.id === id) {
        return res.status(400).json({
          success: false,
          error: "No puedes desactivar tu propia cuenta",
        });
      }

      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: "Usuario desactivado exitosamente",
      });
    } catch (error) {
      console.error("Error desactivando usuario:", error);
      res.status(500).json({
        success: false,
        error: "Error al desactivar usuario",
      });
    }
  }
);

// ===========================
// ÓRDENES
// ===========================

/**
 * GET /api/admin/orders
 * Obtener todas las órdenes (para admin)
 */
router.get("/orders", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.query;

    // Filtrar por estados relevantes (excluir PENDING y CANCELLED por defecto)
    const statusFilter = status
      ? { status }
      : { status: { in: ["PAID", "IN_PROGRESS", "COMPLETED"] } };

    const orders = await prisma.order.findMany({
      where: statusFilter,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
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
    console.error("Error obteniendo órdenes:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener órdenes",
    });
  }
});

/**
 * PUT /api/admin/orders/:id/status
 * Actualizar estado de una orden
 */
router.put(
  "/orders/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validar que el estado sea válido
      const validStatuses = ["PAID", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Estado inválido. Debe ser uno de: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      // Obtener orden actual
      const currentOrder = await prisma.order.findUnique({
        where: { id },
      });

      if (!currentOrder) {
        return res.status(404).json({
          success: false,
          error: "Orden no encontrada",
        });
      }

      // Validar transiciones válidas
      const validTransitions = {
        PAID: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "CANCELLED"],
        COMPLETED: [], // No se puede cambiar desde completado
        CANCELLED: [], // No se puede cambiar desde cancelado
        PENDING: ["PAID", "CANCELLED"],
      };

      if (!validTransitions[currentOrder.status]?.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `No se puede cambiar de ${currentOrder.status} a ${status}`,
        });
      }

      // Actualizar estado
      const order = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: `Orden actualizada a ${status}`,
        order,
      });
    } catch (error) {
      console.error("Error actualizando orden:", error);
      res.status(500).json({
        success: false,
        error: "Error al actualizar orden",
      });
    }
  }
);

// ===========================
// CV SUBMISSIONS (FORMULARIOS)
// ===========================

/**
 * GET /api/admin/cv-submissions
 * Obtener todos los formularios CV
 */
router.get(
  "/cv-submissions",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const submissions = await prisma.cVSubmission.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        count: submissions.length,
        submissions,
      });
    } catch (error) {
      console.error("Error obteniendo submissions:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener formularios CV",
      });
    }
  }
);

/**
 * GET /api/admin/cv-submissions/:id
 * Obtener detalle de un formulario CV
 */
router.get(
  "/cv-submissions/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const submission = await prisma.cVSubmission.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
            },
          },
        },
      });

      if (!submission) {
        return res.status(404).json({
          success: false,
          error: "Formulario no encontrado",
        });
      }

      res.json({
        success: true,
        submission,
      });
    } catch (error) {
      console.error("Error obteniendo submission:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener formulario",
      });
    }
  }
);

/**
 * POST /api/admin/cv-submissions/:id/generate-ai
 * Enqueue AI generation job
 */
router.post(
  "/cv-submissions/:id/generate-ai",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { section = "all" } = req.body;

      // Obtener el formulario
      const submission = await prisma.cVSubmission.findUnique({
        where: { id },
      });

      if (!submission) {
        return res.status(404).json({
          success: false,
          error: "Formulario no encontrado",
        });
      }

      // Verificar que Groq está configurado
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({
          success: false,
          error: "API de Groq no configurada",
        });
      }

      // Enqueue the job instead of processing immediately
      const queueManager = require("../services/queue-manager");
      const job = queueManager.enqueue(id, section);

      res.json({
        success: true,
        jobId: job.id,
        status: job.status,
        message: "Solicitud encolada. Procesamiento iniciará en breve.",
      });
    } catch (error) {
      console.error("Error encolando solicitud IA:", error);
      res.status(500).json({
        success: false,
        error: "Error al encolar solicitud: " + error.message,
      });
    }
  }
);

/**
 * GET /api/admin/ai-queue/status/:jobId
 * Get status of an AI job
 */
router.get(
  "/ai-queue/status/:jobId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const queueManager = require("../services/queue-manager");

      const job = queueManager.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: "Job no encontrado",
        });
      }

      const position = queueManager.getQueuePosition(jobId);
      const pendingCount = queueManager.getPendingJobs().length;

      res.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          result: job.result,
          error: job.error,
          createdAt: job.createdAt,
          processedAt: job.processedAt,
        },
        queue: {
          position,
          pendingCount,
          estimatedWaitMinutes: position ? Math.ceil(position * 1) : 0, // 1 minute per job with Groq
        },
      });
    } catch (error) {
      console.error("Error obteniendo status de job:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener status",
      });
    }
  }
);

/**
 * GET /api/admin/ai-queue
 * Get entire queue (for debugging/monitoring)
 */
router.get("/ai-queue", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const queueManager = require("../services/queue-manager");
    const allJobs = queueManager.getAllJobs();

    res.json({
      success: true,
      queue: allJobs,
      stats: {
        total: allJobs.length,
        pending: allJobs.filter((j) => j.status === "pending").length,
        processing: allJobs.filter((j) => j.status === "processing").length,
        completed: allJobs.filter((j) => j.status === "completed").length,
        failed: allJobs.filter((j) => j.status === "failed").length,
      },
    });
  } catch (error) {
    console.error("Error obteniendo cola:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener cola",
    });
  }
});

/**
 * PUT /api/admin/cv-submissions/:id/status
 * Actualizar estado de un formulario CV
 */
router.put(
  "/cv-submissions/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["PENDING", "IN_REVIEW", "COMPLETED", "DELIVERED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Estado inválido. Debe ser uno de: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      const submission = await prisma.cVSubmission.update({
        where: { id },
        data: { status },
      });

      res.json({
        success: true,
        message: `Formulario actualizado a ${status}`,
        submission,
      });
    } catch (error) {
      console.error("Error actualizando submission:", error);
      res.status(500).json({
        success: false,
        error: "Error al actualizar formulario",
      });
    }
  }
);

module.exports = router;
