/**
 * Servicio de envío de emails
 * Usa nodemailer para enviar correos electrónicos
 */

const nodemailer = require("nodemailer");

// Crear transporter (configuración de SMTP)
const createTransporter = () => {
  // Verificar si hay configuración SMTP
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("⚠️ SMTP no configurado. Los emails no se enviarán.");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true para 465, false para otros
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Generar código de verificación de 6 dígitos
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Enviar email de verificación con código
 * @param {string} email - Email del destinatario
 * @param {string} code - Código de 6 dígitos
 * @param {string} fullName - Nombre del usuario
 */
const sendVerificationEmail = async (email, code, fullName) => {
  // SIEMPRE mostrar el código en consola para debugging fácil
  console.log(`🔐 CÓDIGO DE VERIFICACIÓN para ${email}: ${code}`);

  const transporter = createTransporter();

  if (!transporter) {
    console.log(`📧 [DEV MODE] Email simulado.`);
    return { success: true, devMode: true };
  }

  const mailOptions = {
    from: `"CV Argentina" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "🔐 Código de Verificación - CV Argentina",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #044bab 0%, #022a61 100%); padding: 30px; text-align: center; }
          .header img { height: 60px; }
          .header h1 { color: white; margin: 15px 0 0; font-size: 20px; }
          .content { padding: 30px; text-align: center; }
          .code-box { background: #f8fafc; border: 2px dashed #044bab; border-radius: 12px; padding: 20px; margin: 25px 0; }
          .code { font-size: 36px; font-weight: bold; color: #044bab; letter-spacing: 8px; }
          .message { color: #666; line-height: 1.6; }
          .warning { background: #fef3c7; border-radius: 8px; padding: 15px; margin-top: 20px; color: #92400e; font-size: 13px; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verificación de Email</h1>
          </div>
          <div class="content">
            <p class="message">Hola <strong>${fullName}</strong>,</p>
            <p class="message">Usa el siguiente código para verificar tu cuenta:</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p class="message">Este código expira en <strong>15 minutos</strong>.</p>
            <div class="warning">
              ⚠️ Si no solicitaste este código, puedes ignorar este email.
            </div>
          </div>
          <div class="footer">
            © 2025 CV Argentina. Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de verificación enviado a ${email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    throw new Error("Error al enviar el email de verificación");
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
};
