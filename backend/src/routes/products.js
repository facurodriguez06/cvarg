const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, isAdmin, optionalAuth } = require("../middleware/auth");

const prisma = new PrismaClient();

/**
 * GET /api/products
 * Obtener todos los productos (público)
 */
router.get("/", async (req, res) => {
  try {
    const { category, active } = req.query;

    const products = await prisma.product.findMany({
      where: {
        ...(category && { category: category.toUpperCase() }),
        ...(active !== undefined && { isActive: active === "true" }),
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener productos",
    });
  }
});

/**
 * GET /api/products/:id
 * Obtener un producto por ID
 */
router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener producto",
    });
  }
});

/**
 * POST /api/products
 * Crear nuevo producto (solo admin)
 */
router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, features, stock } =
      req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category: category.toUpperCase(),
        imageUrl,
        features: features || [],
        stock: stock || 999,
      },
    });

    res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      product,
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({
      success: false,
      error: "Error al crear producto",
    });
  }
});

/**
 * PUT /api/products/:id
 * Actualizar producto (solo admin)
 */
router.put("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      imageUrl,
      features,
      isActive,
      stock,
    } = req.body;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(category && { category: category.toUpperCase() }),
        ...(imageUrl && { imageUrl }),
        ...(features && { features }),
        ...(isActive !== undefined && { isActive }),
        ...(stock !== undefined && { stock }),
      },
    });

    res.json({
      success: true,
      message: "Producto actualizado exitosamente",
      product,
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar producto",
    });
  }
});

/**
 * DELETE /api/products/:id
 * Eliminar producto (solo admin)
 */
router.delete("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Producto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar producto",
    });
  }
});

module.exports = router;
