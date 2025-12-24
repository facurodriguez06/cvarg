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
    const productCheck = await client.query(`SELECT COUNT(*) FROM products`);
    if (parseInt(productCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (id, name, description, price, category, "imageUrl", features, "isActive", stock, "createdAt", "updatedAt")
        VALUES 
          (gen_random_uuid(), 'CV Básico', 'Curriculum vitae profesional con diseño limpio y moderno', 2500, 'CV_BASICO', '/img/cv-basico.jpg', ARRAY['Diseño profesional'], true, 999, NOW(), NOW())
      `);
      await client.query(`
        INSERT INTO products (id, name, description, price, category, "imageUrl", features, "isActive", stock, "createdAt", "updatedAt")
        VALUES 
          (gen_random_uuid(), 'CV Profesional', 'CV destacado con diseño premium', 5000, 'CV_PROFESIONAL', '/img/cv-pro.jpg', ARRAY['Diseño premium', 'Optimización ATS'], true, 999, NOW(), NOW())
      `);
      await client.query(`
        INSERT INTO products (id, name, description, price, category, "imageUrl", features, "isActive", stock, "createdAt", "updatedAt")
        VALUES 
          (gen_random_uuid(), 'CV Premium', 'Paquete completo con CV y LinkedIn', 8000, 'CV_PREMIUM', '/img/cv-premium.jpg', ARRAY['Todo incluido', 'Consultoría'], true, 999, NOW(), NOW())
      `);
      console.log("✅ 3 productos creados");
    } else {
      console.log("✅ Productos ya existen");
    }

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
