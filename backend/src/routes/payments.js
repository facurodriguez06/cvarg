const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const { authMiddleware } = require("../middleware/auth");

const prisma = new PrismaClient();

// Verificar que el token de MP esté configurado
const mpToken = process.env.MP_ACCESS_TOKEN;
console.log(
  "🔑 MP Token configurado:",
  mpToken ? `${mpToken.substring(0, 20)}...` : "NO CONFIGURADO"
);

// Configurar Mercado Pago (SDK v2)
const client = new MercadoPagoConfig({
  accessToken: mpToken || "TEST-00000000000",
});

/**
 * POST /api/payments/create-preference
 * Crear preferencia de pago en Mercado Pago
 */
router.post("/create-preference", authMiddleware, async (req, res) => {
  try {
    const { couponCode, items } = req.body;

    // Usar items del body (frontend localStorage) o del carrito en BD
    let cartItems = [];

    // Opción 1: Usar items directamente del body (preferido para simplicidad)
    if (items && items.length > 0) {
      console.log("📦 Usando items del body:", items.length);
      cartItems = items.map((item) => ({
        product: {
          id: item.id,
          name: item.name,
          description: item.name,
          price: item.price,
          imageUrl: item.icon || null,
          category: "CV_PROFESIONAL",
        },
        quantity: item.quantity || 1,
        productId: item.id,
      }));
    } else {
      // Opción 2: Buscar carrito del usuario en la BD (legacy)
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
      cartItems = cart?.items || [];
    }

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: "El carrito está vacío",
      });
    }

    // Calcular subtotal
    let subtotal = cartItems.reduce((sum, item) => {
      const price = item.product?.price || item.price || 0;
      return sum + parseFloat(price) * (item.quantity || 1);
    }, 0);

    let discount = 0;
    let couponId = null;

    // Aplicar cupón si existe
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive) {
        const userUsageCount = await prisma.couponUsage.count({
          where: {
            userId: req.user.id,
            couponId: coupon.id,
          },
        });

        if (
          userUsageCount < coupon.usesPerUser &&
          coupon.usageCount < coupon.maxUsage
        ) {
          discount = subtotal * parseFloat(coupon.discountPercent);
          couponId = coupon.id;
        }
      }
    }

    const total = subtotal - discount;

    // Crear orden en BD (sin items de OrderItem si vienen del localStorage)
    const orderNumber = `CV-${Date.now().toString(36).toUpperCase()}`;

    // Guardar los nombres de productos para referencia
    const productNames = cartItems
      .map((item) => item.product?.name || item.name || "Producto")
      .join(", ");

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        orderNumber,
        status: "PENDING",
        subtotal,
        discount,
        total,
        couponId,
        // Guardar descripción de items en un campo de notas si existe
      },
    });

    // Sanear FRONTEND_URL para evitar errores de Mercado Pago (back_url invalid)
    let frontendUrl = process.env.FRONTEND_URL || "http://localhost:5500";

    // Si la URL está corrupta o no es válida, forzar localhost
    if (
      !frontendUrl.startsWith("http") ||
      frontendUrl.includes("http://lo...")
    ) {
      console.warn(
        `⚠️ FRONTEND_URL inválida detectada: "${frontendUrl}". Usando default.`
      );
      frontendUrl = "http://localhost:5500";
    }

    // Asegurar que no tenga slash al final
    frontendUrl = frontendUrl.replace(/\/$/, "");

    console.log(`🔗 Usando back_url base: ${frontendUrl}`);

    const preferenceBody = {
      items: cartItems.map((item) => ({
        title: item.product?.name || item.name || "Producto",
        description:
          item.product?.description || item.name || "Servicio CV Argentina",
        picture_url: item.product?.imageUrl || null,
        category_id: item.product?.category || "services",
        quantity: item.quantity || 1,
        currency_id: "ARS",
        unit_price: parseFloat(item.product?.price || item.price || 0),
      })),
      payer: {
        email: req.user.email,
        name: req.user.fullName,
        phone: {
          number: req.user.phone,
        },
      },
      back_urls: {
        success: `${frontendUrl}/carrito.html?payment=success`,
        failure: `${frontendUrl}/carrito.html?payment=failure`,
        pending: `${frontendUrl}/carrito.html?payment=pending`,
      },
      // NOTA: auto_return requiere URLs HTTPS. En desarrollo local con HTTP,
      // el usuario deberá hacer click en "Volver al sitio" manualmente después de pagar.
      // Descomentar esto solo en producción con HTTPS:
      // auto_return: "approved",
      external_reference: order.id,
      notification_url: `${
        process.env.BACKEND_URL || "http://localhost:3000"
      }/api/payments/webhook`,
      statement_descriptor: "CV ARGENTINA",
    };

    console.log(
      "📋 Preferencia a enviar a MP:",
      JSON.stringify(preferenceBody, null, 2)
    );

    const preference = new Preference(client);
    const response = await preference.create({
      body: preferenceBody,
    });

    res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      preferenceId: response.id,
      initPoint: response.init_point,
    });
  } catch (error) {
    console.error("Error al crear preferencia de pago:", error);
    console.error("Detalles del error:", error.message);

    // Si el error es de Mercado Pago, mostrar mensaje más específico
    let errorMessage = "Error al procesar el pago";
    if (
      error.message?.includes("access_token") ||
      error.message?.includes("unauthorized")
    ) {
      errorMessage =
        "Error de configuración de Mercado Pago. Verifique el Access Token.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * POST /api/payments/webhook
 * Webhook de Mercado Pago para notificaciones de pago
 */
router.post("/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;

    console.log("Webhook MP recibido:", { type, data });

    if (type === "payment") {
      const paymentId = data.id;

      // Obtener información del pago
      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: paymentId });
      const orderId = payment.external_reference;

      console.log("Estado del pago:", payment.status);

      if (payment.status === "approved") {
        // Actualizar orden
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            paymentId: paymentId.toString(),
            paymentStatus: payment.status,
            paymentMethod: payment.payment_method_id,
          },
          include: {
            user: true,
            coupon: true,
          },
        });

        // Crear CVSubmission vacío en estado PENDING para este pedido
        const existingSubmission = await prisma.cVSubmission.findFirst({
          where: { orderId: orderId },
        });

        if (!existingSubmission) {
          await prisma.cVSubmission.create({
            data: {
              userId: order.userId,
              orderId: orderId,
              status: "PENDING",
              hardSkills: [],
              softSkills: [],
            },
          });
          console.log(
            `📝 CVSubmission PENDING creado para orden ${order.orderNumber}`
          );
        }

        // Registrar uso del cupón si existe
        if (order.couponId) {
          await prisma.couponUsage.create({
            data: {
              userId: order.userId,
              couponId: order.couponId,
            },
          });

          await prisma.coupon.update({
            where: { id: order.couponId },
            data: {
              usageCount: { increment: 1 },
            },
          });
        }

        // Vaciar carrito
        await prisma.cartItem.deleteMany({
          where: {
            cart: {
              userId: order.userId,
            },
          },
        });

        console.log(`Orden ${order.orderNumber} marcada como pagada`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    res.sendStatus(500);
  }
});

