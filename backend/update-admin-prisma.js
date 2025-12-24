// Script para actualizar la contraseña del admin usando Prisma
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    console.log("🔑 Actualizando contraseña del admin...\n");

    // Generar hash de la nueva contraseña
    const newPassword = "admin123";
    const hash = await bcrypt.hash(newPassword, 10);

    // Buscar si existe el admin
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@cvargentina.com" },
    });

    if (existingAdmin) {
      // Actualizar la contraseña
      await prisma.user.update({
        where: { email: "admin@cvargentina.com" },
        data: {
          password: hash,
          role: "ADMIN",
          isActive: true,
        },
      });
      console.log("✅ Contraseña actualizada exitosamente!");
    } else {
      // Crear el admin si no existe
      await prisma.user.create({
        data: {
          email: "admin@cvargentina.com",
          password: hash,
          fullName: "Administrador",
          phone: "+54 11 1234-5678",
          role: "ADMIN",
          isActive: true,
        },
      });
      console.log("✅ Usuario admin creado!");
    }

    console.log("\n📋 Credenciales:");
    console.log("   Email: admin@cvargentina.com");
    console.log("   Password: admin123\n");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();
