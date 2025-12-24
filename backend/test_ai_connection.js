require("dotenv").config();
const { generateCVContent } = require("./src/services/ai-service");

async function testAI() {
  console.log("🤖 Probando conexión con Gemini AI...");
  console.log(
    `🔑 API Key configurada: ${
      process.env.GEMINI_API_KEY
        ? "SÍ (Termina en ..." + process.env.GEMINI_API_KEY.slice(-4) + ")"
        : "NO"
    }`
  );

  // Mock submission object
  const mockSubmission = {
    fullName: "Juan Test",
    experience: "Trabajé en ventas 2 años.",
    education: "Secundario completo.",
    hardSkills: ["Ventas", "Excel"],
    softSkills: ["Comunicación"],
  };

  try {
    console.log("🔍 Intentando listar modelos disponibles...");
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));

    // Test simple list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );

    if (!response.ok) {
      console.error(
        `❌ Error en request de modelos: ${response.status} ${response.statusText}`
      );
      const text = await response.text();
      console.error("Respuesta:", text);
    } else {
      const data = await response.json();
      console.log("✅ Conexión exitosa. Modelos disponibles:");
      if (data.models) {
        console.log(
          `✅ Se encontraron ${data.models.length} modelos. Mostrando los primeros 10:`
        );
        data.models.slice(0, 10).forEach((m) => console.log(` - ${m.name}`));

        // Buscar gemini
        const flash = data.models.find((m) => m.name.includes("flash"));
        if (flash) console.log(`\n🎯 ENCONTRADO FLASH: ${flash.name}`);

        const pro = data.models.find(
          (m) => m.name.includes("pro") && !m.name.includes("vision")
        );
        if (pro) console.log(`🎯 ENCONTRADO PRO: ${pro.name}`);
      } else {
        console.log("No se encontraron modelos (extraño).");
      }
    }
  } catch (error) {
    console.error("❌ ERROR CRITICO:");
    console.error(error);
  }
}

testAI();
