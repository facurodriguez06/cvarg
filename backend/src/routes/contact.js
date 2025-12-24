const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { body } = require("express-validator");
const { validate } = require("../middleware/validation");

const prisma = new PrismaClient();

/**
 * POST /api/contact
 * Enviar mensaje de contacto
 */
router.post(
  "/",
  [
    body("name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("El nombre debe tener al menos 2 caracteres"),
    body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
    body("message")
      .trim()
      .isLength({ min: 10 })
      .withMessage("El mensaje debe tener al menos 10 caracteres"),
    body("subject").optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      const contactMessage = await prisma.contactMessage.create({
        data: {
          name,
          email,
          subject,
          message,
        },
      });

      // TODO: Enviar email de notificación al admin
      // TODO: Enviar email de confirmación al usuario

      res.status(201).json({
        success: true,
        message: "Mensaje enviado exitosamente. Te contactaremos pronto.",
        messageId: contactMessage.id,
      });
    } catch (error) {
      console.error("Error al enviar mensaje de contacto:", error);
      res.status(500).json({
        success: false,
        error: "Error al enviar mensaje",
      });
    }
  }
);

module.exports = router;
