import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, text) => {
  try {
    // Configuración del "Cartero"
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,     // Ej: smtp-relay.brevo.com
      port: process.env.SMTP_PORT,     // Ej: 587
      auth: {
        user: process.env.SMTP_USER,   // Tu usuario (email)
        pass: process.env.SMTP_PASS,   // Tu contraseña o clave API
      },
    });

    // Enviar el paquete
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,      // Destinatario
      subject, // Asunto
      text,    // Mensaje
    });
    
    console.log("✅ Email enviado correctamente a", to);
    return true;
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    return false;
  }
};
