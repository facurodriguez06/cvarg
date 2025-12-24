const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log("🌱 Iniciando seed de base de datos...\n");

    // ==========================================
    // CREAR USUARIO ADMIN
    // ==========================================
    console.log("👤 Creando usuario administrador...");
    const adminPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.upsert({
      where: { email: "admin@cvargentina.com" },
      update: {},
      create: {
        email: "admin@cvargentina.com",
        password: adminPassword,
        fullName: "Administrador",
        phone: "+54 11 1234-5678",
        role: "ADMIN",
      },
    });
    console.log("✅ Usuario admin creado:", admin.email);

    // ==========================================
    // CREAR PRODUCTOS
    // ==========================================
    console.log("\n📦 Creando productos...");

    const products = [
      {
        name: "CV Básico",
        description: "Curriculum vitae profesional con diseño limpio y moderno",
        price: 2500,
        category: "CV_BASICO",
        imageUrl: "/img/cv-basico.jpg",
        features: [
          "Diseño profesional",
          "Formato PDF editable",
          "Revisión ortográfica",
          "Entrega en 24hs",
        ],
        stock: 999,
      },
      {
        name: "CV Profesional",
        description: "CV destacado con diseño premium y optimización ATS",
        price: 5000,
        category: "CV_PROFESIONAL",
        imageUrl: "/img/cv-profesional.jpg",
        features: [
          "Diseño premium personalizado",
          "Optimización para ATS",
          "Carta de presentación incluida",
          "Revisión por experto en RRHH",
          "Entrega en 48hs",
          "1 revisión gratuita",
        ],
        stock: 999,
      },
      {
        name: "CV Premium",
        description:
          "Paquete completo con CV, LinkedIn y consultoría personalizada",
        price: 8000,
        category: "CV_PREMIUM",
        imageUrl: "/img/cv-premium.jpg",
        features: [
          "Todo lo del CV Profesional",
          "Optimización de perfil LinkedIn",
          "Video presentación profesional",
          "Consultoría de marca personal (1h)",
          "Entrega en 72hs",
          "3 revisiones gratuitas",
          "Soporte prioritario",
        ],
        stock: 999,
      },
    ];

    for (const productData of products) {
      const product = await prisma.product.upsert({
        where: { name: productData.name },
        update: productData,
        create: productData,
      });
      console.log(`✅ Producto creado: ${product.name} - $${product.price}`);
    }

    // ==========================================
    // CREAR CUPONES
    // ==========================================
    console.log("\n🎟️  Creando cupones...");

    const coupons = [
      {
        code: "DESPEGAR10",
        discountPercent: 0.1,
        description: "10% de descuento para nuevos usuarios",
        maxUsage: 100,
        usesPerUser: 1,
        expiresAt: new Date("2025-12-31"),
      },
      {
        code: "CVPRO",
        discountPercent: 0.2,
        description: "20% de descuento exclusivo",
        maxUsage: 50,
        usesPerUser: 1,
        expiresAt: new Date("2025-06-30"),
      },
      {
        code: "STUDENT",
        discountPercent: 0.15,
        description: "15% de descuento para estudiantes",
        maxUsage: 200,
        usesPerUser: 1,
        expiresAt: new Date("2025-12-31"),
      },
    ];

    for (const couponData of coupons) {
      const coupon = await prisma.coupon.upsert({
        where: { code: couponData.code },
        update: { ...couponData, usageCount: 0 },
        create: couponData,
      });
      console.log(
        `✅ Cupón creado: ${coupon.code} - ${
          parseFloat(coupon.discountPercent) * 100
        }% OFF`
      );
    }

    console.log("\n✨ Seed completado exitosamente!\n");
    console.log("📋 Datos de acceso:");
    console.log("   Email: admin@cvargentina.com");
    console.log("   Password: admin123\n");
  } catch (error) {
    console.error("❌ Error en seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
