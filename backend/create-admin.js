const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Crear usuario admin
    const admin = await prisma.user.upsert({
      where: { email: "admin@cvargentina.com" },
      update: {
        password: hashedPassword,
        role: "admin",
        isActive: true,
      },
      create: {
        email: "admin@cvargentina.com",
        password: hashedPassword,
        fullName: "Administrador",
        role: "admin",
        isActive: true,
      },
    });

    console.log("✅ Usuario admin creado/actualizado exitosamente:");
    console.log("   Email: admin@cvargentina.com");
    console.log("   Password: admin123");
    console.log("   ID:", admin.id);
  } catch (error) {
    console.error("❌ Error creando usuario admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
