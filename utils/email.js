import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 2525, // Usamos el puerto 2525 que suele estar abierto en Render
      secure: false, // Debe ser false para el puerto 2525 o 587
      auth: {
        user: process.env.SMTP_USER, // Tu correo de Brevo
        pass: process.env.SMTP_PASS, // Tu API KEY de Brevo
      },
      tls: {
        rejectUnauthorized: false // Esto evita que la conexión se corte por seguridad
      }
    });

    console.log(`📤 Intentando enviar correo a: ${to}...`);

    await transporter.sendMail({
      from: `"Connectful" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    
    console.log("✅ ¡Correo enviado con éxito!");
    return true;
  } catch (error) {
    console.error("❌ Error real en el envío:", error.message);
    return false;
  }
};
