const express = require("express");
const router = express.Router();
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");
const { body } = require("express-validator");
const { validate } = require("../middleware/validation");

const prisma = new PrismaClient();

// Configurar Multer para almacenar en MEMORIA (para convertir a Base64)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }, // 10MB para Base64
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes (JPEG, PNG, WebP)"));
    }
  },
});

/**
 * POST /api/cvform/submit
 * Enviar formulario de CV
 */

// Middleware wrapper para manejar errores de multer
const handleUpload = (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      console.error("Error de Multer:", err.message);
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "El archivo es demasiado grande. Máximo 10MB.",
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || "Error al subir el archivo",
      });
    }
    next();
  });
};

router.post(
  "/submit",
  authMiddleware,
  handleUpload,
  [
    body("fullName")
      .trim()
      .isLength({ min: 3 })
      .withMessage("El nombre debe tener al menos 3 caracteres"),
    body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
    body("phone").trim().notEmpty().withMessage("El teléfono es requerido"),
    // Skills validation - flexible to allow both array notation and single values
    body("hardSkills")
      .optional()
      .custom((value) => {
        // Accept if it's already an array with at least 1 element
        if (Array.isArray(value) && value.length > 0) return true;
        // Accept if it's a non-empty string (single value)
        if (typeof value === "string" && value.trim().length > 0) return true;
        return false;
      })
      .withMessage("Debes seleccionar al menos una habilidad técnica"),
    body("softSkills")
      .optional()
      .custom((value) => {
        if (Array.isArray(value) && value.length > 0) return true;
        if (typeof value === "string" && value.trim().length > 0) return true;
        return false;
      })
      .withMessage("Debes seleccionar al menos una habilidad blanda"),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        fullName,
        nombres,
        apellidos,
        edad,
        nacionalidad,
        estadoCivil,
        email,
        phone,
        dni,
        cuil,
        address,
        city,
        birthDate,
        linkedin,
        disponibilidad,
        objetivo,
        experiencia,
        comentarios,
        educacion,
        cursos,
        idiomas,
        education,
        experience,
        languages,
        references,
        portfolio,
        orderId,
        otherHardSkills,
        otherSoftSkills,
      } = req.body;

      console.log(
        "📋 Datos recibidos - orderId:",
        orderId,
        "| fullName:",
        fullName
      );

      // Obtener skills - pueden venir como 'hardSkills', 'hardSkills[]', o ambos
      const hardSkills = req.body.hardSkills || req.body["hardSkills[]"] || [];
      const softSkills = req.body.softSkills || req.body["softSkills[]"] || [];

      // Convertir foto a Base64 si existe
      let photoBase64 = null;
      if (req.file && req.file.buffer) {
        const base64Data = req.file.buffer.toString("base64");
        const mimeType = req.file.mimetype;
        photoBase64 = `data:${mimeType};base64,${base64Data}`;
        console.log(
          "📸 Foto procesada:",
          req.file.originalname,
          "- Base64 length:",
          photoBase64.length
        );
      }

      // Helper para parsear JSON de forma segura
      const safeJsonParse = (data) => {
        if (!data) return null;
        if (typeof data !== "string") return data;
        try {
          return JSON.parse(data);
        } catch (e) {
          return [{ content: data }];
        }
      };

      // Parsear datos JSON de forma segura
      const parsedEducation = safeJsonParse(education);
      const parsedExperience = safeJsonParse(experience);
      const parsedLanguages = safeJsonParse(languages);
      const parsedReferences = safeJsonParse(references);
      const parsedHardSkills = Array.isArray(hardSkills)
        ? hardSkills
        : hardSkills
        ? [hardSkills]
        : [];
      const parsedSoftSkills = Array.isArray(softSkills)
        ? softSkills
        : softSkills
        ? [softSkills]
        : [];

      // Datos del formulario a guardar
      const submissionData = {
        userId: req.user.id,
        // Datos personales
        fullName,
        nombres: nombres || null,
        apellidos: apellidos || null,
        edad: edad || null,
        nacionalidad: nacionalidad || null,
        estadoCivil: estadoCivil || null,
        email,
        phone,
        dni: dni || null,
        cuil: cuil || null,
        address: address || null,
        city: city || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        photoBase64,
        linkedin: linkedin || null,
        // Experiencia
        disponibilidad: disponibilidad || null,
        objetivo: objetivo || null,
        experiencia: experiencia || null,
        comentarios: comentarios || null,
        experience: parsedExperience,
        // Educación
        educacion: educacion || null,
        cursos: cursos || null,
        education: parsedEducation,
        // Idiomas
        idiomas: idiomas || null,
        languages: parsedLanguages,
        references: parsedReferences,
        portfolio: portfolio || null,
        // Habilidades
        hardSkills: parsedHardSkills,
        softSkills: parsedSoftSkills,
        otherHardSkills: otherHardSkills || null,
        otherSoftSkills: otherSoftSkills || null,
        status: "SENT", // Cambiar a SENT cuando se completa
      };

      let submission;

      // Si hay orderId, buscar CVSubmission existente y actualizarlo
      if (orderId) {
        const existingSubmission = await prisma.cVSubmission.findFirst({
          where: { orderId: orderId },
        });

        if (existingSubmission) {
          // Actualizar el existente
          submission = await prisma.cVSubmission.update({
            where: { id: existingSubmission.id },
            data: submissionData,
          });
          console.log(
            `📝 CVSubmission actualizado a SENT para orden ${orderId}`
          );
        } else {
          // Crear nuevo con orderId
          submission = await prisma.cVSubmission.create({
            data: { ...submissionData, orderId: orderId },
          });
          console.log(`📝 CVSubmission creado (nuevo) para orden ${orderId}`);
        }

        // Actualizar orden para vincularla y marcar formulario como completado
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "IN_PROGRESS",
            formCompleted: true,
          },
        });
      } else {
        // Sin orderId - buscar si hay un CVSubmission PENDING del mismo usuario para actualizar
        const pendingSubmission = await prisma.cVSubmission.findFirst({
          where: {
            userId: req.user.id,
            status: "PENDING",
          },
          orderBy: { createdAt: "desc" }, // El más reciente
        });

        if (pendingSubmission) {
          // Actualizar el PENDING encontrado
          submission = await prisma.cVSubmission.update({
            where: { id: pendingSubmission.id },
            data: submissionData,
          });
          console.log(
            `📝 CVSubmission PENDING actualizado a SENT (id: ${pendingSubmission.id})`
          );

          // Si tiene orderId, actualizar la orden también
          if (pendingSubmission.orderId) {
            await prisma.order.update({
              where: { id: pendingSubmission.orderId },
              data: {
                status: "IN_PROGRESS",
                formCompleted: true,
              },
            });
          }
        } else {
          // No hay ninguno pendiente, crear nuevo
          submission = await prisma.cVSubmission.create({
            data: submissionData,
          });
          console.log(`📝 CVSubmission creado (sin orden, ninguno pendiente)`);
        }
      }

      // TODO: Enviar a Google Sheets como backup (opcional)
      // TODO: Enviar email de confirmación

      res.status(201).json({
        success: true,
        message: "Formulario enviado exitosamente",
        submissionId: submission.id,
      });
    } catch (error) {
      console.error("Error al enviar formulario:", error);
      res.status(500).json({
        success: false,
        error: "Error al procesar el formulario",
      });
    }
  }
);

/**
 * GET /api/cvform/submissions
 * Obtener submissions del usuario
 */
router.get("/submissions", authMiddleware, async (req, res) => {
  try {
    const submissions = await prisma.cVSubmission.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Error al obtener submissions:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener formularios",
    });
  }
});

/**
 * GET /api/cvform/pending
 * Verificar si hay un CVSubmission PENDING del usuario
 */
router.get("/pending", authMiddleware, async (req, res) => {
  try {
    const pendingSubmission = await prisma.cVSubmission.findFirst({
      where: {
        userId: req.user.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderId: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      hasPending: !!pendingSubmission,
      submission: pendingSubmission,
    });
  } catch (error) {
    console.error("Error al verificar pending:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar formularios pendientes",
    });
  }
});

/**
 * GET /api/cvform/:id
 * Obtener un submission específico
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const submission = await prisma.cVSubmission.findUnique({
      where: { id: req.params.id },
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Formulario no encontrado",
      });
    }

    if (submission.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        error: "No tienes permiso para ver este formulario",
      });
    }

    res.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("Error al obtener submission:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener formulario",
    });
  }
});

module.exports = router;
