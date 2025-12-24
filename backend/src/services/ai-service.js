/**
 * Servicio de IA con Groq para generación de contenido de CV
 * Adaptado para CVs modernos 2026
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Genera contenido mejorado para CV usando Groq (Llama 3.3)
 */
async function generateCVContent(submission, section = "all") {
  if (!GROQ_API_KEY) {
    throw new Error("API key de Groq no configurada");
  }

  let prompt = "";

  switch (section) {
    case "resumen":
      prompt = buildResumenPrompt(submission);
      break;
    case "experiencia":
      prompt = buildExperienciaPrompt(submission);
      break;
    case "educacion":
      prompt = buildEducacionPrompt(submission);
      break;
    case "habilidades":
      prompt = buildHabilidadesPrompt(submission);
      break;
    case "all":
    default:
      prompt = buildFullCVPrompt(submission);
  }

  try {
    const response = await retryWithBackoff(() =>
      callGroqAPI(prompt, GROQ_API_KEY)
    );
    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error("No se recibió respuesta de Groq");
    }

    return generatedText;
  } catch (error) {
    console.error("Error llamando a Groq:", error);
    throw error;
  }
}

/**
 * Helper para reintentar peticiones con exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let retries = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (
        (error.message.includes("429") || error.message.includes("503")) &&
        retries < maxRetries
      ) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1);
        console.warn(
          `Groq API rate limit hit. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Wrapper interno para la llamada a fetch
async function callGroqAPI(prompt, apiKey) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    // Si es 429, lanzamos error específico para que el retry lo capture
    if (response.status === 429) {
      throw new Error(`Error de Groq API: 429`);
    }
    const error = await response.text();
    console.error("Error de Groq API:", error);
    throw new Error(`Error de Groq API: ${response.status}`);
  }

  return response;
}

/**
 * Prompt para generar resumen profesional
 */
function buildResumenPrompt(submission) {
  return `Eres un experto en redacción de CVs modernos para el mercado laboral de 2026 en Argentina y Latinoamérica.

DATOS DEL CANDIDATO:
- Nombre: ${submission.fullName}
- Experiencia: ${JSON.stringify(submission.experience)}
- Educación: ${JSON.stringify(submission.education)}
- Habilidades Técnicas: ${
    submission.hardSkills?.join(", ") || "No especificadas"
  }
- Habilidades Blandas: ${
    submission.softSkills?.join(", ") || "No especificadas"
  }

TAREA: Genera un RESUMEN PROFESIONAL de 3-4 oraciones que:
1. Sea impactante y moderno (estilo 2026)
2. Destaque logros cuantificables si los hay
3. Use verbos de acción poderosos
4. Sea conciso y directo
5. Refleje las tendencias actuales del mercado laboral

FORMATO: Solo texto plano, sin encabezados ni bullets. El resumen debe poder pegarse directamente en un CV.`;
}

/**
 * Prompt para mejorar experiencia laboral
 */
function buildExperienciaPrompt(submission) {
  return `Eres un experto en redacción de CVs modernos para 2026.

EXPERIENCIA LABORAL DEL CANDIDATO (texto original):
${JSON.stringify(submission.experience)}

TAREA: Reescribe cada experiencia laboral siguiendo este formato moderno:

PUESTO | EMPRESA
Período: [fechas]
Ubicación: [ciudad/remoto]

• [Tarea 1]
• [Tarea 2]
• [Tarea 3]
• [Tarea 4]
• [Tarea 5]

REGLAS ESTRICTAS:
1. EXACTAMENTE 5 tareas/logros por cada puesto (ni más ni menos)
2. MÁXIMO 7-8 palabras por tarea (ser ultra conciso)
3. Las tareas DEBEN ser específicas y relevantes al puesto exacto mencionado
4. Si el puesto es "Ingeniero en Sistemas", las tareas deben ser de ingeniería (diseño de sistemas, arquitectura, desarrollo, etc.)
5. Si el puesto es "Gerente Comercial", las tareas deben ser de ventas/comercial
6. NO inventes tareas genéricas - usa el contexto del puesto para crear tareas realistas
7. Usa verbos de acción en pasado (Diseñé, Desarrollé, Gestioné, Lideré, Optimicé)
8. Cuantifica cuando sea posible (%, números, métricas)
9. Cada tarea debe ser impactante pero brevísima

EJEMPLOS DE TAREAS CORRECTAS (específicas al rol):
Para Ingeniero en Sistemas:
• "Diseñé sistema de gestión para consultoría"
• "Desarrollé API REST con 50k requests/día"
• "Implementé arquitectura microservicios en AWS"

Para Gerente Comercial:
• "Aumenté ventas 40% mediante estrategia digital"
• "Gestioné cartera de 100+ clientes corporativos"
• "Lideré equipo comercial de 8 personas"

Genera el texto listo para copiar y pegar en un CV.`;
}

