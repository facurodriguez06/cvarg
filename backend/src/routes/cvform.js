const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");
const { body } = require("express-validator");
const { validate } = require("../middleware/validation");

const prisma = new PrismaClient();

// Configurar Multer para uploads de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/photos");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "photo-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }, // 5MB default
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
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
router.post(
  "/submit",
  authMiddleware,
  upload.single("photo"),
  [
    body("fullName")
      .trim()
      .isLength({ min: 3 })
      .withMessage("El nombre debe tener al menos 3 caracteres"),
    body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
    body("phone").trim().notEmpty().withMessage("El teléfono es requerido"),
    body("hardSkills")
      .isArray({ min: 1 })
      .withMessage("Debes seleccionar al menos una habilidad técnica"),
    body("softSkills")
      .isArray({ min: 1 })
      .withMessage("Debes seleccionar al menos una habilidad blanda"),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        fullName,
        email,
        phone,
        address,
        city,
        birthDate,
        education,
        experience,
        hardSkills,
        softSkills,
        languages,
        references,
        portfolio,
        linkedin,
        orderId,
      } = req.body;

      // Obtener URL de la foto
      const photoUrl = req.file ? `/uploads/photos/${req.file.filename}` : null;

      // Parsear datos JSON
      const parsedEducation =
        typeof education === "string" ? JSON.parse(education) : education;
      const parsedExperience =
        typeof experience === "string" ? JSON.parse(experience) : experience;
      const parsedLanguages = languages
        ? typeof languages === "string"
          ? JSON.parse(languages)
          : languages
        : null;
      const parsedReferences = references
        ? typeof references === "string"
          ? JSON.parse(references)
          : references
        : null;
      const parsedHardSkills = Array.isArray(hardSkills)
        ? hardSkills
        : [hardSkills];
      const parsedSoftSkills = Array.isArray(softSkills)
        ? softSkills
        : [softSkills];

      // Crear submission
      const submission = await prisma.cVSubmission.create({
        data: {
          userId: req.user.id,
          orderId: orderId || null,
          fullName,
          email,
          phone,
          address,
          city,
          birthDate: birthDate ? new Date(birthDate) : null,
          photoUrl,
          education: parsedEducation,
          experience: parsedExperience,
          hardSkills: parsedHardSkills,
          softSkills: parsedSoftSkills,
          languages: parsedLanguages,
          references: parsedReferences,
          portfolio,
          linkedin,
          status: "PENDING",
        },
      });

      // Si hay orderId, actualizar orden para vincularla
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: "IN_PROGRESS" },
        });
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
