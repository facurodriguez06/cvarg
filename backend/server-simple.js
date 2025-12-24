require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

console.log("🔑 Configurando Mercado Pago...");

// Importar Mercado Pago después de configurar dotenv
const mercadopago = require("mercadopago");

// Configurar MP
const client = new mercadopago.MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "",
});

const preference = new mercadopago.Preference(client);
const payment = new mercadopago.Payment(client);

// ===========================
// ENDPOINTS
// ===========================

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mpConfigured: !!process.env.MP_ACCESS_TOKEN,
  });
});

// CREAR PREFERENCIA DE MERCADO PAGO
app.post("/api/payments/create-preference", async (req, res) => {
  try {
    const { items: cartItems } = req.body;
    console.log("📝 Recibida solicitud para crear preferencia...");
    console.log("📦 Items del carrito:", cartItems);

    // Convertir items del carrito a formato de MP
    const items = cartItems.map((item) => ({
      title: item.name || item.title || `Producto ${item.id}`,
      description: item.description || "Servicio de CV Argentina",
      quantity: item.quantity || 1,
      currency_id: "ARS",
      unit_price: parseFloat(item.price) || 7000,
    }));

    // URL base hardcodeada para asegurar funcionamiento local
    const baseUrl = "http://127.0.0.1:5500";

    const preferenceData = {
      items: items,
      payer: {
        email: "test@test.com",
      },
      back_urls: {
        success: `${baseUrl}/carrito.html?payment=success`,
        failure: `${baseUrl}/carrito.html?payment=failure`,
        pending: `${baseUrl}/carrito.html?payment=pending`,
      },
      notification_url: `${
        process.env.BACKEND_URL || "http://localhost:3000"
      }/api/payments/webhook`,
      statement_descriptor: "CV Argentina",
      external_reference: `TEST-${Date.now()}`,
    };

    console.log("🚀 Creando preferencia en MP...");
    console.log("📋 Preference data:", JSON.stringify(preferenceData, null, 2));
    const response = await preference.create({ body: preferenceData });

    console.log("✅ Preferencia creada:", response.id);

    res.json({
      success: true,
      orderId: response.external_reference,
      orderNumber: response.external_reference,
      preferenceId: response.id,
      initPoint: response.init_point,
    });
  } catch (error) {
    console.error("❌ Error al crear preferencia:", error);
    // Loguear detalles del error de MP si existen
    if (error.cause)
      console.error("📋 Error Cause:", JSON.stringify(error.cause, null, 2));

    res.status(500).json({
      success: false,
      error: error.message || "Error al procesar el pago",
    });
  }
});

// Almacén temporal de estados de pago (en memoria)
const paymentStatusStore = new Map();
// Caché de pagos ya procesados (para evitar duplicados)
const processedPayments = new Set();

