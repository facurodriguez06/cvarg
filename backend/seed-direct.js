// Script de seed simplificado
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("🌱 Poblando base de datos...\n");

    // Admin user
    const hash = await bcrypt.hash("admin123", 10);
    const userResult = await client.query(`
      SELECT * FROM users WHERE email = 'admin@cvargentina.com'
    `);

    if (userResult.rows.length === 0) {
      await client.query(
        `
        INSERT INTO users (id, email, password, "fullName", phone, role, "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'admin@cvargentina.com', $1, 'Administrador', '+54 11 1234-5678', 'ADMIN', true, NOW(), NOW())
      `,
        [hash]
      );
      console.log("✅ Usuario admin creado");
    } else {
      console.log("✅ Usuario admin ya existe");
    }

    // Products
    console.log("🧹 Limpiando productos existentes...");
    await client.query("DELETE FROM products");

    console.log("📦 Insertando catálogo completo (10 productos)...");

    const products = [
      {
        name: "CV Esencial (2 Hojas)",
        description:
          "Diseño profesional de hasta 2 páginas. Ideal para perfiles Junior.",
        price: 7000,
        category: "CV_BASICO",
        imageUrl: "/img/cv_antes.jpeg",
        features: [
          "Diseño profesional",
          "Hasta 2 páginas",
          "Ideal para Junior",
        ],
      },
      {
        name: "CV Pro + Editable",
        description:
          "Hasta 2 páginas. Incluye archivo editable para futuras actualizaciones.",
        price: 7500,
        category: "CV_PROFESIONAL",
        imageUrl: "/img/cv_despues.jpeg",
        features: ["Hasta 2 páginas", "Archivo editable", "Popular"],
      },
      {
        name: "CV Senior / Extenso",
        description:
          "Para trayectorias largas. Hasta 4 páginas de información detallada.",
        price: 9800,
        category: "CV_PREMIUM",
        imageUrl: "/img/cv-premium.jpg",
        features: ["Hasta 4 páginas", "Trayectorias extensas", "Detallado"],
      },
      {
        name: "Carta de Presentación",
        description:
          "Redacción persuasiva para acompañar tu CV y destacar tu perfil.",
        price: 5200,
        category: "OTRO",
        imageUrl: null,
        features: ["Redacción persuasiva", "Complemento perfecto para CV"],
      },
      {
        name: "Perfil LinkedIn / CompuTrabajo",
        description:
          "Optimización completa de perfil para atraer reclutadores.",
        price: 11000,
        category: "CONSULTORIA",
        imageUrl: null,
        features: [
          "Optimización completa",
          "Atrae reclutadores",
          "Redes profesionales",
        ],
      },
      {
        name: "CV en Inglés (Esencial)",
        description:
          "Traducción y adaptación al mercado internacional (Hasta 2 hojas).",
        price: 7000,
        category: "CV_BASICO",
        imageUrl: null,
        features: [
          "Traducción profesional",
          "Mercado internacional",
          "Hasta 2 hojas",
        ],
      },
      {
        name: "Pack Despegue",
        description:
          "CV Pro + Carta de Presentación. Todo lo necesario para postular. Ahorra $1200",
        price: 11500,
        category: "CV_PROFESIONAL",
        imageUrl: null,
        features: ["CV Pro", "Carta de Presentación", "Ahorro incluido"],
      },
      {
        name: "Pack Full Digital",
        description:
          "CV Pro + LinkedIn. Domina las redes y las postulaciones. Más Vendido",
        price: 16500,
        category: "CV_PREMIUM",
        imageUrl: null,
        features: ["CV Pro", "LinkedIn optimizado", "Más vendido"],
      },
      {
        name: "Pack Carrera Total",
        description:
          "CV Pro + Carta + LinkedIn. La solución integral definitiva. VIP",
        price: 21000,
        category: "CV_PREMIUM",
        imageUrl: null,
        features: ["CV Pro", "Carta", "LinkedIn", "Solución VIP"],
      },
      {
        name: "Diseño de Portafolio Web",
        description:
          "Tu propia página web personal (One Page). Muestra tus trabajos al mundo con estilo profesional.",
        price: 120000,
        category: "OTRO",
        imageUrl: null,
        features: [
          "Página web One Page",
          "Diseño profesional",
          "Nuevo servicio",
        ],
      },
    ];

    for (const p of products) {
      await client.query(
        `
        INSERT INTO products (id, name, description, price, category, "imageUrl", features, "isActive", stock, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, 999, NOW(), NOW())
      `,
        [p.name, p.description, p.price, p.category, p.imageUrl, p.features]
      );
    }
    console.log("✅ 10 productos creados correctamente");

    // Coupons
    const couponCheck = await client.query(`SELECT COUNT(*) FROM coupons`);
    if (parseInt(couponCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO coupons (id, code, "discountPercent", description, "isActive", "maxUsage", "usageCount", "usesPerUser", "expiresAt", "createdAt")
        VALUES (gen_random_uuid(), 'DESPEGAR10', 0.10, '10% OFF', true, 100, 0, 1, '2025-12-31'::timestamp, NOW())
      `);
      await client.query(`
        INSERT INTO coupons (id, code, "discountPercent", description, "isActive", "maxUsage", "usageCount", "usesPerUser", "expiresAt", "createdAt")
        VALUES (gen_random_uuid(), 'CVPRO', 0.20, '20% OFF', true, 50, 0, 1, '2025-06-30'::timestamp, NOW())
      `);
      await client.query(`
        INSERT INTO coupons (id, code, "discountPercent", description, "isActive", "maxUsage", "usageCount", "usesPerUser", "expiresAt", "createdAt")
        VALUES (gen_random_uuid(), 'STUDENT', 0.15, '15% OFF', true, 200, 0, 1, '2025-12-31'::timestamp, NOW())
      `);
      console.log("✅ 3 cupones creados");
    } else {
      console.log("✅ Cupones ya existen");
    }

    console.log("\n✨ Base de datos lista!");
    console.log("\n📋 Credenciales:");
    console.log("   admin@cvargentina.com / admin123");
    console.log("\n🎟️  Cupones: DESPEGAR10, CVPRO, STUDENT\n");
  } catch (err) {
    console.error("❌", err.message);
  } finally {
    await client.end();
  }
}

seed();
