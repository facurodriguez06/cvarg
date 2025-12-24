const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const prisma = new PrismaClient();

/**
 * GET /api/cart
 * Obtener carrito del usuario autenticado
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      // Crear carrito si no existe
      const newCart = await prisma.cart.create({
        data: { userId: req.user.id },
        include: { items: { include: { product: true } } },
      });
      return res.json({ success: true, cart: newCart });
    }

    // Calcular totales
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + parseFloat(item.product.price) * item.quantity;
    }, 0);

    res.json({
      success: true,
      cart: {
        ...cart,
        subtotal,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error) {
    console.error("Error al obtener carrito:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener carrito",
    });
  }
});

/**
 * POST /api/cart/add
 * Agregar producto al carrito
 */
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        error: "Este producto no está disponible",
      });
    }

    // Obtener o crear carrito
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id },
      });
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (existingItem) {
      // Actualizar cantidad
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      // Crear nuevo item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
        },
      });
    }

    // Obtener carrito actualizado
    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Producto agregado al carrito",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Error al agregar al carrito:", error);
    res.status(500).json({
      success: false,
      error: "Error al agregar al carrito",
    });
  }
});

/**
 * PUT /api/cart/update/:itemId
 * Actualizar cantidad de un item
 */
router.put("/update/:itemId", authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "La cantidad debe ser al menos 1",
      });
    }

    const cartItem = await prisma.cartItem.update({
      where: { id: req.params.itemId },
      data: { quantity },
    });

    res.json({
      success: true,
      message: "Cantidad actualizada",
      item: cartItem,
    });
  } catch (error) {
    console.error("Error al actualizar cantidad:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar cantidad",
    });
  }
});

/**
 * DELETE /api/cart/remove/:itemId
 * Eliminar item del carrito
 */
router.delete("/remove/:itemId", authMiddleware, async (req, res) => {
  try {
    await prisma.cartItem.delete({
      where: { id: req.params.itemId },
    });

    res.json({
      success: true,
      message: "Producto eliminado del carrito",
    });
  } catch (error) {
    console.error("Error al eliminar del carrito:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar del carrito",
    });
  }
});

/**
 * DELETE /api/cart/clear
 * Vaciar carrito
 */
router.delete("/clear", authMiddleware, async (req, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    res.json({
      success: true,
      message: "Carrito vaciado",
    });
  } catch (error) {
    console.error("Error al vaciar carrito:", error);
    res.status(500).json({
      success: false,
      error: "Error al vaciar carrito",
    });
  }
});

module.exports = router;