// Endpoint para verificar estado de pago - CONSULTA DIRECTA A MP API
app.get("/api/payments/status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🔍 Checking payment status for order: ${orderId}`);

    // Si ya tenemos este pago registrado, devolver approved directamente
    if (paymentStatusStore.get(orderId) === "approved") {
      console.log(`✅ Order ${orderId} already approved in cache`);
      return res.json({ status: "approved" });
    }

    // Consultar directamente a la API de Mercado Pago
    const mpSearchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(
      orderId
    )}&access_token=${process.env.MP_ACCESS_TOKEN}`;

    const fetch = (await import("node-fetch")).default;
    const mpResponse = await fetch(mpSearchUrl);
    const mpData = await mpResponse.json();

    console.log(`🔎 MP API Response for ${orderId}:`, {
      results: mpData.results?.length || 0,
      paging: mpData.paging,
    });

    // Si encontramos pagos para este orderId
    if (mpData.results && mpData.results.length > 0) {
      // Buscar un pago aprobado
      const approvedPayment = mpData.results.find(
        (p) => p.status === "approved"
      );

      if (approvedPayment) {
        console.log(`💰 Payment approved found:`, {
          id: approvedPayment.id,
          status: approvedPayment.status,
          date: approvedPayment.date_approved,
        });

        // Marcar como aprobado en el caché
        paymentStatusStore.set(orderId, "approved");

        // Guardar pedido si no se ha procesado antes
        if (!processedPayments.has(orderId)) {
          console.log(`📦 Saving new order: ${orderId}`);

          // Obtener info del carrito desde la preferencia (si está disponible)
          // Por ahora guardamos info básica
          saveOrder("guest", {
            // TODO: Obtener userId del token si está disponible
            orderId: orderId,
            items_summary: "Productos varios", // TODO: Obtener del carrito
            total: approvedPayment.transaction_amount || 0,
            status: "PAGADO",
            observations: `Pago MP ID: ${approvedPayment.id}`,
          });

          processedPayments.add(orderId);
        }

        return res.json({ status: "approved" });
      } else {
        // Hay pagos pero ninguno aprobado
        const latestPayment = mpData.results[0];
        console.log(
          `⏳ Payment exists but not approved yet: ${latestPayment.status}`
        );
        return res.json({ status: latestPayment.status || "pending" });
      }
    }

    // No se encontraron pagos para este orderId
    console.log(`❓ No payments found for order ${orderId}`);
    return res.json({ status: "pending" });
  } catch (error) {
    console.error(`❌ Error checking payment status:`, error);
    return res.json({ status: "pending", error: error.message });
  }
});

// Webhook de Mercado Pago
app.post("/api/payments/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log("🔔 Webhook MP:", { type, data });

    // Si recibimos una notificación de pago, consultamos el estado real a MP
    if (type === "payment" || req.query.topic === "payment") {
      const paymentId = data?.id || req.query.id;

      if (paymentId) {
        try {
          const paymentInfo = await payment.get({ id: paymentId });
          const status = paymentInfo.status;
          const orderId = paymentInfo.external_reference;

          console.log(
            `💰 Payment ${paymentId} for order ${orderId} is ${status}`
          );

          if (status === "approved" && orderId) {
            paymentStatusStore.set(orderId, "approved");
            console.log(`✅ Order ${orderId} marked as approved in memory`);
          }
        } catch (e) {
          console.error("Error fetching payment info:", e);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    res.sendStatus(500);
  }
});

// Simular aprobación manual para testing (útil si webhook falla localmente)
app.all("/api/debug/approve/:orderId", (req, res) => {
  const { orderId } = req.params;
  paymentStatusStore.set(orderId, "approved");
  console.log(`🧪 TEST: Order ${orderId} manually approved`);
  res.json({ success: true, message: `Order ${orderId} approved manually` });
});

// Simular endpoints mínimos para que no falle el frontend
app.post("/api/cart/add", (req, res) => {
  res.json({ success: true, message: "Carrito temporal (modo test)" });
});

// ===========================
// ALMACENAMIENTO DE ÓRDENES (EN MEMORIA)
// ===========================
const ordersStore = new Map(); // key: userId, value: array of orders

// Helper para guardar orden
function saveOrder(userId, orderData) {
  if (!ordersStore.has(userId)) {
    ordersStore.set(userId, []);
  }

  const userOrders = ordersStore.get(userId);
  userOrders.push({
    id: orderData.orderId,
    date: new Date().toISOString(),
    items_summary: orderData.items_summary || "Varios productos",
    total: orderData.total || 0,
    status: orderData.status || "PENDIENTE",
    formCompleted: false,
    observations: orderData.observations || "",
  });

  ordersStore.set(userId, userOrders);
  console.log(`📦 Order saved for user ${userId}:`, orderData.orderId);
}

// Endpoint para obtener pedidos del usuario
app.get("/api/orders/user", (req, res) => {
  try {
    // Obtener token de autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.split(" ")[1];

    // Verificar token (en producción deberías usar JWT verify)
    // Por ahora, usamos el token o email del localStorage como userId
    const userId = token; // Simplificado para testing

    // Obtener órdenes del usuario
    const userOrders = ordersStore.get(userId) || [];

    console.log(
      `📋 Fetching orders for user ${userId}: ${userOrders.length} orders`
    );

    res.json(userOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

// Modificar handlePaymentComplete para guardar la orden
// (Este es un placeholder - en producción esto se hará en el webhook)

// ===========================
// INICIAR SERVIDOR
// ===========================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 SERVIDOR SIMPLIFICADO MP               ║
║                                              ║
║   Puerto: ${PORT}                            ║
║   URL: http://localhost:${PORT}              ║
║                                              ║
║   ⚡ Modo: TEST (sin BD)                    ║
║   💳 MP: ${
    process.env.MP_ACCESS_TOKEN ? "✅ OK" : "❌ NO CONFIG"
  }                 ║
╚═══════════════════════════════════════════════╝
  `);

  if (!process.env.MP_ACCESS_TOKEN) {
    console.log("\n⚠️  Configura MP_ACCESS_TOKEN en .env\n");
  }
});
