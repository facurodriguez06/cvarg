// Script para actualizar la contraseña del admin
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Ignorar error de certificado SSL en desarrollo
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function updateAdminPassword() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("🔑 Actualizando contraseña del admin...\n");

    // Generar hash de la nueva contraseña
    const newPassword = "admin123";
    const hash = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    const result = await client.query(
      `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE email = 'admin@cvargentina.com' RETURNING id, email, role`,
      [hash]
    );

    if (result.rows.length > 0) {
      console.log("✅ Contraseña actualizada exitosamente!");
      console.log("\n📋 Credenciales:");
      console.log("   Email: admin@cvargentina.com");
      console.log("   Password: admin123");
    } else {
      // Si no existe, crearlo
      console.log("⚠️ Admin no encontrado, creando...");
      await client.query(
        `INSERT INTO users (id, email, password, "fullName", phone, role, "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'admin@cvargentina.com', $1, 'Administrador', '+54 11 1234-5678', 'ADMIN', true, NOW(), NOW())`,
        [hash]
      );
      console.log("✅ Usuario admin creado!");
      console.log("\n📋 Credenciales:");
      console.log("   Email: admin@cvargentina.com");
      console.log("   Password: admin123");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

updateAdminPassword();
