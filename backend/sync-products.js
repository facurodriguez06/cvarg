// Script para sincronizar productos del catálogo a la base de datos
// Ejecutar con: node sync-products.js

const products = [
  {
    name: "CV Esencial (2 Hojas)",
    description:
      "Diseño profesional de hasta 2 páginas. Ideal para perfiles Junior.",
    price: 7000,
    category: "CV_BASICO",
    imageUrl: null,
    features: ["Diseño profesional", "Hasta 2 páginas", "Ideal para Junior"],
  },
  {
    name: "CV Pro + Editable",
    description:
      "Hasta 2 páginas. Incluye archivo editable para futuras actualizaciones.",
    price: 7500,
    category: "CV_PROFESIONAL",
    imageUrl: null,
    features: ["Hasta 2 páginas", "Archivo editable", "Popular"],
  },
  {
    name: "CV Senior / Extenso",
    description:
      "Para trayectorias largas. Hasta 4 páginas de información detallada.",
    price: 9800,
    category: "CV_PREMIUM",
    imageUrl: null,
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
    description: "Optimización completa de perfil para atraer reclutadores.",
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
    features: ["Página web One Page", "Diseño profesional", "Nuevo servicio"],
  },
];

async function syncProducts() {
  const BASE_URL = "http://localhost:3000/api";

  // Obtener token de admin (necesitamos login primero)
  console.log("🔐 Iniciando sesión como admin...");

  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@cvargentina.com",
        password: "admin123",
      }),
    });

    const loginData = await loginRes.json();
    if (!loginData.token) {
      console.error("❌ Error de login:", loginData);
      return;
    }

    const token = loginData.token;
    console.log("✅ Login exitoso");

    // Subir cada producto
    let created = 0;
    let failed = 0;

    for (const product of products) {
      try {
        const res = await fetch(`${BASE_URL}/admin/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(product),
        });

        const data = await res.json();
        if (data.success) {
          console.log(`✅ Creado: ${product.name}`);
          created++;
        } else {
          console.log(`⚠️ Error en ${product.name}:`, data.error);
          failed++;
        }
      } catch (err) {
        console.error(`❌ Error en ${product.name}:`, err.message);
        failed++;
      }
    }

    console.log(`\n📊 Resumen: ${created} creados, ${failed} fallidos`);
  } catch (err) {
    console.error("❌ Error general:", err.message);
  }
}

syncProducts();