/**
 * Prompt para mejorar educación
 */
function buildEducacionPrompt(submission) {
  return `Eres un experto en redacción de CVs modernos.

EDUCACIÓN DEL CANDIDATO:
${JSON.stringify(submission.education)}

TAREA: Formatea la educación de manera profesional:

TÍTULO | INSTITUCIÓN
Año de graduación: [año]
[Menciones relevantes si las hay]

REGLAS:
1. Ordena de más reciente a más antiguo
2. Incluye el estado (En curso, Graduado, Incompleto)
3. Destaca logros académicos relevantes
4. Formato limpio y consistente

Genera el texto listo para copiar y pegar.`;
}

/**
 * Prompt para mejorar presentación de habilidades
 */
function buildHabilidadesPrompt(submission) {
  return `Eres un experto en CVs modernos 2026.

HABILIDADES DEL CANDIDATO:
- Técnicas (Hard Skills): ${
    submission.hardSkills?.join(", ") || "No especificadas"
  }
- Blandas (Soft Skills): ${
    submission.softSkills?.join(", ") || "No especificadas"
  }

TAREA: Organiza las habilidades de forma moderna y atractiva:

HABILIDADES TÉCNICAS
• [Habilidad 1] - [Nivel o contexto breve]
• [Habilidad 2] - [Nivel o contexto breve]

HABILIDADES BLANDAS
• [Habilidad 1] - [Ejemplo breve de aplicación]
• [Habilidad 2] - [Ejemplo breve de aplicación]

REGLAS:
1. Prioriza las más relevantes para el mercado 2026
2. Agrupa por categorías si tiene sentido
3. Añade contexto donde sea útil
4. Usa terminología moderna

Genera el texto listo para copiar y pegar.`;
}

/**
 * Prompt para CV completo
 */
function buildFullCVPrompt(submission) {
  return `Eres un experto en redacción de CVs profesionales modernos para el mercado laboral de 2026 en Argentina y Latinoamérica.

DATOS COMPLETOS DEL CANDIDATO:

DATOS PERSONALES:
- Nombre completo: ${submission.fullName}
- Email: ${submission.email}
- Teléfono: ${submission.phone}
- Ubicación: ${submission.city || "No especificada"}
- LinkedIn: ${submission.linkedin || "No especificado"}

EXPERIENCIA LABORAL:
${JSON.stringify(submission.experience, null, 2)}

EDUCACIÓN:
${JSON.stringify(submission.education, null, 2)}

HABILIDADES TÉCNICAS:
${submission.hardSkills?.join(", ") || "No especificadas"}

HABILIDADES BLANDAS:
${submission.softSkills?.join(", ") || "No especificadas"}

IDIOMAS:
${JSON.stringify(submission.languages) || "No especificados"}

TAREA: Genera un CV completo y profesional con las siguientes secciones:

1. RESUMEN PROFESIONAL (3-4 oraciones impactantes)

2. EXPERIENCIA LABORAL (formato moderno con bullets y logros cuantificables)

3. EDUCACIÓN (formateada profesionalmente)

4. HABILIDADES (organizadas y con contexto)

5. IDIOMAS (si aplica)

REGLAS:
1. Estilo moderno y directo para 2026
2. Verbos de acción poderosos
3. Logros cuantificables cuando sea posible
4. Texto listo para copiar y pegar
5. Conciso pero completo
6. Adaptado al mercado argentino/latinoamericano

Genera el contenido completo formateado para un CV profesional.`;
}

module.exports = {
  generateCVContent,
};
