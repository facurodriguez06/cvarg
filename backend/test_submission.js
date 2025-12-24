// Usamos dynamic import para node-fetch (ESM)
const { PrismaClient } = require("@prisma/client");
const FormData = require("form-data");
// Wrapper para fetch
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const prisma = new PrismaClient();
const API_URL = "http://localhost:3000/api";

async function testSubmission() {
  console.log("🚀 Iniciando prueba de envío de formulario (con form-data)...");

  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: "password123",
    fullName: "Usuario Prueba",
    phone: "1234567890",
  };

  let token = "";

  try {
    console.log(`👤 Registrando usuario: ${testUser.email}`);
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const registerData = await registerRes.json();

    if (registerData.success) {
      token = registerData.token;
      console.log("✅ Usuario registrado y logueado.");
    } else {
      console.error("❌ Error al registrar:", registerData);
      return;
    }

    // 2. Usar form-data library
    const form = new FormData();
    form.append("fullName", "Juan Perez");
    form.append("email", testUser.email);
    form.append("phone", "123456789");
    form.append("address", "Calle Falsa 123");
    form.append("city", "Mendoza");
    form.append("birthDate", "1990-01-01");
    form.append(
      "experience",
      JSON.stringify([{ content: "Experiencia de prueba" }])
    );
    form.append(
      "education",
      JSON.stringify([{ content: "Educación de prueba" }])
    );

    // Arrays
    form.append("hardSkills", "Excel");
    form.append("hardSkills", "Inglés");
    form.append("softSkills", "Liderazgo");
    form.append("softSkills", "Comunicación");

    console.log("📝 Enviando formulario...");
    const submitRes = await fetch(`${API_URL}/cvform/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const submitData = await submitRes.json();

    if (submitRes.ok && submitData.success) {
      console.log("✅ Formulario enviado exitosamente via API.");
      console.log("🆔 ID de envío:", submitData.submissionId);

      // 3. Verificar en la base de datos
      console.log("🔍 Verificando en la base de datos...");
      const submission = await prisma.cVSubmission.findUnique({
        where: { id: submitData.submissionId },
      });

      if (submission) {
        console.log(
          "🎉 ¡ÉXITO! El formulario se guardó correctamente en la DB."
        );
        console.log("📄 Datos guardados:", {
          id: submission.id,
          fullName: submission.fullName,
          email: submission.email,
          status: submission.status,
          hardSkills: submission.hardSkills,
        });
      } else {
        console.error(
          "❌ ERROR: El formulario se envió pero no se encontró en la DB."
        );
      }
    } else {
      console.error(
        "❌ Error al enviar formulario:",
        JSON.stringify(submitData, null, 2)
      );
    }
  } catch (error) {
    console.error("❌ Error ejecutando la prueba:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubmission();