/**
 * GET /api/payments/status/:orderId
 * ✅ Verificar estado de pago (con verificación automática de MP)
 */
router.get("/status/:orderId", authMiddleware, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Orden no encontrada",
      });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "No tienes permiso para ver esta orden",
      });
    }

    // === VERIFICACIÓN AUTOMÁTICA CON MP (igual que Mila Crush) ===
    // Si el pedido está PENDING, verificar automáticamente con MP
    if (order.status === "PENDING") {
      console.log(
        `🔄 Auto-verificando pago con MP para orden PENDING: ${order.orderNumber}`
      );

      const mpAccessToken = process.env.MP_ACCESS_TOKEN;
      const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${req.params.orderId}&status=approved`;

      try {
        const mpResponse = await fetch(searchUrl, {
          headers: {
            Authorization: `Bearer ${mpAccessToken}`,
          },
        });

        const mpData = await mpResponse.json();

        // Si encontramos un pago aprobado, actualizar automáticamente
        if (mpData.results && mpData.results.length > 0) {
          console.log(
            `✅ [AUTO] Pago encontrado en MP para orden ${order.orderNumber}, actualizando...`
          );

          // Actualizar orden a PAID
          const updatedOrder = await prisma.order.update({
            where: { id: req.params.orderId },
            data: {
              status: "PAID",
              paymentStatus: "approved",
              paymentMethod: "mercadopago",
            },
          });

          // Crear CVSubmission vacío en estado PENDING
          const existingSubmission = await prisma.cVSubmission.findFirst({
            where: { orderId: req.params.orderId },
          });

          if (!existingSubmission) {
            await prisma.cVSubmission.create({
              data: {
                userId: order.userId,
                orderId: req.params.orderId,
                status: "PENDING",
                hardSkills: [],
                softSkills: [],
              },
            });
            console.log(
              `📝 CVSubmission PENDING creado (auto-verify) para orden ${order.orderNumber}`
            );
          }

          // Registrar uso del cupón si existe
          if (order.couponId) {
            await prisma.couponUsage.create({
              data: {
                userId: order.userId,
                couponId: order.couponId,
              },
            });

            await prisma.coupon.update({
              where: { id: order.couponId },
              data: {
                usageCount: { increment: 1 },
              },
            });
          }

          // Vaciar carrito
          await prisma.cartItem.deleteMany({
            where: {
              cart: {
                userId: order.userId,
              },
            },
          });

          console.log(
            `✅ Orden ${order.orderNumber} actualizada automáticamente`
          );

          // Retornar orden actualizada
          return res.json({
            success: true,
            order: updatedOrder,
          });
        } else {
          console.log(
            `ℹ️ Aún no hay pago aprobado en MP para orden ${order.orderNumber}`
          );
        }
      } catch (mpError) {
        console.error("Error auto-verificando con MP:", mpError);
        // Continuar y retornar estado actual de la DB
      }
    }
    // === FIN VERIFICACIÓN AUTOMÁTICA ===

    // Retornar estado actual (ya sea actualizado o sin cambios)
    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error al verificar estado:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar estado del pago",
    });
  }
});

/**
 * POST /api/payments/confirm-payment/:orderId
 * ✅ VERIFICACIÓN SEGURA CON API DE MERCADO PAGO
 * Consulta directamente a MP si existe un pago aprobado antes de confirmar
 * (Desarrollo y Producción - ahora es seguro)
 */
router.post("/confirm-payment/:orderId", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Buscar la orden
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, coupon: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Orden no encontrada",
      });
    }

    // Verificar que sea del usuario
    if (order.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: "No tienes permiso para confirmar esta orden",
      });
    }

    // Si ya está pagada, no hacer nada
    if (order.status === "PAID") {
      return res.json({
        success: true,
        message: "Orden ya estaba confirmada",
        order,
      });
    }

    console.log(
      `🔍 Verificando pago con API de MP para orden: ${order.orderNumber}`
    );

    // === VERIFICACIÓN REAL CON API DE MERCADO PAGO ===
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;
    const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&status=approved`;

    try {
      const mpResponse = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
        },
      });

      const mpData = await mpResponse.json();

      console.log(`📊 Respuesta de MP:`, {
        results: mpData.results?.length || 0,
        paging: mpData.paging,
      });

      // Verificar si existe al menos un pago aprobado
      if (mpData.results && mpData.results.length > 0) {
        console.log(
          `✅ Pago VERIFICADO en Mercado Pago para orden ${order.orderNumber}`
        );

        // Actualizar orden a PAID
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            paymentStatus: "approved",
            paymentMethod: "mercadopago",
          },
        });

        // Crear CVSubmission vacío en estado PENDING
        const existingSubmission = await prisma.cVSubmission.findFirst({
          where: { orderId: orderId },
        });

        if (!existingSubmission) {
          await prisma.cVSubmission.create({
            data: {
              userId: order.userId,
              orderId: orderId,
              status: "PENDING",
              hardSkills: [],
              softSkills: [],
            },
          });
          console.log(
            `📝 CVSubmission PENDING creado (confirm-payment) para orden ${order.orderNumber}`
          );
        }

        // Registrar uso del cupón si existe
        if (order.couponId) {
          await prisma.couponUsage.create({
            data: {
              userId: order.userId,
              couponId: order.couponId,
            },
          });

          await prisma.coupon.update({
            where: { id: order.couponId },
            data: {
              usageCount: { increment: 1 },
            },
          });
        }

        // Vaciar carrito
        await prisma.cartItem.deleteMany({
          where: {
            cart: {
              userId: order.userId,
            },
          },
        });

        console.log(
          `✅ Orden ${order.orderNumber} confirmada con verificación de MP`
        );

        return res.json({
          success: true,
          message: "Pago verificado y confirmado exitosamente",
          order: updatedOrder,
        });
      } else {
        // No se encontró ningún pago aprobado en MP
        console.warn(
          `⚠️ NO se encontró pago aprobado en MP para orden ${order.orderNumber}`
        );

        return res.status(400).json({
          success: false,
          error:
            "No se encontró un pago aprobado en Mercado Pago para esta orden. Por favor, completa el pago primero.",
        });
      }
    } catch (mpError) {
      console.error("❌ Error consultando API de Mercado Pago:", mpError);

      return res.status(500).json({
        success: false,
        error:
          "Error al verificar el pago con Mercado Pago. Intenta nuevamente en unos segundos.",
      });
    }

    res.json({
      success: true,
      message: "Pago confirmado exitosamente",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error al confirmar pago:", error);
    res.status(500).json({
      success: false,
      error: "Error al confirmar el pago",
    });
  }
});

module.exports = router;
